import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { Line } from '../types';

type UseLinesOptions = {
  enabled?: boolean;
  includeTrace?: boolean;
};

export const useLines = (options: UseLinesOptions = {}) => {
  const { enabled = true, includeTrace = false } = options;
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Line[]>([]);
  const [fluvialLines, setFluvialLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: number | null = null;
    const controller = new AbortController();

    const loadFluvial = async () => {
      try {
        const response = await fetch(
          'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignefluv&outputFormat=application/json&SRSNAME=EPSG:4171',
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Fluvial lines HTTP ${response.status}`);
        const json = await response.json();
        const features = Array.isArray(json?.features) ? json.features : [];
        const mapped: Line[] = features.map((f: any) => ({
          id: `fluvial.${f?.properties?.code_trace || f?.properties?.gid || Math.random()}`,
          line_name: f?.properties?.nom_trace || 'NAVIGONE',
          trace_code: includeTrace ? JSON.stringify(f?.geometry || null) : '',
          line_code: f?.properties?.code_ligne || 'NF1',
          category: 'fluvial',
          color: f?.properties?.couleur_hex || '#00a3a6',
          line_sort_code: f?.properties?.ligne || 'NAV1',
          destination_name: f?.properties?.nom_destination || '',
          direction: f?.properties?.sens || '',
          line_type_name: f?.properties?.nom_type_ligne || 'Régulière',
        }));
        if (!disposed) setFluvialLines(mapped);
      } catch (e) {
        if (!disposed && (e as Error).name !== 'AbortError') {
          // silent fallback: keep realtime/static lines only
        }
      } finally {
        if (!disposed) timer = window.setTimeout(loadFluvial, 15 * 60 * 1000);
      }
    };

    loadFluvial();
    return () => {
      disposed = true;
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, includeTrace]);

  useEffect(() => {
    if (!enabled || !conn || !connected) return;
    let timer: number | null = null;
    let disposed = false;

    const update = () => {
      const rows = Array.from(conn.db.lines.iter() as Iterable<any>);
      const mapped: Line[] = rows.map((row) => ({
        id: row.id,
        line_name: row.lineName || '',
        trace_code: includeTrace ? (row.traceCode || '') : '',
        line_code: row.lineCode || '',
        category: row.category || '',
        color: row.color || '',
        line_sort_code: row.lineSortCode || '',
        destination_name: row.destinationName || '',
        direction: row.direction || '',
        line_type_name: row.lineTypeName || '',
      }));
      const merged = [...mapped, ...fluvialLines];
      const byId = new Map<string, Line>();
      merged.forEach((line) => byId.set(line.id, line));
      setData(Array.from(byId.values()));

      if (disposed) return;
      const nextDelay = mapped.length === 0 ? 250 : 5000;
      timer = window.setTimeout(update, nextDelay);
    };

    update();

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, conn, connected, includeTrace, fluvialLines]);

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
