import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';

interface NextPassage {
  vehicle_ref: string | null;
  line_ref: string | null;
  direction_ref: string;
  destination_name: string | null;
  delay: string;
  stop_point_ref?: string | null;
  stop_point_name: string | null;
  expected_arrival_time: string | null;
  distance_from_stop: number | null;
  published_line_name: string;
  line_destination: string;
  scheduled_arrival_time?: string;
  route_color?: string;
  route_text_color?: string;
}

const extractLineSortCode = (lineRef?: string | null) => {
  if (!lineRef) return null;
  const idx = lineRef.indexOf('::');
  if (idx === -1) return null;
  const rest = lineRef.slice(idx + 2);
  return rest.split(':')[0] || null;
};

const formatTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const normalize = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const extractRefCore = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return null;
  const match = raw.match(/:SP:(\d+):/i);
  if (match?.[1]) return match[1];
  const tailDigits = raw.match(/(?:\.|:)(\d{3,})$/);
  if (tailDigits?.[1]) return tailDigits[1];
  if (/^\d{3,}$/.test(raw)) return raw;
  const parts = raw.split(':').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 2] || parts[parts.length - 1] : null;
};

const isMachineRef = (value?: string | null) =>
  !!value && /^activ:/i.test(value.trim());
const isHumanReadableLabel = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return false;
  if (isMachineRef(raw)) return false;
  if (/^\d{3,}$/.test(raw)) return false;
  return /[a-zA-Z]/.test(raw);
};

const humanizeFromRef = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (!isMachineRef(raw)) return raw;
  const parts = raw.split(':');
  return parts.length >= 2 ? parts[parts.length - 2] || parts[parts.length - 1] : raw;
};

export const useNextPassages = (stopId: string | null, enabled: boolean) => {
  const [data, setData] = useState<NextPassage[]>([]);
  return useNextPassagesFiltered(stopId, enabled, undefined, undefined, undefined, undefined, data, setData);
};

const mapDirection = (direction?: string | null) => {
  const value = normalize(direction);
  if (!value) return null;
  if (value === 'aller' || value === 'a' || value === 'outbound') return 'outbound';
  if (value === 'retour' || value === 'r' || value === 'inbound') return 'inbound';
  return null;
};

export const useNextPassagesByLine = (
  stopId: string | null,
  enabled: boolean,
  lineSortCode?: string,
  lineCode?: string,
  direction?: string,
  destinationName?: string
) => {
  const [data, setData] = useState<NextPassage[]>([]);
  return useNextPassagesFiltered(stopId, enabled, lineSortCode, lineCode, direction, destinationName, data, setData);
};

const useNextPassagesFiltered = (
  stopId: string | null,
  enabled: boolean,
  lineSortCode: string | undefined,
  lineCode: string | undefined,
  direction: string | undefined,
  destinationName: string | undefined,
  data: NextPassage[],
  setData: (value: NextPassage[]) => void
) => {
  const { conn, connected, error } = useSpacetime();
  const targetDirection = mapDirection(direction);
  const targetDestination = normalize(destinationName);
  const normalizeLine = (value?: string | null) =>
    (value || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NAVI/, 'NAV');
  const addCodeAlias = (set: Set<string>, code?: string | null) => {
    const normalized = normalizeLine(code);
    if (!normalized) return;
    set.add(normalized);
    if (normalized.startsWith('NAV')) set.add(normalized.replace(/^NAV/, 'NAVI'));
    if (normalized.startsWith('NAVI')) set.add(normalized.replace(/^NAVI/, 'NAV'));
  };
  const targetLine = normalizeLine(lineSortCode);
  const targetLineCode = normalizeLine(lineCode);

  useEffect(() => {
    if (!enabled || !conn || !connected || !stopId) return;

    const update = () => {
      const stop = Array.from(conn.db.stops.iter() as Iterable<any>).find((s) => s.id === stopId);
      const gtfsStopId = stop?.gtfsStopId || stop?.gtfs_stop_id || null;
      const stopsRows = Array.from(conn.db.stops.iter() as Iterable<any>);
      const stopsById = new Map(
        stopsRows.map((s) => [s.id, s.name || s.id])
      );
      const stopsByCore = new Map<string, string>();
      stopsRows.forEach((s) => {
        const name = (s.name || '').toString().trim();
        if (!name) return;
        const coreFromId = extractRefCore(s.id || '');
        if (coreFromId && !stopsByCore.has(coreFromId)) stopsByCore.set(coreFromId, name);
        const coreFromGtfs = extractRefCore(s.gtfsStopId || '');
        if (coreFromGtfs && !stopsByCore.has(coreFromGtfs)) stopsByCore.set(coreFromGtfs, name);
      });

      const journeys = new Map(
        Array.from(conn.db.estimated_vehicle_journeys_current.iter() as Iterable<any>).map((j) => [j.datedVehicleJourneyRef, j])
      );
      const destinationNamesByRef = new Map<string, string>();
      Array.from(conn.db.vehicle_positions_current.iter() as Iterable<any>).forEach((v) => {
        if (v.destinationRef && v.destinationName) {
          destinationNamesByRef.set(v.destinationRef, v.destinationName);
        }
      });
      const journeyTerminalByRef = new Map<string, { order: number; name: string }>();
      Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>).forEach((c) => {
        if (!c.datedVehicleJourneyRef || !c.stopPointName) return;
        const ref = c.datedVehicleJourneyRef;
        const order = Number(c.stopOrder ?? -1);
        const existing = journeyTerminalByRef.get(ref);
        if (!existing || order > existing.order) {
          journeyTerminalByRef.set(ref, { order, name: c.stopPointName });
        }
      });
      const linesByCode = new Map(
        Array.from(conn.db.lines.iter() as Iterable<any>).map((l) => [normalizeLine(l.lineSortCode), l])
      );
      const lineAliases = new Set<string>();
      addCodeAlias(lineAliases, targetLine);
      addCodeAlias(lineAliases, targetLineCode);
      if (targetLine || targetLineCode) {
        Array.from(conn.db.lines.iter() as Iterable<any>).forEach((l) => {
          const sortCode = normalizeLine(l.lineSortCode);
          const code = normalizeLine(l.lineCode);
          if (targetLine && sortCode === targetLine && code) addCodeAlias(lineAliases, code);
          if (targetLineCode && code === targetLineCode && sortCode) addCodeAlias(lineAliases, sortCode);
        });
      }
      const resolveStopName = (ref?: string | null, label?: string | null) => {
        if (label && isHumanReadableLabel(label)) return label;
        if (ref && stopsById.has(ref)) return stopsById.get(ref) || null;
        const core = extractRefCore(ref || label || '');
        if (core && stopsByCore.has(core)) return stopsByCore.get(core) || null;
        return humanizeFromRef(label) || humanizeFromRef(ref) || null;
      };

      const allCalls = Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>);
      let calls = gtfsStopId
        ? allCalls.filter((c) => c.gtfsStopId === gtfsStopId)
        : [];

      // Primary fallback for stops without GTFS mapping: match by stop_point_ref.
      if (calls.length === 0 && stop?.id) {
        calls = allCalls.filter((c) => (c.stopPointRef || '') === stop.id);
      }

      // Secondary fallback for StopArea/StopPoint mismatches: match on shared SP core id.
      if (calls.length === 0 && stop?.id) {
        const stopCore = extractRefCore(stop.id);
        if (stopCore) {
          calls = allCalls.filter((c) => extractRefCore(c.stopPointRef || null) === stopCore);
        }
      }

      // Fallback when GTFS stop id mapping is missing: match by stop name.
      if (calls.length === 0 && stop?.name) {
        const stopName = normalize(stop.name);
        calls = allCalls.filter((c) => normalize(c.stopPointName || '') === stopName);
      }
      const mapped: NextPassage[] = calls.map((call) => {
        const journey = journeys.get(call.datedVehicleJourneyRef);
        const lineCodeRaw = journey?.lineSortCode || extractLineSortCode(journey?.lineRef || undefined) || '';
        const lineCodeNorm = normalizeLine(lineCodeRaw);
        const line = linesByCode.get(lineCodeNorm);
        const destinationRef = journey?.destinationRef || null;
        const destinationName =
          (destinationRef ? destinationNamesByRef.get(destinationRef) : null) ||
          (journey ? journeyTerminalByRef.get(journey.datedVehicleJourneyRef)?.name : null) ||
          resolveStopName(destinationRef, journey?.destinationName || null);
        const scheduled = formatTime(call.expectedArrivalTime || call.aimedArrivalTime || null);

        return {
          vehicle_ref: null,
          line_ref: journey?.lineRef || null,
          direction_ref: journey?.directionRef || '',
          destination_name: destinationName || journey?.destinationName || line?.destinationName || null,
          delay: 'PT0S',
          stop_point_ref: call.stopPointRef || null,
          stop_point_name: resolveStopName(call.stopPointRef || null, call.stopPointName || null),
          expected_arrival_time: call.expectedArrivalTime || call.aimedArrivalTime || null,
          distance_from_stop: null,
          published_line_name: (line?.lineSortCode || lineCodeRaw || '').toString(),
          line_destination: destinationName || journey?.destinationName || line?.destinationName || '',
          scheduled_arrival_time: scheduled || undefined,
          route_color: line?.color || undefined,
          route_text_color: undefined,
        };
      });

      const lineFiltered = mapped.filter((row) => {
        if (!targetLine && !targetLineCode) return true;
        const rowLine = normalizeLine(row.published_line_name);
        return lineAliases.has(rowLine);
      });
      const destinationFiltered = targetDestination
        ? lineFiltered.filter((row) => {
          const rowDestination = normalize(row.line_destination || row.destination_name || '');
          return rowDestination ? rowDestination.includes(targetDestination) : false;
        })
        : lineFiltered;
      const directionFiltered = targetDirection
        ? destinationFiltered.filter((row) => {
          const rowDirection = mapDirection(row.direction_ref);
          return rowDirection ? rowDirection === targetDirection : false;
        })
        : destinationFiltered;

      const filtered =
        directionFiltered.length > 0
          ? directionFiltered
          : lineFiltered;

      const now = Date.now() - 60_000;
      const horizon = Date.now() + 2 * 60 * 60 * 1000;
      const upcoming = filtered.filter((row) => {
        if (!row.expected_arrival_time) return true;
        const ts = new Date(row.expected_arrival_time).getTime();
        return Number.isFinite(ts) ? ts >= now && ts <= horizon : true;
      });

      upcoming.sort((a, b) => {
        const t1 = a.expected_arrival_time ? new Date(a.expected_arrival_time).getTime() : 0;
        const t2 = b.expected_arrival_time ? new Date(b.expected_arrival_time).getTime() : 0;
        return t1 - t2;
      });

      if (upcoming.length > 0) {
        setData(upcoming.slice(0, 20));
      } else {
        // Keep a degraded fallback when realtime ingestion is stale:
        // show the best matching calls even if they are outside the 2h horizon.
        const fallback = [...filtered].sort((a, b) => {
          const t1 = a.expected_arrival_time ? new Date(a.expected_arrival_time).getTime() : Number.MAX_SAFE_INTEGER;
          const t2 = b.expected_arrival_time ? new Date(b.expected_arrival_time).getTime() : Number.MAX_SAFE_INTEGER;
          return t1 - t2;
        });
        setData(fallback.slice(0, 20));
      }
    };

    update();
    const timer = window.setInterval(update, 6000);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, conn, connected, stopId, targetDirection, targetDestination, targetLine, targetLineCode]);

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
