// Initialize environment variables
require('dotenv').config();

import { initTelegramBot } from './initTelegramBot';
import { initializeDayJsPlugins } from './initDayJsPlugins';
import { initLogger } from './initLogger';
import { initBotConfig } from './initConfig';
import { initDatabase } from './initDatabase';
import { initBybitClient } from './initClient';
import { initCommandArguments } from './initCommandArguments';

initializeDayJsPlugins();

export const CommandArguments = initCommandArguments();
export const Logger = initLogger();
export const TelegramBot = initTelegramBot();
export const Database = initDatabase();
export const BotConfig = initBotConfig() as BotConfig;
export const BybitClient = initBybitClient(process.env.NODE_ENV as any);
