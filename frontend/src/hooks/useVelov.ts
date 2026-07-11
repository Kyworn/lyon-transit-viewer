import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';

export interface VelovStation {
  number: number;
  name: string;
  address: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  status: string | null;
  availability: string | null;
  bike_stands: number;
  available_bike_stands: number;
  available_bikes: number;
  available_electrical_bikes: number | null;
  available_mechanical_bikes: number | null;
  banking: boolean;
  bonus: boolean;
  last_update: string | null;
}

export const useVelov = (enabled = true) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<VelovStation[]>([]);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from(conn.db.velov_stations.iter() as Iterable<any>);
    setData(
      rows.map((row) => ({
        number: Number(row.number),
        name: row.name,
        address: row.address || null,
        commune: row.commune || null,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status || null,
        availability: row.availability || null,
        bike_stands: Number(row.bikeStands ?? row.bike_stands ?? 0),
        available_bike_stands: Number(row.availableBikeStands ?? row.available_bike_stands ?? 0),
        available_bikes: Number(row.availableBikes ?? row.available_bikes ?? 0),
        available_electrical_bikes:
          row.availableElectricalBikes != null ? Number(row.availableElectricalBikes) : null,
        available_mechanical_bikes:
          row.availableMechanicalBikes != null ? Number(row.availableMechanicalBikes) : null,
        banking: !!row.banking,
        bonus: !!row.bonus,
        last_update: row.lastUpdate || null,
      })),
    );
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      const t = (conn.db as any).velov_stations;
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
    60000,
  );

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
