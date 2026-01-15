import { NatsConnection } from 'nats';
import { db } from './db.js';
import { getNats } from './nats.js';
import { config } from './config.js';
import { hashPassword, verifyPassword } from './password.js';

export type FlowContext = {
  db: typeof db;
  nats: NatsConnection;
  config: typeof config;
  password: {
    hash: typeof hashPassword;
    verify: typeof verifyPassword;
  };
};

export const createContext = async (): Promise<FlowContext> => ({
  db,
  nats: await getNats(),
  config,
  password: {
    hash: hashPassword,
    verify: verifyPassword,
  },
});
