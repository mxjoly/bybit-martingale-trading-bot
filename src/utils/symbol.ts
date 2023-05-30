import { SymbolInfo } from 'bybit-api';
import { decimalFloor, decimalCeil } from './math';

export function getQuantityPrecision(symbolInfo: SymbolInfo) {
  console.log(symbolInfo.lot_size_filter);
  return symbolInfo.lot_size_filter.qty_step || 0;
}
