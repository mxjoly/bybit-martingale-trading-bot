import { SymbolInfo } from 'bybit-api';
import { decimalFloor, decimalCeil } from './math';
import { getQuantityPrecision } from './symbol';

export function calculatePositionSize(
  baseQuantity: number,
  price: number,
  symbolInfo: SymbolInfo
) {
  const minQuantity = symbolInfo.lot_size_filter.min_trading_qty;
  const quantityPrecisionString = String(getQuantityPrecision(symbolInfo));

  let quantityPrecision = quantityPrecisionString.includes('.')
    ? quantityPrecisionString.split('.')[1].length
    : 0;

  const quantity = baseQuantity / price;

  return quantity > minQuantity
    ? decimalFloor(quantity, quantityPrecision)
    : decimalFloor(minQuantity, quantityPrecision);
}
