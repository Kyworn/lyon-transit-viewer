import { useEffect, useState } from 'react';
import { connectSpacetime, resetConnection } from './connection';
import type { DbConnection } from './index';

let subscribed = false;

type SpacetimeConnection = DbConnection & {
  db: Record<string, any>;
  procedures: Record<string, any>;
};

// Only subscribe to tables actually used by the frontend (9 of 21).
// Skipped (unused): config, gtfs_agency, gtfs_calendar, gtfs_calendar_dates,
// gtfs_feed_info, gtfs_routes, gtfs_shapes, gtfs_stop_times,
// gtfs_stops, gtfs_transfers, gtfs_trips, stations
const USED_TABLES = new Set([
  'stops',
  'lines',
  'vehicle_positions_current',
  'line_icon_mapping',
  'pricing_zones',
  'estimated_calls_current',
  'estimated_vehicle_journeys_current',
  'stop_ref_name_cache',
  'alerts',
  'ingestion_runs',
  'velov_stations',
  'autopartage_stations',
  'public_toilets',
]);

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
              .onError((_ctx: unknown, err: unknown) => {
                console.error('Subscription error', err);
                if (!active) return;
                setConnected(false);
                setError(String(err));
                subscribed = false;
                resetConnection();
                retryTimer = window.setTimeout(connect, 1500);
              })
              .subscribe(
                Array.from(USED_TABLES).map((t) => `SELECT * FROM ${t}`)
              );
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
