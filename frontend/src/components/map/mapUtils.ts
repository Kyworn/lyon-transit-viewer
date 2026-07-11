import mapboxgl from 'mapbox-gl';
import { createStopMarker, loadStopMarker } from '../../utils/createStopMarker';

export const stopIconIds = {
  bus: 'bus-stop',
  tram: 'tram-stop',
  metro: 'metro-stop',
  funicular: 'funi-stop',
  fluvial: 'fluvial-stop',
};

/**
 * Configure Atmosphere Fog for Mapbox
 */
export const setupMapAtmosphere = (map: mapboxgl.Map) => {
  map.setFog({
    'range': [0.5, 10],
    'color': '#020617', // Slate base matching background
    'horizon-blend': 0.1,
    'high-color': '#0f172a',
    'space-color': '#000000',
    'star-intensity': 0.15,
  });
};

/**
 * Configure 3D Extruded Buildings Layer
 */
export const setup3DBuildings = (map: mapboxgl.Map) => {
  const layers = map.getStyle().layers;
  const labelLayerId = layers?.find(
    (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
  )?.id;

  map.addLayer(
    {
      'id': 'add-3d-buildings',
      'source': 'composite',
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'minzoom': 15,
      'paint': {
        'fill-extrusion-color': '#1e293b',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.5,
      },
    },
    labelLayerId
  );
};

/**
 * Load and register SVG markers to Mapbox instance
 */
export const registerStopIcons = async (map: mapboxgl.Map): Promise<Set<string>> => {
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
 * Clean up standard mapbox labels we don't need
 */
export const customizeBaseStyle = (map: mapboxgl.Map) => {
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

