import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';

export type PricingZone = any;

export const usePricingZones = () => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<PricingZone | null>(null);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from(conn.db.pricing_zones.iter() as Iterable<any>);
    if (rows.length === 0) {
      setData(null);
      return;
    }
    try {
      const parsed = JSON.parse(rows[0].geojson);
      const rawZones = Array.isArray(parsed) ? parsed : parsed?.data || parsed?.pois || [];
      const normalized = rawZones.map((zone: any) => ({
        name: zone.name || zone.libelle || zone.label || 'Zone',
        geojson: zone.geojson || zone.geometry || zone.geom || zone.geoJSON || zone?.geojson?.geometry || zone?.geometry,
      }));
      setData(normalized);
    } catch {
      setData(null);
    }
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      conn.db.pricing_zones.onInsert(handler);
      conn.db.pricing_zones.onDelete(handler);
      conn.db.pricing_zones.onUpdate(handler);
      return () => {
        conn.db.pricing_zones.removeOnInsert(handler);
        conn.db.pricing_zones.removeOnDelete(handler);
        conn.db.pricing_zones.removeOnUpdate(handler);
      };
    },
    [conn],
  );

  useThrottledTableSubscription(
    Boolean(conn && connected),
    update,
    subscribe,
    [conn, connected],
    500,
    30000,
  );

  return {
    data,
    isLoading: !connected,
    error: error ? new Error(error) : null,
  };
};
