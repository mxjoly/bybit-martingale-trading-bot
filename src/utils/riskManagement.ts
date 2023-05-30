import { SymbolInfo } from 'bybit-api';
import { decimalFloor, decimalCeil } from './math';
import { getQuantityPrecision } from './symbol';

export function calculatePositionSize(
  baseQuantity: number,
  price: number,
  symbolInfo: SymbolInfo
) {
  const minQuantity = symbolInfo.lot_size_filter.min_trading_qty;
  const quantityPrecision = getQuantityPrecision(symbolInfo);

  const quantity = baseQuantity / price;

  return quantity > minQuantity
    ? decimalFloor(quantity, quantityPrecision)
    : decimalFloor(minQuantity, quantityPrecision);
}
