import { useCallback, useEffect, useState, useRef } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';
import { Line } from '../types';

type UseLinesOptions = {
  enabled?: boolean;
  includeTrace?: boolean;
};

export const useLines = (options: UseLinesOptions = {}) => {
  const { enabled = true, includeTrace = false } = options;
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Line[]>([]);
  const fluvialLinesRef = useRef<Line[]>([]);

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
        if (!disposed) {
          fluvialLinesRef.current = mapped;
          // Trigger a re-merge with current SpacetimeDB lines
          setData((prev) => {
            const stdb = prev.filter((l) => !l.id.startsWith('fluvial.'));
            const merged = [...stdb, ...mapped];
            const byId = new Map<string, Line>();
            merged.forEach((line) => byId.set(line.id, line));
            return Array.from(byId.values());
          });
        }
      } catch (e) {
        // silent
      } finally {
        if (!disposed) timer = window.setTimeout(loadFluvial, 30 * 60 * 1000);
      }
    };

    loadFluvial();
    return () => {
      disposed = true;
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, includeTrace]);

  const updateData = useCallback(() => {
    if (!conn) return;
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

    const merged = [...mapped, ...fluvialLinesRef.current];
    const byId = new Map<string, Line>();
    merged.forEach((line) => byId.set(line.id, line));
    setData(Array.from(byId.values()));
  }, [conn, includeTrace]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      conn.db.lines.onInsert(handler);
      conn.db.lines.onDelete(handler);
      conn.db.lines.onUpdate(handler);
      return () => {
        conn.db.lines.removeOnInsert(handler);
        conn.db.lines.removeOnDelete(handler);
        conn.db.lines.removeOnUpdate(handler);
      };
    },
    [conn],
  );

  useThrottledTableSubscription(
    Boolean(enabled && conn && connected),
    updateData,
    subscribe,
    [conn, connected, includeTrace],
    500,
    60000,
  );

  return {
    data,
    isLoading: enabled && !connected && data.length === 0,
    error: error ? new Error(error) : null,
  };
};
