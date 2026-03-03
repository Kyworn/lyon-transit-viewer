// @ts-nocheck
import { useEffect, useState } from 'react';
import { connectSpacetime, resetConnection } from './connection';
import type { DbConnection } from './index';

let subscribed = false;

type SpacetimeConnection = DbConnection & {
  db: Record<string, any>;
  procedures: Record<string, any>;
};

export const useSpacetime = () => {
  const [conn, setConn] = useState<SpacetimeConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: number | null = null;

    const connect = () => {
      connectSpacetime()
        .then((db) => {
          if (!active) return;
          setConn(db as SpacetimeConnection);
          setConnected(true);
          setError(null);

          if (!subscribed) {
            subscribed = true;
            db.subscriptionBuilder()
              .onApplied(() => {
                // Subscription applied
              })
              .onError((_ctx, err) => {
                console.error('Subscription error', err);
                if (!active) return;
                setConnected(false);
                setError(String(err));
                subscribed = false;
                resetConnection();
                retryTimer = window.setTimeout(connect, 1500);
              })
              .subscribeToAllTables();
          }
        })
        .catch((err) => {
          if (!active) return;
          setConnected(false);
          setError(String(err));
          retryTimer = window.setTimeout(connect, 1500);
        });
    };

    connect();

    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  return { conn, connected, error };
};
