import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import nodemon from 'nodemon';
import dayjs from 'dayjs';
import { updateBotStatus } from './db';
// import { sendTelegramMessage } from './telegram';

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) =>
  path.resolve(appDirectory, relativePath);

const server = nodemon({ script: `${resolveApp('build')}/index.js` });

server
  .on('start', () => {
    // updateBotStatus('active');
    // sendTelegramMessage('▶️ The robot starts');
    // console.log(
    //   `${chalk.blueBright(
    //     dayjs().format('YYYY-MM-DD HH:mm:ss')
    //   )} : The robot starts`
    // );
  })
  .on('restart', () => {
    // updateBotStatus('active');
    // sendTelegramMessage('🔄 The robot restarts');
    // console.log(
    //   `${chalk.blueBright(
    //     dayjs().format('YYYY-MM-DD HH:mm:ss')
    //   )} : The robot restarts`
    // );
  })
  .on('quit', () => {
    // updateBotStatus('inactive');
    // sendTelegramMessage('⏹ The robot stops');
    // console.log(
    //   `${chalk.blueBright(
    //     dayjs().format('YYYY-MM-DD HH:mm:ss')
    //   )} : The robot stops`
    // );
    // process.exit();
  })
  .on('error', () => {
    // sendTelegramMessage('⚠️ An error occurred on the server');
    // console.error(
    //   `${chalk.blueBright(
    //     dayjs().format('YYYY-MM-DD HH:mm:ss')
    //   )} : An error occurred`
    // );
    // process.exit(1);
  });
