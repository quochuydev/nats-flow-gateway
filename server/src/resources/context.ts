import { NatsConnection } from 'nats';
import { db } from './db';
import { getNats } from './nats';
import { config } from './config';
import { hashPassword, verifyPassword } from './password';

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
