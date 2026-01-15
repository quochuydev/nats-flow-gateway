import { connect, NatsConnection } from 'nats';
import { config } from './config';

let nc: NatsConnection | null = null;

export const getNats = async (): Promise<NatsConnection> => {
  if (!nc) {
    nc = await connect({ servers: config.nats.url });
  }
  return nc;
};

export const closeNats = async () => {
  if (nc) {
    await nc.drain();
    nc = null;
  }
};
