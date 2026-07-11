import React, { useRef, useEffect, useState } from 'react';
import maplibregl, { Map as MaplibreMap } from 'maplibre-gl';
import { useAppStore } from '../../stores/useAppStore';
import { useStops } from '../../hooks/useStops';
import { useVehicles } from '../../hooks/useVehicles';
import { useLines } from '../../hooks/useLines';
import { getConnection } from '../../spacetime/connection';
import { usePricingZones } from '../../hooks/usePricingZones';
import { useLineIcons } from '../../hooks/useLineIcons';
import { useVelov } from '../../hooks/useVelov';
import { useAutopartage } from '../../hooks/useAutopartage';
import { usePublicToilets } from '../../hooks/usePublicToilets';
import {
  registerStopIcons,
  setupMapAtmosphere,
  setup3DBuildings,
  customizeBaseStyle,
} from './mapUtils';
import { createVehicleMarker, loadSVGMarker } from '../../utils/createVehicleMarker';
import { createStopMarker, loadStopMarker } from '../../utils/createStopMarker';
import { createMobilityMarker, loadMobilityMarker } from '../../utils/createMobilityMarker';
import { Stop, Vehicle } from '../../types';
import 'maplibre-gl/dist/maplibre-gl.css';

// Helper functions for parsing and normalizations
const normalizeMapColor = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/^rgb(a?)\(/i.test(raw)) return raw;
  if (raw.startsWith('#')) return raw;
  if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return `#${raw}`;
  return '';
};

const normalizeCode = (value?: string | null) =>
  (value || '')
    .toString()
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

const extractLineCode = (service: string) => {
  const raw = (service || '').trim();
  if (!raw) return '';
  const leading = raw.split(':')[0]?.trim() || '';
  if (/^(?:[ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})$/i.test(leading)) {
    return normalizeCode(leading);
  }
  const match = raw.match(/(?:^|::)([ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})(?::|$)/i);
  return normalizeCode(match?.[1] || '');
};

const normalizeDirection = (value?: string | null) => {
  const raw = (value || '').toString().trim().toUpperCase();
  if (raw === 'A' || raw === 'ALLER' || raw === 'OUTBOUND') return 'A';
  if (raw === 'R' || raw === 'RETOUR' || raw === 'INBOUND') return 'R';
  return '';
};

const extractDirection = (service: string) => {
  const raw = (service || '').trim();
  if (!raw) return '';
  const tokens = raw.split(':').map((v) => v.trim()).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  return normalizeDirection(last);
};

export default function MapComponent() {
  const map = useRef<MaplibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadedIconsRef = useRef<Set<string>>(new Set());
  const isProgrammaticFlightRef = useRef(false);
  const prevVehiclePosRef = useRef<Map<string, { lng: number; lat: number; bearing: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const animStartRef = useRef<number>(0);

  const {
    zoom,
    setZoom,
    centerCoordinates,
    setCenterCoordinates,
    selectedLine,
    selectedStop,
    setSelectedStop,
    selectedJourney,
    currentJourneyStep,
    selectedItem,
    setSelectedItem,
    velovVisible,
    autopartageVisible,
    vehiclesVisible,
    stopsVisible,
    linesVisible,
    toiletsVisible,
    vehiclesHeatmapVisible,
    nightBusOnly,
    userLocation,
    setMapLoaded,
  } = useAppStore();

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [stopIconsLoaded, setStopIconsLoaded] = useState(false);
  const stopsZoomVisible = zoom >= 14;

  // APIs & Subscriptions from hooks
  const { data: stops } = useStops(true);
  const { data: lines } = useLines({ includeTrace: true });
  const { data: pricingZones } = usePricingZones();
  const { data: lineIcons } = useLineIcons();
  
  const { data: vehicles } = useVehicles(
    selectedLine?.line_sort_code,
    selectedLine?.line_code,
    selectedLine?.direction,
    true,
    selectedLine?.destination_name
  );

  const { data: velovStations } = useVelov(velovVisible);
  const { data: autopartageStations } = useAutopartage(autopartageVisible);
  const { data: publicToilets } = usePublicToilets(toiletsVisible);

  // Dismiss the Splash only once the core data layers (stops, line traces,
  // pricing zones) have loaded AND painted (next `idle`). Armed once.
  const splashArmedRef = useRef(false);
  useEffect(() => {
    if (splashArmedRef.current) return;
    const m = map.current;
    if (!m || !isMapLoaded) return;
    if (stops.length === 0 || lines.length === 0 || (pricingZones?.length ?? 0) === 0) return;
    splashArmedRef.current = true;
    m.once('idle', () => setMapLoaded(true));
  }, [isMapLoaded, stops.length, lines.length, pricingZones?.length, setMapLoaded]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || map.current) return;

    try {
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: centerCoordinates ? [centerCoordinates.lng, centerCoordinates.lat] : [4.8357, 45.7640],
        zoom: zoom,
        pitch: 50,
        bearing: -15,
        antialias: true,
        maxBounds: [
          [4.10, 45.35],
          [5.35, 46.45]
        ],
        minZoom: 10
      });

      map.current = mapInstance;

      mapInstance.on('moveend', () => {
        if (isProgrammaticFlightRef.current) {
          isProgrammaticFlightRef.current = false;
          return;
        }
        const center = mapInstance.getCenter();
        setCenterCoordinates({ lng: center.lng, lat: center.lat });
        setZoom(mapInstance.getZoom());
      });

      mapInstance.on('load', async () => {
        setIsMapLoaded(true);
        setupMapAtmosphere(mapInstance);
        setup3DBuildings(mapInstance);
        customizeBaseStyle(mapInstance);

        try {
          await registerStopIcons(mapInstance);
          setStopIconsLoaded(true);
        } catch (e) {
          console.error('Failed loading stop icons', e);
        }
      });
    } catch (err) {
      console.error('MapLibre initialization failed:', err);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Programmatic Fly-to centering when centerCoordinates updates
  useEffect(() => {
    if (centerCoordinates && map.current) {
      const current = map.current.getCenter();
      const dist = Math.sqrt(Math.pow(current.lng - centerCoordinates.lng, 2) + Math.pow(current.lat - centerCoordinates.lat, 2));
      if (dist > 0.001) {
        isProgrammaticFlightRef.current = true;
        map.current.flyTo({
          center: [centerCoordinates.lng, centerCoordinates.lat],
          zoom: 16,
          duration: 1200
        });
      }
    }
  }, [centerCoordinates]);

  // Pricing Zones rendering
  useEffect(() => {
    if (!isMapLoaded || !pricingZones || !Array.isArray(pricingZones) || pricingZones.length === 0 || !map.current) return;
    const mapInstance = map.current;

    // Extract zone number from name (e.g. "Zone 1", "Z2", "1") → 1..5
    const zoneNumber = (raw: string | undefined): number => {
      const m = String(raw || '').match(/(\d+)/);
      const n = m ? parseInt(m[1], 10) : NaN;
      return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
    };

    const features = pricingZones
      .filter((zone: any) => zone && zone.geojson)
      .map((zone: any) => {
        const zn = zoneNumber(zone.name);
        return {
          type: 'Feature' as const,
          properties: { name: zone.name, zone: zn, label: zn ? `Zone ${zn}` : (zone.name || '') },
          geometry: zone.geojson as any,
        };
      });

    const sourceData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    // One label per zone number. MapLibre's polygon symbol placement can emit a
    // label per ring/part, so we render labels from a dedicated point source
    // (area-centroid of the zone outer ring) — guarantees exactly one "Zone N".
    const areaCentroid = (ring: number[][]): [number, number] => {
      let a = 0, cx = 0, cy = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
        const cr = x0 * y1 - x1 * y0;
        a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
      }
      a *= 0.5;
      return a ? [cx / (6 * a), cy / (6 * a)] : [ring[0][0], ring[0][1]];
    };
    const seenZones = new Set<number>();
    const labelFeatures = features
      .filter((f) => {
        const zn = f.properties.zone as number;
        if (!zn || seenZones.has(zn)) return false;
        seenZones.add(zn);
        return true;
      })
      .map((f) => {
        const geom: any = f.geometry;
        const outer = geom?.type === 'MultiPolygon' ? geom.coordinates[0][0] : geom?.coordinates?.[0];
        return {
          type: 'Feature' as const,
          properties: { label: f.properties.label, zone: f.properties.zone },
          geometry: { type: 'Point' as const, coordinates: areaCentroid(outer || [[4.83, 45.76]]) },
        };
      });
    const labelData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: labelFeatures };

    // Color ramp: gradient violet from light (zone 1) to deep (zone 5)
    // Same hue 263, alpha ramps from 0.06 → 0.22
    const fillColor: any = [
      'match',
      ['get', 'zone'],
      1, 'rgba(109, 40, 217, 0.28)',  // violet-700 (densest, centre)
      2, 'rgba(124, 58, 237, 0.22)',  // violet-600
      3, 'rgba(139, 92, 246, 0.18)',  // violet-500
      4, 'rgba(167, 139, 250, 0.14)', // violet-400
      5, 'rgba(196, 181, 253, 0.10)', // violet-300 (lightest, edges)
      /* default */ 'rgba(139, 92, 246, 0.08)',
    ];
    const outlineColor: any = [
      'match',
      ['get', 'zone'],
      1, 'rgba(109, 40, 217, 0.75)',
      2, 'rgba(124, 58, 237, 0.7)',
      3, 'rgba(139, 92, 246, 0.65)',
      4, 'rgba(167, 139, 250, 0.6)',
      5, 'rgba(196, 181, 253, 0.55)',
      /* default */ 'rgba(139, 92, 246, 0.4)',
    ];
    const textColor: any = [
      'match',
      ['get', 'zone'],
      1, '#7c3aed',
      2, '#8b5cf6',
      3, '#a78bfa',
      4, '#c4b5fd',
      5, '#ddd6fe',
      /* default */ '#a78bfa',
    ];

    const source = mapInstance.getSource('pricing-zones') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(sourceData);
      const labelSrc = mapInstance.getSource('pricing-zone-labels') as maplibregl.GeoJSONSource;
      if (labelSrc) labelSrc.setData(labelData);
      try {
        mapInstance.setPaintProperty('pricing-zones-fill', 'fill-color', fillColor);
        mapInstance.setPaintProperty('pricing-zones-outline', 'line-color', outlineColor);
        mapInstance.setPaintProperty('pricing-zones-label', 'text-color', textColor);
      } catch {}
    } else {
      mapInstance.addSource('pricing-zones', { type: 'geojson', data: sourceData });
      mapInstance.addLayer({
        id: 'pricing-zones-fill',
        type: 'fill',
        source: 'pricing-zones',
        paint: {
          'fill-color': fillColor,
          'fill-antialias': true,
        },
      });
      mapInstance.addLayer({
        id: 'pricing-zones-outline',
        type: 'line',
        source: 'pricing-zones',
        paint: {
          'line-color': outlineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2],
          'line-blur': 0.5,
        },
      });
      mapInstance.addSource('pricing-zone-labels', { type: 'geojson', data: labelData });
      mapInstance.addLayer({
        id: 'pricing-zones-label',
        type: 'symbol',
        source: 'pricing-zone-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 14, 13, 28, 16, 44],
          'text-letter-spacing': 0.15,
          'text-transform': 'uppercase',
          'symbol-placement': 'point',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': textColor,
          'text-halo-color': 'rgba(2, 6, 23, 0.85)',
          'text-halo-width': 2,
          'text-halo-blur': 1,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12, 0.85, 16, 0.95],
        },
      });
    }
  }, [pricingZones, isMapLoaded]);

  // Lines rendering (Glow & Core)
  useEffect(() => {
    if (!isMapLoaded || !lines || !map.current) return;
    const mapInstance = map.current;

    const currentLineId = selectedLine?.id;
    const visibleLines = selectedJourney 
      ? [] 
      : selectedLine 
        ? lines.filter(l => l.id === currentLineId) 
        : lines.filter(l => ['metro', 'tram', 'funicular', 'fluvial'].includes(l.category));

    const sourceData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleLines.map(line => {
        let coords = null;
        try {
          coords = line.trace_code ? JSON.parse(line.trace_code) : null;
        } catch(e) {}
        
        return {
          type: 'Feature' as const,
          properties: {
            id: line.id,
            color: normalizeMapColor(line.color) || '#9333ea',
            weight: line.category === 'metro' ? 4 : line.category === 'tram' ? 3 : 2,
          },
          geometry: coords as any,
        };
      }).filter(f => f.geometry),
    };

    const source = mapInstance.getSource('lines') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(sourceData);
    } else {
      mapInstance.addSource('lines', { type: 'geojson', data: sourceData });
      mapInstance.addLayer({
        id: 'lines-glow',
        type: 'line',
        source: 'lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['*', ['get', 'weight'], 4],
          'line-blur': 4,
          'line-opacity': 0.4,
        },
      });
      mapInstance.addLayer({
        id: 'lines-core',
        type: 'line',
        source: 'lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'weight'],
          'line-opacity': 1,
        },
      });
    }
  }, [lines, selectedLine, selectedJourney, isMapLoaded]);

  // On-demand bus trace: rail traces are subscribed up front, but bus geometry
  // is fetched only when its line is selected (keeps first paint at ~1MB, not
  // ~500MB). Rail/fluvial already have their trace, so skip them. Once fetched,
  // useLines refires via the line_traces subscription and the effect above draws it.
  const requestedTraces = useRef<Set<string>>(new Set());
  useEffect(() => {
    const id = selectedLine?.id;
    const category = selectedLine?.category || '';
    if (!id) return;
    if (['metro', 'tram', 'funicular', 'fluvial'].includes(category)) return;
    if (requestedTraces.current.has(id)) return;
    const conn = getConnection();
    if (!conn) return;
    requestedTraces.current.add(id);
    try {
      // ids are system feature ids (no quotes) — safe to inline.
      (conn as any).subscriptionBuilder().subscribe([`SELECT * FROM line_traces WHERE id = '${id}'`]);
    } catch (e) {
      requestedTraces.current.delete(id);
    }
  }, [selectedLine?.id, selectedLine?.category]);

  // Stops rendering effect
  useEffect(() => {
    if (!isMapLoaded || !map.current || !lines || !stopIconsLoaded) return;
    const mapInstance = map.current;

    const selectedLineColor = normalizeMapColor(
      (selectedLine as any)?.display_color || selectedLine?.color || null
    );

    const stopIcons: Array<{ iconId: string; type: 'bus' | 'tram' | 'metro' | 'funicular' | 'fluvial' }> = [
      { iconId: 'bus-stop', type: 'bus' },
      { iconId: 'tram-stop', type: 'tram' },
      { iconId: 'metro-stop', type: 'metro' },
      { iconId: 'funi-stop', type: 'funicular' },
      { iconId: 'fluvial-stop', type: 'fluvial' },
    ];

    // Repaint stop icons to selected line color so metro/funi stops inherit line color too.
    stopIcons.forEach(({ iconId, type }) => {
      const markerSvg = createStopMarker(type, selectedLineColor || undefined);
      loadStopMarker(markerSvg)
        .then((image: HTMLImageElement) => {
          if (!map.current) return;
          if (map.current.hasImage(iconId)) {
            map.current.updateImage(iconId, image);
          } else {
            map.current.addImage(iconId, image);
            loadedIconsRef.current.add(iconId);
          }
        })
        .catch(() => {});
    });

    const stopsToDisplay = selectedLine && stops
      ? (() => {
        const candidateCodes = new Set<string>();
        addCodeAlias(candidateCodes, selectedLine.line_sort_code);
        addCodeAlias(candidateCodes, selectedLine.line_code);

        const parseServices = (stop: Stop) =>
          (stop.service_info || '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((service) => ({
              lineCode: extractLineCode(service),
              direction: extractDirection(service),
            }));

        const byLine = stops.filter((stop: Stop) => {
          const services = parseServices(stop);
          return services.some((s) => candidateCodes.has(s.lineCode));
        });

        if (selectedLine.direction === 'Aller' || selectedLine.direction === 'Retour') {
          const directionCode = selectedLine.direction === 'Aller' ? 'A' : 'R';
          const strict = byLine.filter((stop: Stop) => {
            const services = parseServices(stop);
            return services.some((s) => candidateCodes.has(s.lineCode) && s.direction === directionCode);
          });
          const hasDirectionData = byLine.some((stop: Stop) => {
            const services = parseServices(stop);
            return services.some((s) => candidateCodes.has(s.lineCode) && (s.direction === 'A' || s.direction === 'R'));
          });
          return strict.length > 0 ? strict : (hasDirectionData ? [] : byLine);
        }

        return byLine;
      })()
      : (stopsZoomVisible && stops ? stops : []);

    const linesByCode = new Map(lines.map((line) => [normalizeCode(line.line_sort_code), line]));

    const stopsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: stopsToDisplay.map((stop: Stop) => {
        const services = (stop.service_info || '').split(',').map((s) => s.trim()).filter(Boolean);
        const firstLineCode = services.length > 0 ? extractLineCode(services[0]) : null;
        const line = firstLineCode ? linesByCode.get(firstLineCode) : null;
        const category = line ? line.category : 'bus';
        const lineColor = selectedLineColor || normalizeMapColor(line?.color || '') || null;

        return {
          type: 'Feature',
          properties: {
            ...stop,
            stop: JSON.stringify(stop),
            type: 'stop',
            category,
            lineColor,
          },
          geometry: {
            type: 'Point',
            coordinates: [stop.longitude, stop.latitude],
          },
        };
      }),
    };

    const source = mapInstance.getSource('stops-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(stopsGeoJSON);
    } else {
      mapInstance.addSource('stops-source', { type: 'geojson', data: stopsGeoJSON });
      
      const beforeLayer = mapInstance.getLayer('vehicles-layer') ? 'vehicles-layer' : undefined;
      
      mapInstance.addLayer({
        id: 'stops-color-layer',
        type: 'circle',
        source: 'stops-source',
        minzoom: 14,
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'coalesce',
            ['get', 'lineColor'],
            [
              'match',
              ['get', 'category'],
              'bus', '#2dd4bf',
              'tram', '#fb923c',
              'metro', '#60a5fa',
              'funicular', '#c084fc',
              'fluvial', '#00a3a6',
              '#64748b'
            ]
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0b1220',
          'circle-stroke-opacity': 0.95
        }
      }, beforeLayer);

      mapInstance.addLayer({
        id: 'stops-layer',
        type: 'symbol',
        source: 'stops-source',
        minzoom: 14,
        layout: {
          'icon-image': [
            'match',
            ['get', 'category'],
            'bus', 'bus-stop',
            'tram', 'tram-stop',
            'metro', 'metro-stop',
            'funicular', 'funi-stop',
            'fluvial', 'fluvial-stop',
            'bus-stop'
          ],
          'icon-size': 0.75,
          'icon-allow-overlap': true
        }
      }, beforeLayer);
    }
  }, [stops, selectedLine, lines, stopIconsLoaded, isMapLoaded, stopsZoomVisible]);

  // Vehicles rendering effect
  useEffect(() => {
    if (!isMapLoaded || !map.current || !lines) return;
    const mapInstance = map.current;

    if (!vehicles || vehicles.length === 0) {
      const source = mapInstance.getSource('vehicles-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    const linesByCode = new Map(lines.map((line) => [normalizeCode(line.line_sort_code), line]));

    const getVehicleStyle = (v: Vehicle) => {
      const sortCode = normalizeCode(v.published_line_name || extractLineCode(v.line_ref));
      const line = linesByCode.get(sortCode);
      return {
        color: line?.color || '64748b',
        category: line?.category || 'bus',
        sortCode: v.published_line_name || line?.line_sort_code || 'bus'
      };
    };

    // Build target positions and snapshot current interpolated positions
    const ANIM_DURATION = 8000; // ms — spread movement over ingest interval

    const targetPositions = new Map<string, { lng: number; lat: number; bearing: number }>();

    const buildGeoJSON = (interpT: number): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: vehicles.map((vehicle: Vehicle) => {
        const style = getVehicleStyle(vehicle);
        const iconId = `vehicle-icon-${style.sortCode}-${style.color}`;
        const color = normalizeMapColor(style.color) || '#ffffff';
        const prev = prevVehiclePosRef.current.get(vehicle.vehicle_ref);
        // Infer bearing from movement when API omits it
        let rawBearing = vehicle.bearing ?? 0;
        if ((!rawBearing || rawBearing === 0) && prev) {
          const dlng = vehicle.longitude - prev.lng;
          const dlat = vehicle.latitude - prev.lat;
          if (Math.abs(dlng) > 1e-6 || Math.abs(dlat) > 1e-6) {
            rawBearing = (Math.atan2(dlng, dlat) * 180 / Math.PI + 360) % 360;
          } else {
            rawBearing = prev.bearing;
          }
        }
        const target = { lng: vehicle.longitude, lat: vehicle.latitude, bearing: rawBearing };
        targetPositions.set(vehicle.vehicle_ref, target);
        const t = Math.min(interpT, 1);
        const lng = prev ? prev.lng + (target.lng - prev.lng) * t : target.lng;
        const lat = prev ? prev.lat + (target.lat - prev.lat) * t : target.lat;
        // Bearing: lerp with shortest-angle wrap
        let bearing = target.bearing;
        if (prev) {
          let db = target.bearing - prev.bearing;
          if (db > 180) db -= 360;
          if (db < -180) db += 360;
          bearing = prev.bearing + db * t;
        }
        return {
          type: 'Feature',
          properties: {
            ...vehicle,
            type: 'vehicle',
            iconId,
            color,
            vehicle: JSON.stringify(vehicle),
            bearing,
          },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        };
      }),
    });

    const updateVehiclesSource = (geojson?: GeoJSON.FeatureCollection) => {
      const data = geojson ?? buildGeoJSON(1);
      const source = mapInstance.getSource('vehicles-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(data);
        if (mapInstance.getLayer('vehicles-layer')) {
          mapInstance.setLayoutProperty('vehicles-layer', 'icon-image', ['get', 'iconId']);
        }
      } else {
        mapInstance.addSource('vehicles-source', { type: 'geojson', data: data });

        mapInstance.addLayer({
          id: 'selected-vehicle-highlight',
          type: 'circle',
          source: 'vehicles-source',
          filter: ['==', ['get', 'vehicle_ref'], ''],
          paint: {
            'circle-radius': 30,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.15,
            'circle-blur': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.6,
          },
        });

        mapInstance.addLayer({
          id: 'vehicles-layer',
          type: 'symbol',
          source: 'vehicles-source',
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-size': 1.0,
            'icon-allow-overlap': true,
            'icon-rotate': ['get', 'bearing'],
          },
        });
      }
    };

    // Gather missing SVG icons
    const requiredIcons = new Map<string, { color: string; category: string; sortCode: string }>();
    vehicles.forEach(vehicle => {
      const style = getVehicleStyle(vehicle);
      const iconId = `vehicle-icon-${style.sortCode}-${style.color}`;
      if (!loadedIconsRef.current.has(iconId) && !mapInstance.hasImage(iconId)) {
        requiredIcons.set(iconId, style);
      }
    });

    const loadMissingIconsAndRefresh = async (): Promise<void> => {
      const loadPromises = Array.from(requiredIcons.entries()).map(async ([iconId, style]) => {
        try {
          const markerDataUrl = createVehicleMarker(style.color, style.category);
          const image = await loadSVGMarker(markerDataUrl);
          if (!map.current) return;
          if (map.current.hasImage(iconId)) {
            map.current.updateImage(iconId, image);
          } else {
            map.current.addImage(iconId, image);
          }
          loadedIconsRef.current.add(iconId);
        } catch (err) {
          console.error(`Failed to load SVG vehicle marker for ${iconId}:`, err);
        }
      });

      if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
      }
      // Do NOT call updateVehiclesSource here — startAnimation will render at t=0
      // to avoid snap-back from target position back to old positions.
    };

    const startAnimation = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        // Capture current interpolated positions so next anim starts from where markers are
        const elapsed = performance.now() - animStartRef.current;
        const tNow = Math.min(elapsed / ANIM_DURATION, 1);
        targetPositions.forEach((target, ref) => {
          const prev = prevVehiclePosRef.current.get(ref);
          if (prev) {
            let db = target.bearing - prev.bearing;
            if (db > 180) db -= 360; if (db < -180) db += 360;
            prevVehiclePosRef.current.set(ref, {
              lng: prev.lng + (target.lng - prev.lng) * tNow,
              lat: prev.lat + (target.lat - prev.lat) * tNow,
              bearing: prev.bearing + db * tNow,
            });
          }
        });
      }
      animStartRef.current = performance.now();
      const animate = () => {
        if (!map.current) return;
        const elapsed = performance.now() - animStartRef.current;
        const t = Math.min(elapsed / ANIM_DURATION, 1);
        updateVehiclesSource(buildGeoJSON(t));
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          targetPositions.forEach((pos, ref) => prevVehiclePosRef.current.set(ref, pos));
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (requiredIcons.size > 0) {
      loadMissingIconsAndRefresh().then(startAnimation);
    } else {
      startAnimation();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [vehicles, selectedLine, lines, isMapLoaded]);

  // Apply visibility toggles for transit layers (vehicles/stops/lines)
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const setVis = (id: string, visible: boolean) => {
      if (m.getLayer(id)) {
        m.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    };
    setVis('vehicles-layer', vehiclesVisible);
    setVis('selected-vehicle-highlight', vehiclesVisible);
    setVis('stops-layer', stopsVisible);
    setVis('stops-color-layer', stopsVisible);
    setVis('lines-glow', linesVisible);
    setVis('lines-core', linesVisible);
  }, [isMapLoaded, vehiclesVisible, stopsVisible, linesVisible, vehicles, stops, lines]);

  // Public toilets layer
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const SRC = 'toilets-source';
    const LAY = 'toilets-layer';
    const allLayers = [LAY, LAY + '-glow'];

    if (!toiletsVisible || publicToilets.length === 0) {
      allLayers.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
      if (m.getSource(SRC)) m.removeSource(SRC);
      return;
    }

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: publicToilets.map((t) => ({
        type: 'Feature',
        properties: { id: t.id, address: t.address || '', infoloc: t.info_location || '' },
        geometry: { type: 'Point', coordinates: [t.longitude, t.latitude] },
      })),
    };

    const src = m.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(fc);
    } else {
      m.addSource(SRC, { type: 'geojson', data: fc });
      m.addLayer({
        id: LAY + '-glow',
        type: 'circle',
        source: SRC,
        minzoom: 13,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 14],
          'circle-color': '#06b6d4',
          'circle-opacity': 0.18,
          'circle-blur': 0.6,
        },
      });
      m.addLayer({
        id: LAY,
        type: 'circle',
        source: SRC,
        minzoom: 13,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 6],
          'circle-color': '#0a0a0c',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#06b6d4',
          'circle-opacity': 1,
        },
      });
    }
  }, [toiletsVisible, publicToilets, isMapLoaded]);

  // Vehicles density heatmap
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const HEAT = 'vehicles-heatmap';

    if (!vehiclesHeatmapVisible) {
      if (m.getLayer(HEAT)) m.removeLayer(HEAT);
      return;
    }

    if (!m.getSource('vehicles-source')) return; // wait until vehicles loaded
    if (m.getLayer(HEAT)) return;

    m.addLayer(
      {
        id: HEAT,
        type: 'heatmap',
        source: 'vehicles-source',
        maxzoom: 16,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, 'rgba(99,102,241,0.4)',
            0.4, 'rgba(168,85,247,0.6)',
            0.7, 'rgba(236,72,153,0.7)',
            1, 'rgba(244,63,94,0.85)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 16, 40],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.85, 16, 0],
        },
      },
      m.getLayer('vehicles-layer') ? 'vehicles-layer' : undefined,
    );
  }, [vehiclesHeatmapVisible, vehicles, isMapLoaded]);

  // User geolocation marker + radius
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const SRC = 'user-loc-source';
    const RADIUS = 'user-loc-radius';
    const DOT = 'user-loc-dot';

    if (!userLocation) {
      [DOT, RADIUS].forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
      if (m.getSource(SRC)) m.removeSource(SRC);
      return;
    }

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [userLocation.lng, userLocation.lat] },
      }],
    };

    const src = m.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(fc);
    } else {
      m.addSource(SRC, { type: 'geojson', data: fc });
      m.addLayer({
        id: RADIUS,
        type: 'circle',
        source: SRC,
        paint: {
          // 500m radius rendered as circle at zoom-dependent pixel size
          'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 5, 14, 80, 17, 600],
          'circle-color': 'rgba(6, 182, 212, 0.12)',
          'circle-stroke-color': 'rgba(6, 182, 212, 0.45)',
          'circle-stroke-width': 1.5,
        },
      });
      m.addLayer({
        id: DOT,
        type: 'circle',
        source: SRC,
        paint: {
          'circle-radius': 8,
          'circle-color': '#06b6d4',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 3,
        },
      });
    }
  }, [userLocation, isMapLoaded]);

  // Apply night bus filter on vehicles + lines
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const setFilter = (id: string, filter: any) => {
      if (m.getLayer(id)) m.setFilter(id, filter);
    };
    if (nightBusOnly) {
      // Match PL / Pleine Lune codes by line ref / published name
      const night = ['any',
        ['in', 'PL', ['coalesce', ['get', 'published_line_name'], '']],
        ['in', 'Pleine Lune', ['coalesce', ['get', 'destination_name'], '']],
      ];
      setFilter('vehicles-layer', night);
    } else {
      setFilter('vehicles-layer', null);
    }
  }, [nightBusOnly, isMapLoaded, vehicles]);

  // Click popups for mobility layers
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    let popup: maplibregl.Popup | null = null;

    const showPopup = (lngLat: maplibregl.LngLatLike, html: string) => {
      if (popup) popup.remove();
      popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, className: 'mobility-popup' })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(m);
    };

    const esc = (s: any) =>
      String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
      );

    const onVelovClick = (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties;
      const isOpen = p.status === 'OPEN';
      const statusLabel = isOpen ? 'Ouvert' : 'Fermé';
      const totalCapacity = (Number(p.bikes) || 0) + (Number(p.stands) || 0);
      const ratio = totalCapacity > 0 ? (Number(p.bikes) || 0) / totalCapacity : 0;
      const tone = !isOpen ? '#64748b' : ratio === 0 ? 'var(--danger)' : ratio < 0.3 ? 'var(--warning)' : 'var(--secondary)';
      const html = `
<div class="mob-card mob-velov">
  <div class="mob-header">
    <div class="mob-icon" style="background:${tone}22;border-color:${tone}55;color:${tone};box-shadow:0 0 14px ${tone}33">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>
    <div class="mob-header-text">
      <div class="mob-eyebrow" style="color:${tone}">Vélo'v · ${esc(statusLabel)}</div>
      <div class="mob-title">${esc(p.name)}</div>
    </div>
  </div>
  <div class="mob-stats">
    <div class="mob-stat" style="--stat-color:var(--secondary);--stat-bg:rgba(16,185,129,0.08);--stat-border:rgba(16,185,129,0.22)">
      <div class="mob-stat-value">${esc(p.bikes)}</div>
      <div class="mob-stat-label">Vélos</div>
    </div>
    <div class="mob-stat" style="--stat-color:var(--accent);--stat-bg:rgba(6,182,212,0.08);--stat-border:rgba(6,182,212,0.22)">
      <div class="mob-stat-value">${esc(p.stands)}</div>
      <div class="mob-stat-label">Places</div>
    </div>
  </div>
  ${Number(p.electrical) > 0 ? `
  <div class="mob-pill" style="--pill-color:#facc15;--pill-bg:rgba(250,204,21,0.08);--pill-border:rgba(250,204,21,0.22)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    <span>${esc(p.electrical)} vélo${Number(p.electrical) > 1 ? 's' : ''} électrique${Number(p.electrical) > 1 ? 's' : ''}</span>
  </div>` : ''}
</div>`;
      showPopup(e.lngLat, html);
    };

    const onAutoClick = (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties;
      const html = `
<div class="mob-card mob-auto">
  <div class="mob-header">
    <div class="mob-icon" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#f59e0b;box-shadow:0 0 14px rgba(245,158,11,0.25)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
        <circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>
      </svg>
    </div>
    <div class="mob-header-text">
      <div class="mob-eyebrow" style="color:#f59e0b">Autopartage</div>
      <div class="mob-title">${esc(p.name)}</div>
    </div>
  </div>
  <div class="mob-stats">
    <div class="mob-stat mob-stat-wide" style="--stat-color:#f59e0b;--stat-bg:rgba(245,158,11,0.06);--stat-border:rgba(245,158,11,0.18)">
      <div class="mob-stat-label">Opérateur</div>
      <div class="mob-stat-text">${esc(p.type || '—')}</div>
    </div>
    <div class="mob-stat" style="--stat-color:var(--text-primary);--stat-bg:rgba(255,255,255,0.03);--stat-border:var(--border-light)">
      <div class="mob-stat-value">${esc(p.spots)}</div>
      <div class="mob-stat-label">Places</div>
    </div>
  </div>
</div>`;
      showPopup(e.lngLat, html);
    };

    const setCursor = (cursor: string) => () => { m.getCanvas().style.cursor = cursor; };

    const wire = (layer: string, click: (e: any) => void) => {
      if (!m.getLayer(layer)) return () => {};
      m.on('click', layer, click);
      m.on('mouseenter', layer, setCursor('pointer'));
      m.on('mouseleave', layer, setCursor(''));
      return () => {
        m.off('click', layer, click);
        m.off('mouseenter', layer, setCursor('pointer'));
        m.off('mouseleave', layer, setCursor(''));
      };
    };

    // Defer wiring until layers exist
    const tryWire: Array<() => void> = [];
    const wireOnce = () => {
      tryWire.push(wire('velov-layer', onVelovClick));
      tryWire.push(wire('autopartage-layer', onAutoClick));
    };
    // Layers might not exist yet; retry on style.data event
    wireOnce();
    m.on('idle', wireOnce);

    return () => {
      m.off('idle', wireOnce);
      tryWire.forEach((fn) => fn());
      if (popup) popup.remove();
    };
  }, [isMapLoaded, velovVisible, autopartageVisible]);

  // Vélo'v stations layer
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const SRC = 'velov-source';
    const LAY = 'velov-layer';

    const allLayers = [LAY, LAY + '-glow', LAY + '-label'];
    if (!velovVisible || velovStations.length === 0) {
      allLayers.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
      if (m.getSource(SRC)) m.removeSource(SRC);
      return;
    }

    const featuresWithColor = velovStations.map((s) => {
      const ratio = s.bike_stands > 0 ? s.available_bikes / s.bike_stands : 0;
      const color = s.status !== 'OPEN' ? '#64748b' : ratio === 0 ? '#ef4444' : ratio < 0.3 ? '#f59e0b' : '#22c55e';
      const iconId = `velov-${color}`;
      return { station: s, color, iconId };
    });

    // Register required icons (one per unique color)
    const ensureIcons = async () => {
      const uniqueColors = Array.from(new Set(featuresWithColor.map((f) => f.color)));
      await Promise.all(uniqueColors.map(async (color) => {
        const iconId = `velov-${color}`;
        if (m.hasImage(iconId)) return;
        const dataUrl = createMobilityMarker({ color, shape: 'bike', pulse: color === '#22c55e' });
        const img = await loadMobilityMarker(dataUrl);
        if (!m.hasImage(iconId)) m.addImage(iconId, img);
      }));
    };

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: featuresWithColor.map(({ station: s, color, iconId }) => ({
        type: 'Feature',
        properties: {
          number: s.number,
          name: s.name,
          color,
          iconId,
          bikes: s.available_bikes,
          stands: s.available_bike_stands,
          electrical: s.available_electrical_bikes ?? 0,
          status: s.status || '',
        },
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      })),
    };

    ensureIcons().then(() => {
      if (!map.current) return;
      const src = m.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc);
      } else {
        m.addSource(SRC, { type: 'geojson', data: fc });
        m.addLayer({
          id: LAY,
          type: 'symbol',
          source: SRC,
          minzoom: 11,
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-allow-overlap': true,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.35, 14, 0.7, 17, 1],
          },
        });
        m.addLayer({
          id: LAY + '-label',
          type: 'symbol',
          source: SRC,
          minzoom: 15,
          layout: {
            'text-field': ['to-string', ['get', 'bikes']],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, -2],
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#0a0a0c',
            'text-halo-width': 2,
          },
        });
      }
    });
  }, [velovVisible, velovStations, isMapLoaded]);

  // Autopartage stations layer
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const m = map.current;
    const SRC = 'autopartage-source';
    const LAY = 'autopartage-layer';

    const allLayers = [LAY, LAY + '-glow', LAY + '-label'];
    if (!autopartageVisible || autopartageStations.length === 0) {
      allLayers.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
      if (m.getSource(SRC)) m.removeSource(SRC);
      return;
    }

    const AUTO_COLOR = '#f59e0b';
    const ICON_ID = `autopartage-${AUTO_COLOR}`;

    const ensureIcon = async () => {
      if (m.hasImage(ICON_ID)) return;
      const dataUrl = createMobilityMarker({ color: AUTO_COLOR, shape: 'car' });
      const img = await loadMobilityMarker(dataUrl);
      if (!m.hasImage(ICON_ID)) m.addImage(ICON_ID, img);
    };

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: autopartageStations.map((s) => ({
        type: 'Feature',
        properties: {
          id: s.id_station,
          name: s.name,
          type: s.type_autopartage || '',
          spots: s.nb_emplacements,
          iconId: ICON_ID,
        },
        geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      })),
    };

    ensureIcon().then(() => {
      if (!map.current) return;
      const src = m.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc);
      } else {
        m.addSource(SRC, { type: 'geojson', data: fc });
        m.addLayer({
          id: LAY,
          type: 'symbol',
          source: SRC,
          minzoom: 11,
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-allow-overlap': true,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.3, 14, 0.6, 17, 0.9],
          },
        });
      }
    });
  }, [autopartageVisible, autopartageStations, isMapLoaded]);

  // Journey route rendering
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const mapInstance = map.current;

    const ROUTE_SOURCE = 'journey-route-source';
    const ROUTE_BG_LAYER = 'journey-route-bg';
    const ROUTE_LAYER = 'journey-route-layer';
    const WALK_LAYER = 'journey-route-walk';
    const ACTIVE_LAYER = 'journey-route-active';
    const MARKERS_SOURCE = 'journey-markers-source';
    const MARKERS_LAYER = 'journey-markers-layer';

    const cleanup = () => {
      [ROUTE_BG_LAYER, ROUTE_LAYER, WALK_LAYER, ACTIVE_LAYER, MARKERS_LAYER].forEach(l => {
        if (mapInstance.getLayer(l)) mapInstance.removeLayer(l);
      });
      [ROUTE_SOURCE, MARKERS_SOURCE].forEach(s => {
        if (mapInstance.getSource(s)) mapInstance.removeSource(s);
      });
    };

    if (!selectedJourney) {
      cleanup();
      return;
    }

    const sections = (selectedJourney as any).sections || [];

    const routeFeatures: GeoJSON.Feature[] = sections
      .filter((s: any) => s.geojson?.coordinates?.length > 0)
      .map((s: any, idx: number) => {
        const isTransit = s.type === 'public-transport';
        const color = isTransit && s.line?.color ? `#${s.line.color}` : s.type === 'walk' ? '#94a3b8' : '#60a5fa';
        return {
          type: 'Feature' as const,
          properties: { idx, color, isActive: idx === currentJourneyStep, type: s.type },
          geometry: { type: 'LineString', coordinates: s.geojson.coordinates } as GeoJSON.Geometry,
        };
      });

    const routeGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: routeFeatures };

    // Stop dots: transit section start/end + intermediateStops + final destination
    const markerFeatures: GeoJSON.Feature[] = [];
    const addedCoords = new Set<string>();
    const addStopDot = (coord: number[], color: string, size: 'sm' | 'md' | 'lg') => {
      const key = `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
      if (addedCoords.has(key)) return;
      addedCoords.add(key);
      markerFeatures.push({
        type: 'Feature' as const,
        properties: { color, size },
        geometry: { type: 'Point', coordinates: coord },
      });
    };

    sections.forEach((s: any, idx: number) => {
      if (s.type !== 'public-transport') return;
      const lineColor = s.line?.color ? `#${s.line.color}` : '#60a5fa';

      // Departure stop
      const fromCoord = s.from?.geojson?.coordinates ?? s.geojson?.coordinates?.[0];
      if (fromCoord) addStopDot(fromCoord, lineColor, 'md');

      // Intermediate stops
      (s.intermediateStops || []).forEach((ist: any) => {
        const coord = ist.stop?.geojson?.coordinates;
        if (coord) addStopDot(coord, lineColor, 'sm');
      });

      // Arrival stop (or final destination)
      const toCoord = s.to?.geojson?.coordinates ?? s.geojson?.coordinates?.slice(-1)[0];
      if (toCoord) {
        const isFinal = idx === sections.length - 1 || !sections.slice(idx + 1).some((ss: any) => ss.type === 'public-transport');
        addStopDot(toCoord, isFinal ? '#22c55e' : lineColor, isFinal ? 'lg' : 'md');
      }
    });

    // Add journey origin dot
    const originCoord = sections[0]?.from?.geojson?.coordinates ?? sections[0]?.geojson?.coordinates?.[0];
    if (originCoord) addStopDot(originCoord, '#f97316', 'lg');

    cleanup();

    mapInstance.addSource(ROUTE_SOURCE, { type: 'geojson', data: routeGeoJSON });
    mapInstance.addSource(MARKERS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: markerFeatures } });

    // Shadow/background stroke
    mapInstance.addLayer({
      id: ROUTE_BG_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.3 },
    });

    // Transit route lines
    mapInstance.addLayer({
      id: ROUTE_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['!=', ['get', 'type'], 'walk'],
      paint: {
        'line-color': ['case', ['get', 'isActive'], ['get', 'color'], 'rgba(255,255,255,0.25)'],
        'line-width': ['case', ['get', 'isActive'], 5, 3],
        'line-opacity': ['case', ['get', 'isActive'], 1, 0.5],
      },
    });

    // Walk sections — dashed
    mapInstance.addLayer({
      id: WALK_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['==', ['get', 'type'], 'walk'],
      paint: {
        'line-color': ['case', ['get', 'isActive'], '#94a3b8', 'rgba(255,255,255,0.2)'],
        'line-width': 3,
        'line-opacity': ['case', ['get', 'isActive'], 0.9, 0.4],
        'line-dasharray': [2, 3],
      },
    });

    // Active step glow
    mapInstance.addLayer({
      id: ACTIVE_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      filter: ['==', ['get', 'isActive'], true],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 10,
        'line-opacity': 0.25,
        'line-blur': 4,
      },
    });

    // Stop dots (size: sm=3, md=5, lg=7)
    mapInstance.addLayer({
      id: MARKERS_LAYER,
      type: 'circle',
      source: MARKERS_SOURCE,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'size'], 'lg'], 7, ['==', ['get', 'size'], 'sm'], 3, 5],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': ['case', ['==', ['get', 'size'], 'sm'], 1, 2],
        'circle-stroke-color': '#fff',
      },
    });

    // Fit map to active section
    const activeSection = sections[currentJourneyStep ?? 0];
    const coords = activeSection?.geojson?.coordinates;
    if (coords?.length > 1) {
      const bounds = coords.reduce(
        (b: maplibregl.LngLatBounds, c: number[]) => b.extend([c[0], c[1]] as [number, number]),
        new maplibregl.LngLatBounds([coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]])
      );
      mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
    } else if (routeFeatures.length > 0) {
      // Fit entire route
      const allCoords = sections.flatMap((s: any) => s.geojson?.coordinates || []);
      if (allCoords.length > 1) {
        const bounds = allCoords.reduce(
          (b: maplibregl.LngLatBounds, c: number[]) => b.extend([c[0], c[1]] as [number, number]),
          new maplibregl.LngLatBounds([allCoords[0][0], allCoords[0][1]], [allCoords[0][0], allCoords[0][1]])
        );
        mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
      }
    }

    return cleanup;
  }, [selectedJourney, currentJourneyStep, isMapLoaded]);

  // Hide vehicles & stops during journey view
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const mapInstance = map.current;
    const vis = selectedJourney ? 'none' : 'visible';
    ['vehicles-layer', 'selected-vehicle-highlight', 'stops-layer'].forEach(l => {
      if (mapInstance.getLayer(l)) mapInstance.setLayoutProperty(l, 'visibility', vis);
    });
  }, [selectedJourney, isMapLoaded]);

  // Selected item highlight effect
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const mapInstance = map.current;

    if (mapInstance.getLayer('selected-vehicle-highlight')) {
      if (selectedItem && selectedItem.type === 'vehicle') {
        mapInstance.setFilter('selected-vehicle-highlight', [
          '==',
          ['get', 'vehicle_ref'],
          selectedItem.vehicle_ref || '',
        ]);
      } else {
        mapInstance.setFilter('selected-vehicle-highlight', ['==', ['get', 'vehicle_ref'], '']);
      }
    }
  }, [selectedItem, isMapLoaded]);

  // Hover & Click interaction handlers
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const mapInstance = map.current;

    const onMapClick = (e: maplibregl.MapMouseEvent) => {
      // 1. Check vehicles click
      if (mapInstance.getLayer('vehicles-layer')) {
        const vehicleFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['vehicles-layer'] });
        if (vehicleFeatures.length > 0) {
          const vehicleData = JSON.parse(vehicleFeatures[0].properties?.vehicle || '{}');
          setSelectedItem({ ...vehicleData, type: 'vehicle' });
          return;
        }
      }

      // 2. Check stops click
      if (mapInstance.getLayer('stops-layer')) {
        const stopFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['stops-layer'] });
        if (stopFeatures.length > 0) {
          const stopData = JSON.parse(stopFeatures[0].properties?.stop || '{}');
          setSelectedStop(stopData);
          setSelectedItem(null);
          return;
        }
      }
    };

    const onMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = '';
    };

    mapInstance.on('click', onMapClick);

    const setupHoverListeners = () => {
      if (mapInstance.getLayer('stops-layer')) {
        mapInstance.on('mouseenter', 'stops-layer', onMouseEnter);
        mapInstance.on('mouseleave', 'stops-layer', onMouseLeave);
      }
      if (mapInstance.getLayer('vehicles-layer')) {
        mapInstance.on('mouseenter', 'vehicles-layer', onMouseEnter);
        mapInstance.on('mouseleave', 'vehicles-layer', onMouseLeave);
      }
    };

    setupHoverListeners();

    return () => {
      mapInstance.off('click', onMapClick);
      try {
        mapInstance.off('mouseenter', 'stops-layer', onMouseEnter);
        mapInstance.off('mouseleave', 'stops-layer', onMouseLeave);
        mapInstance.off('mouseenter', 'vehicles-layer', onMouseEnter);
        mapInstance.off('mouseleave', 'vehicles-layer', onMouseLeave);
      } catch (e) {}
    };
  }, [isMapLoaded, stops, vehicles]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%' }} 
        className="map-container"
      />
      {!isMapLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020617',
          color: 'var(--text-secondary)',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.08)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 16px',
            }} className="animate-spin-slow" />
            <p style={{ fontFamily: 'Outfit', fontWeight: 500 }}>Chargement de la carte de Lyon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
