import { Database } from './init';

export const updateBotStatus = (newStatus: BotStatus) => {
  Database.push('/bot/status', newStatus);
};

export const getBotStatus = (): Promise<BotStatus> => {
  return Database.getData('/bot/status');
};
