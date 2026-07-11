import { useEffect, useState } from 'react';
import { connectSpacetime, resetConnection } from './connection';
import type { DbConnection } from './index';

let subscribed = false;

type SpacetimeConnection = DbConnection & {
  db: Record<string, any>;
  procedures: Record<string, any>;
};

// Two-phase subscription to speed up first paint.
// CRITICAL streams first: everything the map needs to render its default view
// (stops, line traces, pricing zones, icons, live vehicles, alerts).
const CRITICAL_TABLES = [
  'stops',
  'lines',
  'pricing_zones',
  'line_icon_mapping',
  'vehicle_positions_current',
  'alerts',
];
// DEFERRED streams once CRITICAL is applied: off-by-default layers (velov,
// autopartage, toilets) and on-demand detail data (calls/journeys/name cache,
// ingestion runs). Their hooks are `enabled`-gated so late arrival is fine.
const DEFERRED_TABLES = [
  'estimated_calls_current',
  'estimated_vehicle_journeys_current',
  'stop_ref_name_cache',
  'ingestion_runs',
  'velov_stations',
  'autopartage_stations',
  'public_toilets',
];

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
                // Critical data applied — now stream the deferred tables so
                // they don't delay the first render.
                db.subscriptionBuilder()
                  .onError((_ctx: unknown, err: unknown) => {
                    console.error('Deferred subscription error', err);
                  })
                  .subscribe(DEFERRED_TABLES.map((t) => `SELECT * FROM ${t}`));
              })
              .onError((_ctx: unknown, err: unknown) => {
                console.error('Subscription error', err);
                if (!active) return;
                setConnected(false);
                setError(String(err));
                subscribed = false;
                resetConnection();
                retryTimer = window.setTimeout(connect, 1500);
              })
              .subscribe([
                ...CRITICAL_TABLES.map((t) => `SELECT * FROM ${t}`),
                // Rail line geometry only (~1MB). Bus traces (the bulk, ~500MB)
                // are never bulk-subscribed — fetched on-demand by id when a
                // bus line is selected. is_rail is a plain bool so it filters.
                'SELECT * FROM line_traces WHERE is_rail = true',
              ]);
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
