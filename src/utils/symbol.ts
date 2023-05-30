import { SymbolInfo } from 'bybit-api';

export function getPricePrecision(symbolInfo: SymbolInfo) {
  return symbolInfo.price_filter.tick_size.includes('.')
    ? symbolInfo.price_filter.tick_size.split('.')[1].length
    : 0;
}

export function getQuantityPrecision(symbolInfo: SymbolInfo) {
  return symbolInfo.lot_size_filter.qty_step || 0;
}
