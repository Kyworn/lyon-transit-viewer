import { DbConnection } from './index';

// Timing instrumentation: [load +Xms] labels. Silent unless URL has ?debug.
const LOAD_T0 = performance.now();
const DEBUG = typeof location !== 'undefined' && location.search.includes('debug');
export const plog = (label: string) => {
  if (DEBUG) console.log(`[load +${Math.round(performance.now() - LOAD_T0)}ms] ${label}`);
};

let connection: DbConnection | null = null;
let connecting: Promise<DbConnection> | null = null;

const getConfig = () => {
  const uri = import.meta.env.REACT_APP_SPACETIMEDB_URI || 'http://127.0.0.1:3000';
  const dbName = import.meta.env.REACT_APP_SPACETIMEDB_DB || 'lyon-transit';
  return { uri, dbName };
};

export const connectSpacetime = (): Promise<DbConnection> => {
  if (connection) return Promise.resolve(connection);
  if (connecting) return connecting;

  const { uri, dbName } = getConfig();
  plog(`connecting to ${uri}/${dbName}`);

  connecting = new Promise((resolve, reject) => {
    (DbConnection.builder() as any)
      .withUri(uri)
      .withDatabaseName(dbName)
      .onConnect((ctx: DbConnection) => {
        plog('WS connected');
        connection = ctx as DbConnection;
        connecting = null;
        resolve(connection);
      })
      .onConnectError((_ctx: unknown, err: unknown) => {
        connecting = null;
        reject(err);
      })
      .build();
  });

  return connecting;
};

export const getConnection = (): DbConnection | null => connection;
export const resetConnection = () => {
  connection = null;
  connecting = null;
};
