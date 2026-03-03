import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';

export type PricingZone = any;

export const usePricingZones = () => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<PricingZone | null>(null);

  useEffect(() => {
    if (!conn || !connected) return;

    const update = () => {
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
    };

    update();
    const timer = window.setInterval(update, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [conn, connected]);

  return {
    data,
    isLoading: !connected,
    error: error ? new Error(error) : null,
  };
};
