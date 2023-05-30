import { JsonDB, Config } from 'node-json-db';

export const initDatabase = () => {
  return new JsonDB(new Config('db', true, true));
};
