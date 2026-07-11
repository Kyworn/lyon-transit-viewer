import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';

export interface AutopartageStation {
  id_station: string;
  name: string;
  address: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  nb_emplacements: number;
  type_autopartage: string | null;
  last_update: string | null;
}

export const useAutopartage = (enabled = true) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<AutopartageStation[]>([]);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from(conn.db.autopartage_stations.iter() as Iterable<any>);
    setData(
      rows.map((row) => ({
        id_station: row.idStation ?? row.id_station,
        name: row.name,
        address: row.address || null,
        commune: row.commune || null,
        latitude: row.latitude,
        longitude: row.longitude,
        nb_emplacements: Number(row.nbEmplacements ?? row.nb_emplacements ?? 0),
        type_autopartage: row.typeAutopartage || row.type_autopartage || null,
        last_update: row.lastUpdate || null,
      })),
    );
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      const t = (conn.db as any).autopartage_stations;
      t.onInsert(handler);
      t.onDelete(handler);
      t.onUpdate(handler);
      return () => {
        t.removeOnInsert(handler);
        t.removeOnDelete(handler);
        t.removeOnUpdate(handler);
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
    300000,
  );

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
