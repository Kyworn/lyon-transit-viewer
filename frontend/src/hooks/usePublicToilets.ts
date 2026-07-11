import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';

export interface PublicToilet {
  id: number;
  address: string | null;
  commune_insee: string | null;
  info_location: string | null;
  provenance: string | null;
  latitude: number;
  longitude: number;
}

export const usePublicToilets = (enabled = true) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<PublicToilet[]>([]);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from((conn.db as any).public_toilets.iter() as Iterable<any>);
    setData(
      rows.map((row) => ({
        id: Number(row.id),
        address: row.address || null,
        commune_insee: row.communeInsee || row.commune_insee || null,
        info_location: row.infoLocation || row.info_location || null,
        provenance: row.provenance || null,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
    );
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      const t = (conn.db as any).public_toilets;
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
    24 * 60 * 60 * 1000,
  );

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
