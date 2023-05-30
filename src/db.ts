import { Database } from './init';

export const updateBotStatus = (newStatus: BotStatus) => {
  Database.push('/bot/status', newStatus);
};

export const getBotStatus = (): Promise<BotStatus> => {
  return Database.getData('/bot/status');
};

export const addLevel = (
  symbol: string,
  price: number,
  type: 'low' | 'high'
) => {};

export const deleteLevel = (symbol: string, price: number) => {};

export const clearLevels = (symbol: string) => {};

export const viewLevels = (symbol: string) => {};
