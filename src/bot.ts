import { LinearClient, SymbolInfo, WebsocketClient } from 'bybit-api';
import dayjs from 'dayjs';
import { intervalToMinutes } from './utils/interval';
import { calculatePositionSize } from './utils/riskManagement';
import { getWsConfig, getWsLogger } from './ws';
import { updateBotStatus } from './db';
import { sendTelegramMessage } from './telegram';
import { decimalCeil, decimalFloor } from './utils/math';
import { getPricePrecision } from './utils/symbol';

class Bot {
  private client: LinearClient;
  private symbolInfos: { [symbol: string]: SymbolInfo };
  private candleSockets: { [symbol: string]: WebsocketClient }; // candle sockets
  private orderSocket: WebsocketClient;
  private config: BotConfig;

  constructor(client: LinearClient, config: BotConfig) {
    this.client = client;
    this.config = config;
    this.candleSockets = {};
    this.symbolInfos = {};
  }

  public async prepare() {
    this.config.strategies.forEach(({ asset, base, leverage }) => {
      const symbol = asset + base;
      this.client.setPositionMode({ symbol, mode: 'BothSide' });
      this.client.setPositionTpSlMode({ symbol, tp_sl_mode: 'Full' });
      this.client.setMarginSwitch({
        symbol,
        is_isolated: false,
        buy_leverage: leverage,
        sell_leverage: leverage,
      });
    });

    const allInfos = await this.client.getSymbols();
    this.config.strategies.forEach(({ asset, base }) => {
      const symbol = asset + base;
      this.symbolInfos[symbol] = allInfos.result.find(
        (info) => info.name === symbol
      );
    });

    this.config.strategies.forEach(({ asset, base, interval }) => {
      const symbol = asset + base;

      const ws = new WebsocketClient(
        getWsConfig(process.env.NODE_ENV as any),
        getWsLogger()
      );

      // and/or subscribe to individual topics on demand
      ws.subscribe(`candle.${interval}.${symbol}`);

      ws.on('open', ({ wsKey, event }) => {
        console.log(`Connection open with ${symbol}`);
      });

      ws.on('close', () => {
        console.log(`Connection closed with ${symbol}`);
      });

      ws.on('error', (err) => {
        console.error(err);
      });

      this.candleSockets[symbol] = ws;
    });

    this.orderSocket = new WebsocketClient(
      getWsConfig(process.env.NODE_ENV as any),
      getWsLogger()
    );

    this.orderSocket.subscribe('execution');

    this.orderSocket.on('open', ({ wsKey, event }) => {
      console.log(`Connection open with order`);
    });

    this.orderSocket.on('close', () => {
      console.log(`Connection closed with order`);
    });

    this.orderSocket.on('error', (err) => {
      console.error(err);
    });
  }

  public async run() {
    updateBotStatus('active');
    sendTelegramMessage('▶️ The robot starts');

    Object.entries(this.candleSockets).forEach(([symbol, socket]) => {
      socket.on('update', (data) => {
        const candle = data.data[0] as WebsocketCandle; // 0: previous confirm candle, 1: current candle

        if (/^candle.[0-9DWM]+.[A-Z]+USDT$/g.test(data.topic)) {
          this.onCandleChange(symbol, candle);
        }
      });
    });

    this.orderSocket.on('update', (data) => {
      const order = data.data;
      this.onExecutionOrder(order);
    });
  }

  public stop() {
    updateBotStatus('inactive');
    sendTelegramMessage('⏹ The robot stops');

    Object.entries(this.candleSockets).forEach(([symbol, socket]) => {
      const strategy = this.config.strategies.find(
        (s) => s.asset + s.base === symbol
      );
      socket.unsubscribe(`candle.${strategy.interval}.${symbol}`);
    });
    this.orderSocket.unsubscribe('order');
  }

  private async loadCandles(symbol: string, interval: Interval) {
    const minutes = intervalToMinutes(interval);
    const limit = 200; // api limit
    const data = await this.client.getKline({
      symbol,
      interval,
      from: Math.round(
        dayjs()
          .subtract(minutes * limit, 'minutes')
          .valueOf() / 1000
      ),
      limit,
    });
    const candles: Candle[] = data.result.slice(0, data.result.length);
    return candles;
  }

  private async onCandleChange(symbol: string, lastCandle: WebsocketCandle) {
    const strategy = this.config.strategies.find(
      (s) => s.asset + s.base === symbol
    );

    const bothSidePosition = await this.client.getPosition({
      symbol,
    }); // 0: Buy side 1: Sell side

    const candles = await this.loadCandles(symbol, strategy.interval);
    const balance = (await this.client.getWalletBalance()).result[
      strategy.base
    ];

    const position = bothSidePosition.result[0];
    const hasPosition = position.position_margin > 0;

    const activeOrders = await this.client.queryActiveOrder({ symbol });
    const hasActiveOrders =
      activeOrders.result.filter((order) => order.symbol == symbol).length > 0;

    // ===================== Strategy ===================== //
    const long = true;
    // ======================================================== //

    if (long && !hasPosition && !hasActiveOrders) {
      const initialMargin = balance.wallet_balance * strategy.initial_margin;
      const quantity = calculatePositionSize(
        initialMargin,
        lastCandle.close,
        this.symbolInfos[symbol]
      );

      this.client.placeActiveOrder({
        symbol,
        order_type: 'Limit',
        qty: quantity,
        side: 'Buy',
        price: lastCandle.close,
        close_on_trigger: false,
        reduce_only: false,
        time_in_force: 'PostOnly',
      });
    }

    // Check the drawdown of position
    if (hasPosition) {
      const isCritical =
        position.unrealised_pnl <=
        -balance.wallet_balance * strategy.max_drawdown;

      if (isCritical) {
        this.client.placeActiveOrder({
          symbol,
          order_type: 'Market',
          qty: position.size,
          side: 'Sell',
          close_on_trigger: false,
          reduce_only: true,
          time_in_force: 'GoodTillCancel',
        });
      }
    }
  }

  private async onExecutionOrder(order: WebsocketOrder[]) {
    const symbol = order[0].symbol;
    const strategy = this.config.strategies.find(
      (s) => s.asset + s.base === symbol
    );

    const balance = (await this.client.getWalletBalance()).result[
      strategy.base
    ];

    const positions = await this.client.getPosition({ symbol });
    const position = positions.result[0]; // 0: buy side 1: Sell side

    // Cancel the previous orders
    this.client.cancelAllActiveOrders({ symbol }).then(() => {
      if (position.size > 0) {
        const tp = decimalFloor(
          position.entry_price * (1 + strategy.profit_target),
          getPricePrecision(this.symbolInfos[symbol])
        );
        const rebuy = decimalCeil(
          position.entry_price * (1 - strategy.rebuy_level),
          getPricePrecision(this.symbolInfos[symbol])
        );

        this.client.placeActiveOrder({
          symbol,
          order_type: 'Limit',
          qty: position.size,
          side: 'Sell',
          price: tp,
          close_on_trigger: false,
          reduce_only: true,
          time_in_force: 'PostOnly',
        });

        if (
          position.position_value <
          balance.wallet_balance * strategy.max_margin
        ) {
          this.client.placeActiveOrder({
            symbol,
            order_type: 'Limit',
            qty: position.size,
            side: 'Buy',
            price: rebuy,
            close_on_trigger: false,
            reduce_only: false,
            time_in_force: 'PostOnly',
          });
        }
      }
    });
  }
}

export default Bot;
