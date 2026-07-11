import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';

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
  is_monitored?: boolean;
}

const extractLineSortCode = (lineRef?: string | null) => {
  if (!lineRef) return null;
  const idx = lineRef.indexOf('::');
  if (idx === -1) return null;
  const rest = lineRef.slice(idx + 2);
  return rest.split(':')[0] || null;
};

const extractLineCodeFromJourneyRef = (ref?: string | null): string | null => {
  if (!ref) return null;
  let clean = ref;
  const idx = ref.indexOf('::');
  if (idx !== -1) {
    clean = ref.slice(idx + 2);
  }
  const locIdx = clean.indexOf(':LOC');
  if (locIdx !== -1) {
    clean = clean.slice(0, locIdx);
  }
  const parts = clean.split('_');
  if (parts.length >= 2) {
    const candidate = parts[1];
    const dashIdx = candidate.indexOf('-');
    return dashIdx !== -1 ? candidate.slice(0, dashIdx) : candidate;
  }
  return null;
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

  const update = useCallback(() => {
    if (!conn || !stopId) return;
    {
      const stopsRows = Array.from(conn.db.stops.iter() as Iterable<any>);
      const stop = stopsRows.find((s) => s.id === stopId);
      const gtfsStopId = stop?.gtfsStopId || stop?.gtfs_stop_id || null;
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

      const allCalls = Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>);
      const journeyTerminalByRef = new Map<string, { order: number; name: string }>();
      allCalls.forEach((c) => {
        if (!c.datedVehicleJourneyRef || !c.stopPointName) return;
        const ref = c.datedVehicleJourneyRef;
        const order = Number(c.stopOrder ?? -1);
        const existing = journeyTerminalByRef.get(ref);
        if (!existing || order > existing.order) {
          journeyTerminalByRef.set(ref, { order, name: c.stopPointName });
        }
      });

      const linesRows = Array.from(conn.db.lines.iter() as Iterable<any>);
      const linesByCode = new Map<string, any>();
      linesRows.forEach((l) => {
        const sortCodeNorm = normalizeLine(l.lineSortCode);
        const codeNorm = normalizeLine(l.lineCode);
        if (sortCodeNorm) linesByCode.set(sortCodeNorm, l);
        if (codeNorm) linesByCode.set(codeNorm, l);
      });
      const lineAliases = new Set<string>();
      addCodeAlias(lineAliases, targetLine);
      addCodeAlias(lineAliases, targetLineCode);
      if (targetLine || targetLineCode) {
        linesRows.forEach((l) => {
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

      const targetStopName = stop?.name ? normalize(stop.name) : null;
      const matchingStops = targetStopName
        ? stopsRows.filter((s) => normalize(s.name) === targetStopName)
        : [stop].filter(Boolean);

      const gtfsStopIds = new Set<string>();
      const stopIds = new Set<string>();
      const stopCores = new Set<string>();

      matchingStops.forEach((s) => {
        const gId = s.gtfsStopId || s.gtfs_stop_id;
        if (gId) gtfsStopIds.add(gId);
        if (s.id) {
          stopIds.add(s.id);
          const core = extractRefCore(s.id);
          if (core) stopCores.add(core);
        }
      });

      // SIRI SP IDs ≠ TCL gtfs_stop_ids — different namespaces.
      // Build name→SP ref mapping from stop_ref_name_cache (persistent across vehicles) and
      // vehicle_positions_current (real-time supplement for newly-seen stops).
      if (targetStopName) {
        Array.from((conn.db as any).stop_ref_name_cache.iter() as Iterable<any>).forEach((entry) => {
          const eName = entry.stopName ? normalize(entry.stopName) : null;
          if (eName && eName === targetStopName && entry.stopRef) {
            stopIds.add(entry.stopRef);
            const core = extractRefCore(entry.stopRef);
            if (core) stopCores.add(core);
          }
        });
        Array.from(conn.db.vehicle_positions_current.iter() as Iterable<any>).forEach((v) => {
          const vName = v.stopPointName ? normalize(v.stopPointName) : null;
          if (vName && vName === targetStopName && v.stopPointRef) {
            stopIds.add(v.stopPointRef);
            const core = extractRefCore(v.stopPointRef);
            if (core) stopCores.add(core);
          }
        });
      }

      let calls = allCalls.filter((c) => {
        if (c.gtfsStopId && gtfsStopIds.has(c.gtfsStopId)) return true;
        if (c.stopPointRef && stopIds.has(c.stopPointRef)) return true;
        const callCore = extractRefCore(c.stopPointRef || null);
        if (callCore && stopCores.has(callCore)) return true;
        return false;
      });
      const mapped: NextPassage[] = calls.map((call): NextPassage => {
        const journey = journeys.get(call.datedVehicleJourneyRef);
        const lineCodeRaw = journey?.lineSortCode || 
                            extractLineSortCode(journey?.lineRef || undefined) || 
                            extractLineCodeFromJourneyRef(call.datedVehicleJourneyRef) || 
                            '';
        const lineCodeNorm = normalizeLine(lineCodeRaw);
        const line = linesByCode.get(lineCodeNorm);
        const destinationRef = journey?.destinationRef || null;
        const destinationName =
          (destinationRef ? destinationNamesByRef.get(destinationRef) : null) ||
          (journey ? journeyTerminalByRef.get(journey.datedVehicleJourneyRef)?.name : null) ||
          resolveStopName(destinationRef, journey?.destinationName || null);
        const scheduled = formatTime(call.expectedArrivalTime || call.aimedArrivalTime || null);
        const isMonitored = !!(call.callId && call.callId.includes('monitored'));

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
          is_monitored: isMonitored,
        };
      }).filter((row) => {
        if (!row.expected_arrival_time) return true;
        const ts = new Date(row.expected_arrival_time).getTime();
        if (Number.isFinite(ts)) {
          const cutoff = row.is_monitored ? 10 * 60 * 1000 : 60_000;
          return ts >= (Date.now() - cutoff);
        }
        return true;
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

      const now = Date.now();
      const horizon = Date.now() + 2 * 60 * 60 * 1000;
      const upcoming = filtered.filter((row) => {
        if (!row.expected_arrival_time) return true;
        const ts = new Date(row.expected_arrival_time).getTime();
        if (Number.isFinite(ts)) {
          const cutoff = row.is_monitored ? 10 * 60 * 1000 : 60_000;
          return ts >= (now - cutoff) && ts <= horizon;
        }
        return true;
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
    }
  }, [conn, stopId, targetDirection, targetDestination, targetLine, targetLineCode, setData]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      const calls = conn.db.estimated_calls_current;
      const vehicles = conn.db.vehicle_positions_current;
      calls.onInsert(handler);
      calls.onDelete(handler);
      calls.onUpdate(handler);
      vehicles.onInsert(handler);
      vehicles.onDelete(handler);
      vehicles.onUpdate(handler);
      return () => {
        calls.removeOnInsert(handler);
        calls.removeOnDelete(handler);
        calls.removeOnUpdate(handler);
        vehicles.removeOnInsert(handler);
        vehicles.removeOnDelete(handler);
        vehicles.removeOnUpdate(handler);
      };
    },
    [conn],
  );

  useThrottledTableSubscription(
    Boolean(enabled && conn && connected && stopId),
    update,
    subscribe,
    [conn, connected, stopId, targetDirection, targetDestination, targetLine, targetLineCode],
    500,
    15000,
  );

  return {
    data,
    isLoading: enabled && !connected,
    error: error ? new Error(error) : null,
  };
};
