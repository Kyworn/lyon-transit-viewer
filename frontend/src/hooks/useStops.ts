import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';
import { Stop } from '../types';

export const useStops = (enabled: boolean) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Stop[]>([]);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from(conn.db.stops.iter() as Iterable<any>);
    const mapped: Stop[] = rows.map((row) => ({
      id: row.id,
      name: row.name || '',
      longitude: row.longitude ?? 0,
      latitude: row.latitude ?? 0,
      pmr_accessible: row.pmrAccessible ?? false,
      service_info: row.serviceInfo || '',
      has_elevator: row.hasElevator ?? false,
      has_escalator: row.hasEscalator ?? false,
      address: row.address || '',
      municipality: row.municipality || '',
      zone: row.zone || '',
      gtfs_stop_id: row.gtfsStopId || undefined,
    }));
    setData(mapped);
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      conn.db.stops.onInsert(handler);
      conn.db.stops.onDelete(handler);
      conn.db.stops.onUpdate(handler);
      return () => {
        conn.db.stops.removeOnInsert(handler);
        conn.db.stops.removeOnDelete(handler);
        conn.db.stops.removeOnUpdate(handler);
      };
    },
    [conn],
  );

  useThrottledTableSubscription(
    Boolean(enabled && conn && connected),
    update,
    subscribe,
    [conn, connected],
    500,
    5 * 60 * 1000, // 5 min backup
  );

  return {
    data,
    isLoading: enabled && !connected && data.length === 0,
    error: error ? new Error(error) : null,
  };
};
