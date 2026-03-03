import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { Vehicle } from '../types';

const extractLineSortCode = (lineRef?: string | null) => {
  if (!lineRef) return null;
  const idx = lineRef.indexOf('::');
  if (idx === -1) return null;
  const rest = lineRef.slice(idx + 2);
  return rest.split(':')[0] || null;
};

const mapDirection = (direction?: string) => {
  const value = (direction || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'aller' || value === 'a' || value === 'outbound') return 'outbound';
  if (value === 'retour' || value === 'r' || value === 'inbound') return 'inbound';
  return null;
};

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
const normalizeCode = (value?: string | null) =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^NAVI/, 'NAV');
const addCodeAlias = (set: Set<string>, code?: string | null) => {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  set.add(normalized);
  if (normalized.startsWith('NAV')) set.add(normalized.replace(/^NAV/, 'NAVI'));
  if (normalized.startsWith('NAVI')) set.add(normalized.replace(/^NAVI/, 'NAV'));
};
const normalizeDirectionRef = (value?: string | null) => {
  const v = normalize(value);
  if (v === 'outbound' || v === 'a' || v === 'aller') return 'outbound';
  if (v === 'inbound' || v === 'r' || v === 'retour') return 'inbound';
  return v;
};
const isInLyonBounds = (lat: number, lon: number) => lon >= 4.2 && lon <= 5.3 && lat >= 45.2 && lat <= 46.2;
const MAX_STALE_MS = 5 * 60 * 1000;

export const useVehicles = (
  lineSortCode?: string,
  lineCode?: string,
  direction?: string,
  enabled = true,
  destinationName?: string
) => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Vehicle[]>([]);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const targetDirection = useMemo(() => mapDirection(direction), [direction]);
  const targetDestination = useMemo(() => normalize(destinationName), [destinationName]);

  useEffect(() => {
    if (!enabled || !conn || !connected) return;

    const getPollInterval = () => {
      if (document.hidden) return 10_000;
      const focused = Boolean(lineSortCode || targetDirection || targetDestination);
      return focused ? 1_000 : 3_000;
    };

    const update = () => {
      const rows = Array.from(conn.db.vehicle_positions_current.iter() as Iterable<any>);
      const lineAliases = new Set<string>();
      const targetSort = normalizeCode(lineSortCode);
      const targetLineCode = normalizeCode(lineCode);
      addCodeAlias(lineAliases, targetSort);
      addCodeAlias(lineAliases, targetLineCode);
      if (targetSort || targetLineCode) {
        Array.from(conn.db.lines.iter() as Iterable<any>).forEach((l) => {
          const sortCode = normalizeCode(l.lineSortCode);
          const code = normalizeCode(l.lineCode);
          if (targetSort && sortCode === targetSort && code) addCodeAlias(lineAliases, code);
          if (targetLineCode && code === targetLineCode && sortCode) addCodeAlias(lineAliases, sortCode);
        });
      }
      const journeyTerminalByRef = new Map<string, { order: number; name: string }>();
      const calls = Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>);
      for (const call of calls) {
        const ref = call.datedVehicleJourneyRef;
        if (!ref) continue;
        const name = call.stopPointName || '';
        if (!normalize(name)) continue;
        const order = Number(call.stopOrder ?? -1);
        const existing = journeyTerminalByRef.get(ref);
        if (!existing || order > existing.order) {
          journeyTerminalByRef.set(ref, { order, name });
        }
      }

      const byLine = rows.filter((row) => {
        if (!lineSortCode && !lineCode) return true;
        const code = normalizeCode(extractLineSortCode(row.lineRef || undefined));
        const publicCode = normalizeCode(row.publishedLineName || '');
        return lineAliases.has(code) || lineAliases.has(publicCode);
      });

      const strict = byLine.filter((row) => {
        const rowDirection = normalizeDirectionRef(row.directionRef);
        if (targetDestination) {
          const rowDestination = normalize(row.destinationName);
          const journeyDestination = normalize(
            row.datedVehicleJourneyRef ? journeyTerminalByRef.get(row.datedVehicleJourneyRef)?.name || '' : ''
          );
          const destinationMatched =
            (rowDestination && (rowDestination.includes(targetDestination) || targetDestination.includes(rowDestination))) ||
            (journeyDestination && (journeyDestination.includes(targetDestination) || targetDestination.includes(journeyDestination)));
          if (destinationMatched) return true;
          if (targetDirection && rowDirection) return rowDirection === targetDirection;
          return false;
        }
        if (targetDirection) {
          return rowDirection === targetDirection;
        }
        return true;
      });

      // Never return an empty set when vehicles exist for the selected line.
      // Direction/destination are preference filters, but line visibility must stay reliable.
      const filtered = strict.length > 0 ? strict : byLine;

      const mapped: Vehicle[] = filtered.map((row) => {
        const lat = typeof row.latitude === 'number' ? row.latitude : null;
        const lon = typeof row.longitude === 'number' ? row.longitude : null;
        if (lat == null || lon == null) return null;
        if (!isInLyonBounds(lat, lon)) return null;

        const micros = Number(row.recordedAtTime?.microsSinceUnixEpoch ?? 0);
        if (Number.isFinite(micros) && micros > 0) {
          const recordedMs = micros / 1000;
          if (Date.now() - recordedMs > MAX_STALE_MS) return null;
        }

        return {
          vehicle_ref: row.vehicleRef,
          longitude: lon,
          latitude: lat,
          bearing: row.bearing ?? 0,
          delay: row.delay || 'PT0S',
          published_line_name: row.publishedLineName || extractLineSortCode(row.lineRef || undefined) || '',
          destination_name: row.destinationName || '',
          line_ref: row.lineRef || '',
          dated_vehicle_journey_ref: row.datedVehicleJourneyRef || undefined,
          direction_ref: row.directionRef || undefined,
          stop_point_ref: row.stopPointRef || undefined,
          stop_point_name: row.stopPointName || undefined,
          expected_arrival_time: row.expectedArrivalTime || undefined,
          distance_from_stop: row.distanceFromStop ?? undefined,
        } as Vehicle;
      }).filter((v): v is Vehicle => Boolean(v));

      setData(mapped);
    };

    update();
    let cancelled = false;
    let timer: number | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        update();
        schedule();
      }, getPollInterval());
    };

    const onVisibilityChange = () => {
      if (cancelled) return;
      if (timer != null) window.clearTimeout(timer);
      update();
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, conn, connected, lineSortCode, lineCode, targetDirection, targetDestination, refreshIndex]);

  const refetch = useCallback(() => {
    setRefreshIndex((value) => value + 1);
  }, []);

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
    refetch,
  };
};
