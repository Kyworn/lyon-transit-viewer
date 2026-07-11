import maplibregl from 'maplibre-gl';
import { createStopMarker, loadStopMarker } from '../../utils/createStopMarker';

export const stopIconIds = {
  bus: 'bus-stop',
  tram: 'tram-stop',
  metro: 'metro-stop',
  funicular: 'funi-stop',
  fluvial: 'fluvial-stop',
};

/**
 * Configure atmospheric sky for MapLibre (dark, matches app background).
 * MapLibre uses setSky (no setFog like Mapbox). Cosmetic — guarded so an
 * unsupported style can never break map init.
 */
export const setupMapAtmosphere = (map: maplibregl.Map) => {
  try {
    map.setSky({
      'sky-color': '#0f172a',
      'horizon-color': '#020617',
      'fog-color': '#020617',
      'fog-ground-blend': 0.6,
      'sky-horizon-blend': 0.8,
    });
  } catch {
    // atmosphere is decorative; ignore if the style rejects it
  }
};

/**
 * Configure 3D extruded buildings against the CARTO (OpenMapTiles) schema:
 * source `carto`, source-layer `building`, height attrs `render_height` /
 * `render_min_height` (fallback to height/min_height). Guarded so a missing
 * source cannot break the map `load` handler.
 */
export const setup3DBuildings = (map: maplibregl.Map) => {
  try {
    if (!map.getSource('carto') || map.getLayer('add-3d-buildings')) return;
    const layers = map.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
    )?.id;

    map.addLayer(
      {
        'id': 'add-3d-buildings',
        'source': 'carto',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#1e293b',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.5,
        },
      },
      labelLayerId
    );
  } catch (e) {
    console.warn('3D buildings skipped', e);
  }
};

/**
 * Load and register SVG markers to MapLibre instance
 */
export const registerStopIcons = async (map: maplibregl.Map): Promise<Set<string>> => {
  const loadedIcons = new Set<string>();
  const promises = Object.entries(stopIconIds).map(([type, iconId]) => {
    const svgData = createStopMarker(type);
    return loadStopMarker(svgData).then((img) => {
      if (map && !map.hasImage(iconId)) {
        map.addImage(iconId, img);
        loadedIcons.add(iconId);
      }
    });
  });
  await Promise.all(promises);
  return loadedIcons;
};

/**
 * Clean up standard maplibre labels we don't need
 */
export const customizeBaseStyle = (map: maplibregl.Map) => {
  const hideLayers = ['road-label', 'poi-label', 'transit-label'];
  hideLayers.forEach((layer) => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, 'visibility', 'none');
    }
  });

  if (map.getLayer('water')) {
    map.setPaintProperty('water', 'fill-color', '#020617');
  }
};

