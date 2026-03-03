import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { Stop } from '../types';

export const useStops = (enabled: boolean) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Stop[]>([]);

  useEffect(() => {
    if (!enabled || !conn || !connected) return;
    let timer: number | null = null;
    let disposed = false;

    const update = () => {
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

      if (disposed) return;
      const nextDelay = mapped.length === 0 ? 250 : 6000;
      timer = window.setTimeout(update, nextDelay);
    };

    update();

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, conn, connected]);

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
