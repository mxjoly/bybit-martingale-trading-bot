import TelegramBot from 'node-telegram-bot-api';
import { getBotStatus, updateBotStatus } from '../db';
import { sendTelegramMessage } from '../telegram';

if (!process.env.TELEGRAM_TOKEN) {
  console.error(
    'You must set up the environment variable TELEGRAM_TOKEN to use the Telegram bot'
  );
  process.exit(1);
}

export const initTelegramBot = () => {
  let bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg, match) => {
    updateBotStatus('active');
    sendTelegramMessage(`▶️ The robot starts`);
  });

  bot.onText(/\/stop/, (msg, match) => {
    updateBotStatus('inactive');
    sendTelegramMessage(`⏹ The robot stops`);
  });

  bot.onText(/\/status/, async (msg, match) => {
    let status = await getBotStatus();
    sendTelegramMessage(`ℹ️ Current status: ${status}`);
  });

  return bot;
};
