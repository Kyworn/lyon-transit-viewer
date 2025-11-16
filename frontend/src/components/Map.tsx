import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl';
import { useStops } from '../hooks/useStops';
import { useVehicles } from '../hooks/useVehicles';
import { useLines } from '../hooks/useLines';
import { useLineIcons } from '../hooks/useLineIcons';
import { usePricingZones } from '../hooks/usePricingZones';
import { useSelectionStore } from '../stores/selectionStore';
import { Stop, Line, Vehicle, LineIcon } from '../types';
import { Geometry } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import StopDetailsModal from './StopDetailsModal';
import { Box, CircularProgress, Alert } from '@mui/material';
import { createVehicleMarker, loadSVGMarker } from '../utils/createVehicleMarker';

if (process.env.REACT_APP_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
} else {
  console.error('Mapbox access token is not set!');
}

function MapComponent() {
  const map = useRef<MapboxMap | null>(null);
  const [lng, setLng] = useState(4.8357);
  const [lat, setLat] = useState(45.7640);
  const [zoom, setZoom] = useState(11);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [stopIconsLoaded, setStopIconsLoaded] = useState(false);
  const [modalStop, setModalStop] = useState<Stop | null>(null);
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{ top: number; left: number } | null>(null);

  const loadedIconsRef = useRef(new Set<string>());

  const selectedLine = useSelectionStore((state) => state.selectedLine);
  const selectedJourney = useSelectionStore((state) => state.selectedJourney);
  const currentJourneyStep = useSelectionStore((state) => state.currentJourneyStep);
  const centerCoordinates = useSelectionStore((state) => state.centerCoordinates);
  const setCenterCoordinates = useSelectionStore((state) => state.setCenterCoordinates);

  const { data: stops, isLoading: isLoadingStops, error: errorStops } = useStops(true);
  const { data: lines, isLoading: isLoadingLines, error: errorLines } = useLines();
  const { data: lineIcons, isLoading: isLoadingLineIcons, error: errorLineIcons } = useLineIcons();
  const { data: pricingZones } = usePricingZones();
  const setSelectedItem = useSelectionStore((state) => state.setSelectedItem);
  const { data: vehicles, isLoading: isLoadingVehicles, error: errorVehicles, refetch: refetchVehicles } = useVehicles(selectedLine?.line_sort_code, selectedLine?.direction, !!selectedLine);

  useEffect(() => {
    refetchVehicles();
  }, [selectedLine, refetchVehicles]);

  // Center map when centerCoordinates changes
  useEffect(() => {
    if (centerCoordinates && map.current) {
      map.current.flyTo({
        center: [centerCoordinates.lng, centerCoordinates.lat],
        zoom: 16,
        duration: 1000
      });
      // Reset after centering
      setCenterCoordinates(null);
    }
  }, [centerCoordinates, setCenterCoordinates]);

  const mapContainerRef = useCallback((node: HTMLDivElement) => {
    if (node !== null && !map.current) {
      try {
        map.current = new mapboxgl.Map({
          container: node,
          style: 'mapbox://styles/mapbox/dark-v10',
          center: [lng, lat],
          zoom: zoom
        });

        map.current.on('styleimagemissing', (e) => {
          const id = e.id;
          if (loadedIconsRef.current.has(id)) return;
          const width = 32, height = 32, data = new Uint8Array(width * height * 4);
          let r = 255, g = 0, b = 0;
          if (id.includes('yellow')) { r = 255; g = 255; b = 0; }
          for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255; }
          if (map.current) map.current.addImage(id, { width, height, data }, { sdf: false });
        });

        map.current.on('load', () => {
          setIsMapLoaded(true);

          if (!map.current) return;

          const mapInstance = map.current;

          // Load all stop icons in parallel
          const iconPromises = [
            { name: 'bus-stop', path: '/icons/mode_Bus.png' },
            { name: 'tram-stop', path: '/icons/mode_Tramway.png' },
            { name: 'metro-stop', path: '/icons/mode_Metro.png' },
            { name: 'funi-stop', path: '/icons/mode_Funiculaire.png' }
          ].map(icon => {
            return new Promise<void>((resolve, reject) => {
              mapInstance.loadImage(icon.path, (error, image) => {
                if (error) {
                  console.error(`Failed to load ${icon.name}:`, error);
                  reject(error);
                } else if (image && mapInstance) {
                  mapInstance.addImage(icon.name, image);
                  resolve();
                }
              });
            });
          });

          // Set flag when all icons are loaded
          Promise.all(iconPromises)
            .then(() => {
              setStopIconsLoaded(true);
            })
            .catch(error => console.error('Error loading stop icons:', error));
        });

        map.current.on('move', () => {
          if (map.current) {
            setLng(Number(map.current.getCenter().lng.toFixed(4)));
            setLat(Number(map.current.getCenter().lat.toFixed(4)));
            setZoom(Number(map.current.getZoom().toFixed(2)));
          }
        });

      } catch (error) {
        console.error('Error initializing Mapbox map:', error);
      }
    }
  }, [lng, lat, zoom]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !lines || !stopIconsLoaded) return;
    const mapInstance = map.current;

    const linesByCode = new Map(lines.map((line) => [line.line_sort_code, line]));

    const stopsToDisplay = selectedLine && stops
      ? stops.filter((stop: Stop) => {
          if (!stop.service_info || stop.service_info.trim() === '') return false;
          const services = stop.service_info.split(',').map(s => s.trim()).filter(s => s.length > 0);

          if (selectedLine.direction === 'Aller' || selectedLine.direction === 'Retour') {
            const directionCode = selectedLine.direction === 'Aller' ? 'A' : 'R';
            return services.some(service => {
              const parts = service.split(':');
              if (parts.length !== 2) return false; // Must have exactly lineCode:direction format
              const [lineCode, direction] = parts.map(p => p.trim());
              if (!lineCode || !direction) return false; // Both must be non-empty
              return lineCode === selectedLine.line_sort_code && direction === directionCode;
            });
          } else {
            return services.some(service => {
              const parts = service.split(':');
              if (parts.length < 1) return false;
              const lineCode = parts[0].trim();
              if (!lineCode) return false; // Must be non-empty
              return lineCode === selectedLine.line_sort_code;
            });
          }
        })
      : []; // No stops on initial load

    const stopsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: stopsToDisplay.map((stop: Stop) => {
        const services = stop.service_info.split(',');
        const firstLineCode = services.length > 0 ? services[0].split(':')[0] : null;
        const line = firstLineCode ? linesByCode.get(firstLineCode) : null;
        const category = line ? line.category : 'bus'; // Default to bus

        return {
          type: 'Feature',
          properties: { ...stop, type: 'stop', category: category },
          geometry: {
            type: 'Point',
            coordinates: [stop.longitude, stop.latitude]
          }
        }
      })
    };

    const onMapLoad = () => {
      const source = mapInstance.getSource('stops-source') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(stopsGeoJSON);
      } else {
        mapInstance.addSource('stops-source', { type: 'geojson', data: stopsGeoJSON });
        // Add stops layer before vehicles layer if it exists, ensuring stops are above lines but below vehicles
        const beforeLayer = mapInstance.getLayer('vehicles-layer') ? 'vehicles-layer' : undefined;
        mapInstance.addLayer({
          id: 'stops-layer',
          type: 'symbol',
          source: 'stops-source',
          layout: {
            'icon-image': [
              'match',
              ['get', 'category'],
              'bus', 'bus-stop',
              'tram', 'tram-stop',
              'metro', 'metro-stop',
              'funicular', 'funi-stop',
              'bus-stop' // fallback
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true
          }
        }, beforeLayer);

        mapInstance.on('click', 'stops-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const clickedStop = e.features[0].properties as Stop;
            setModalStop(clickedStop);
            if (e.point) {
              setModalAnchorPosition({ top: e.point.y, left: e.point.x });
            }
          }
        });
      }
    };

    if (mapInstance.isStyleLoaded()) onMapLoad();
    else mapInstance.on('load', onMapLoad);

  }, [stops, selectedLine, lines, stopIconsLoaded]);

  useEffect(() => {
    try {
      if (!map.current || !lineIcons || !lines) return;
      const mapInstance = map.current;

      // Clear vehicles when no line is selected or when we don't have data yet
      if (!selectedLine) {
        if (mapInstance.getLayer('vehicles-layer')) {
          const source = mapInstance.getSource('vehicles-source') as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({ type: 'FeatureCollection', features: [] });
          }
        }
        return;
      }

      // If a line is selected but we don't have vehicle data yet, clear old vehicles and wait
      if (!vehicles || vehicles.length === 0) {
        if (mapInstance.getLayer('vehicles-layer')) {
          const source = mapInstance.getSource('vehicles-source') as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({ type: 'FeatureCollection', features: [] });
          }
        }
        return;
      }

      // Generate modern SVG marker with transport icon and line color
      const lineCode = selectedLine?.line_sort_code;
      const lineColor = selectedLine?.display_color || selectedLine?.color || 'FF0000';
      const lineCategory = selectedLine?.category || 'bus';
      const vehicleIconId = `vehicle-icon-${lineCode}`;

      const vehiclesGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: vehicles.map((vehicle: Vehicle) => ({
          type: 'Feature',
          properties: { ...vehicle, type: 'vehicle', iconId: vehicleIconId },
          geometry: { type: 'Point', coordinates: [vehicle.longitude, vehicle.latitude] }
        }))
      };

      const onMapLoad = () => {
        const source = mapInstance.getSource('vehicles-source') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(vehiclesGeoJSON);
          // Update icon if layer exists
          if (mapInstance.getLayer('vehicles-layer')) {
            mapInstance.setLayoutProperty('vehicles-layer', 'icon-image', vehicleIconId);
          }
        } else {
          mapInstance.addSource('vehicles-source', { type: 'geojson', data: vehiclesGeoJSON });
          mapInstance.addLayer({
            id: 'vehicles-layer',
            type: 'symbol',
            source: 'vehicles-source',
            layout: {
              'icon-image': vehicleIconId,
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-rotate': ['get', 'bearing']
            }
          });

          mapInstance.on('click', 'vehicles-layer', (e) => {
            if (e.features && e.features.length > 0) {
              setSelectedItem(e.features[0].properties);
            }
          });
        }
      };

      // Generate and load SVG marker if not already loaded
      if (lineCode && !loadedIconsRef.current.has(vehicleIconId)) {
        const markerDataUrl = createVehicleMarker(lineColor, lineCategory);
        loadSVGMarker(markerDataUrl)
          .then((image) => {
            if (mapInstance) {
              mapInstance.addImage(vehicleIconId, image);
              loadedIconsRef.current.add(vehicleIconId);
              // Display vehicles after icon is loaded
              if (mapInstance.isStyleLoaded()) onMapLoad();
              else mapInstance.on('load', onMapLoad);
            }
          })
          .catch((error) => {
            console.error(`Failed to load SVG marker for ${lineCode}:`, error);
          });
      } else {
        // Icon already loaded, display vehicles immediately
        if (mapInstance.isStyleLoaded()) onMapLoad();
        else mapInstance.on('load', onMapLoad);
      }
    } catch (error) {
      console.error('Error in vehicle useEffect:', error);
    }
  }, [vehicles, lineIcons, setSelectedItem, selectedLine, lines]);

  useEffect(() => {
    if (!isMapLoaded || !lines || !map.current) return;
    const mapInstance = map.current;
    let source = mapInstance.getSource('lines-source') as mapboxgl.GeoJSONSource;

    if (!source) {
      mapInstance.addSource('lines-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      source = mapInstance.getSource('lines-source') as mapboxgl.GeoJSONSource;
      // Add lines layer before stops to ensure it's below them
      const beforeLayer = mapInstance.getLayer('stops-layer') ? 'stops-layer' : undefined;
      mapInstance.addLayer({
        id: 'lines-path-layer',
        type: 'line',
        source: 'lines-source',
        paint: { 'line-color': ['case', ['all', ['has', 'color'], ['!=', ['get', 'color'], null], ['!=', ['get', 'color'], '']], ['get', 'color'], '#808080'], 'line-width': 4 }
      }, beforeLayer);
    } else {
      // If layers already exist, ensure correct order: lines < stops < vehicles
      if (mapInstance.getLayer('stops-layer')) {
        mapInstance.moveLayer('lines-path-layer', 'stops-layer');
      }
    }

    // Clear lines when an itinerary is selected
    const linesToDisplay = selectedJourney
      ? [] // Hide all lines when viewing an itinerary
      : selectedLine
        ? lines.filter((line: Line) => line.id === selectedLine.id)
        : lines.filter((line: Line) => ['metro', 'funicular', 'tram'].includes(line.category));

    const linesGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: linesToDisplay.map((line: Line) => {
        let geometry = null;
        try { geometry = line.trace_code ? JSON.parse(line.trace_code) : null; } catch (e) { console.error('Error parsing geometry for line:', line.line_code, e); }
        return { type: 'Feature', properties: { ...line }, geometry: geometry as Geometry };
      })
    };
    source.setData(linesGeoJSON);
  }, [lines, selectedLine, selectedJourney, isMapLoaded]);

  // Add pricing zones layer
  useEffect(() => {
    if (!isMapLoaded || !pricingZones || !map.current) return;
    const mapInstance = map.current;

    const zonesGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: pricingZones.map(zone => ({
        type: 'Feature',
        properties: { name: zone.name },
        geometry: zone.geojson as any
      }))
    };

    let source = mapInstance.getSource('pricing-zones-source') as mapboxgl.GeoJSONSource;

    if (!source) {
      mapInstance.addSource('pricing-zones-source', { type: 'geojson', data: zonesGeoJSON });

      // Add fill layer (semi-transparent)
      mapInstance.addLayer({
        id: 'pricing-zones-fill',
        type: 'fill',
        source: 'pricing-zones-source',
        paint: {
          'fill-color': '#4A90E2',
          'fill-opacity': 0.05
        }
      }, 'lines-path-layer'); // Add below lines

      // Add border layer
      mapInstance.addLayer({
        id: 'pricing-zones-border',
        type: 'line',
        source: 'pricing-zones-source',
        paint: {
          'line-color': '#4A90E2',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      }, 'lines-path-layer');

      // Add labels
      mapInstance.addLayer({
        id: 'pricing-zones-labels',
        type: 'symbol',
        source: 'pricing-zones-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
        },
        paint: {
          'text-color': '#4A90E2',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2
        }
      });
    } else {
      source.setData(zonesGeoJSON);
    }
  }, [pricingZones, isMapLoaded]);

  // Add selected journey route layers (multi-layer system)
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;
    const mapInstance = map.current;

    // Cleanup function to remove all journey layers
    const cleanupJourneyLayers = () => {
      const layerIds = ['journey-walk', 'journey-bike', 'journey-public-transport', 'journey-steps-layer', 'journey-steps-labels'];
      const sourceIds = ['journey-walk-source', 'journey-bike-source', 'journey-public-transport-source', 'journey-steps-source'];

      layerIds.forEach(layerId => {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId);
        }
      });

      sourceIds.forEach(sourceId => {
        if (mapInstance.getSource(sourceId)) {
          mapInstance.removeSource(sourceId);
        }
      });
    };

    if (!selectedJourney) {
      cleanupJourneyLayers();
      return;
    }

    // Separate sections by type
    const walkSections: any[] = [];
    const bikeSections: any[] = [];
    const publicTransportSections: any[] = [];
    const stepPoints: any[] = [];

    selectedJourney.sections.forEach((section: any, index: number) => {
      if (!section.geojson?.coordinates) return;

      const feature = {
        type: 'Feature',
        properties: {
          stepIndex: index,
          sectionType: section.type,
          lineCode: section.line?.code || null,
          lineColor: section.line?.color || null,
          isCurrentStep: index === currentJourneyStep,
        },
        geometry: {
          type: 'LineString',
          coordinates: section.geojson.coordinates
        }
      };

      // Categorize by type
      if (section.type === 'walk') {
        walkSections.push(feature);
      } else if (section.type === 'bike') {
        bikeSections.push(feature);
      } else if (section.type === 'public-transport') {
        publicTransportSections.push(feature);
      }

      // Add step markers (start point of each section)
      stepPoints.push({
        type: 'Feature',
        properties: {
          stepIndex: index,
          name: section.from.name,
          isCurrentStep: index === currentJourneyStep,
        },
        geometry: {
          type: 'Point',
          coordinates: section.geojson.coordinates[0]
        }
      });

      // Add final destination marker
      if (index === selectedJourney.sections.length - 1) {
        stepPoints.push({
          type: 'Feature',
          properties: {
            stepIndex: index + 1,
            name: section.to.name,
            isCurrentStep: false,
          },
          geometry: {
            type: 'Point',
            coordinates: section.geojson.coordinates[section.geojson.coordinates.length - 1]
          }
        });
      }
    });

    // Create GeoJSON collections
    const walkGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: walkSections };
    const bikeGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: bikeSections };
    const publicTransportGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: publicTransportSections };
    const stepsGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: stepPoints };

    // Add/update walk layer
    if (walkSections.length > 0) {
      if (!mapInstance.getSource('journey-walk-source')) {
        mapInstance.addSource('journey-walk-source', { type: 'geojson', data: walkGeoJSON });
        mapInstance.addLayer({
          id: 'journey-walk',
          type: 'line',
          source: 'journey-walk-source',
          paint: {
            'line-color': '#42A5F5',
            'line-width': ['case', ['get', 'isCurrentStep'], 8, 4],
            'line-opacity': ['case', ['get', 'isCurrentStep'], 1, 0.5],
            'line-dasharray': [2, 2]
          }
        });
      } else {
        (mapInstance.getSource('journey-walk-source') as mapboxgl.GeoJSONSource).setData(walkGeoJSON);
      }
    }

    // Add/update bike layer
    if (bikeSections.length > 0) {
      if (!mapInstance.getSource('journey-bike-source')) {
        mapInstance.addSource('journey-bike-source', { type: 'geojson', data: bikeGeoJSON });
        mapInstance.addLayer({
          id: 'journey-bike',
          type: 'line',
          source: 'journey-bike-source',
          paint: {
            'line-color': '#66BB6A',
            'line-width': ['case', ['get', 'isCurrentStep'], 8, 5],
            'line-opacity': ['case', ['get', 'isCurrentStep'], 1, 0.6]
          }
        });
      } else {
        (mapInstance.getSource('journey-bike-source') as mapboxgl.GeoJSONSource).setData(bikeGeoJSON);
      }
    }

    // Add/update public transport layer
    if (publicTransportSections.length > 0) {
      if (!mapInstance.getSource('journey-public-transport-source')) {
        mapInstance.addSource('journey-public-transport-source', { type: 'geojson', data: publicTransportGeoJSON });
        mapInstance.addLayer({
          id: 'journey-public-transport',
          type: 'line',
          source: 'journey-public-transport-source',
          paint: {
            'line-color': ['concat', '#', ['get', 'lineColor']],
            'line-width': ['case', ['get', 'isCurrentStep'], 8, 6],
            'line-opacity': ['case', ['get', 'isCurrentStep'], 1, 0.7]
          }
        });
      } else {
        (mapInstance.getSource('journey-public-transport-source') as mapboxgl.GeoJSONSource).setData(publicTransportGeoJSON);
      }
    }

    // Add/update step markers
    if (!mapInstance.getSource('journey-steps-source')) {
      mapInstance.addSource('journey-steps-source', { type: 'geojson', data: stepsGeoJSON });

      // Add circle layer for markers
      mapInstance.addLayer({
        id: 'journey-steps-layer',
        type: 'circle',
        source: 'journey-steps-source',
        paint: {
          'circle-radius': ['case', ['get', 'isCurrentStep'], 12, 8],
          'circle-color': ['case', ['get', 'isCurrentStep'], '#FF6B00', '#FFFFFF'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FF6B00',
          'circle-opacity': 1
        }
      });

      // Add text labels with step numbers
      mapInstance.addLayer({
        id: 'journey-steps-labels',
        type: 'symbol',
        source: 'journey-steps-source',
        layout: {
          'text-field': ['to-string', ['+', ['get', 'stepIndex'], 1]],
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold']
        },
        paint: {
          'text-color': ['case', ['get', 'isCurrentStep'], '#FFFFFF', '#FF6B00'],
          'text-halo-color': ['case', ['get', 'isCurrentStep'], '#FF6B00', '#FFFFFF'],
          'text-halo-width': 1
        }
      });
    } else {
      (mapInstance.getSource('journey-steps-source') as mapboxgl.GeoJSONSource).setData(stepsGeoJSON);
    }

    // Zoom to current step or entire journey
    if (currentJourneyStep !== null && selectedJourney.sections[currentJourneyStep]?.geojson?.coordinates) {
      const currentSectionCoords = selectedJourney.sections[currentJourneyStep].geojson.coordinates;
      const bounds = new mapboxgl.LngLatBounds();
      currentSectionCoords.forEach((coord: number[]) => {
        bounds.extend(coord as [number, number]);
      });
      mapInstance.fitBounds(bounds, { padding: 100, duration: 1000 });
    } else if (selectedJourney.sections.length > 0) {
      // Zoom to entire journey
      const bounds = new mapboxgl.LngLatBounds();
      selectedJourney.sections.forEach((section: any) => {
        if (section.geojson?.coordinates) {
          section.geojson.coordinates.forEach((coord: number[]) => {
            bounds.extend(coord as [number, number]);
          });
        }
      });
      mapInstance.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [selectedJourney, currentJourneyStep, isMapLoaded]);

  const anyError = errorStops || errorVehicles || errorLines || errorLineIcons;
  const anyLoading = selectedLine
    ? isLoadingStops || isLoadingVehicles || isLoadingLines || isLoadingLineIcons
    : isLoadingLines || isLoadingLineIcons;

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {anyLoading && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1500 }}>
          <CircularProgress />
        </Box>
      )}
      {anyError && (
        <Alert severity="error" sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1500 }}>
          Erreur lors du chargement des données.
        </Alert>
      )}
      <Box ref={mapContainerRef} sx={{ width: '100%', height: '100%', zIndex: 0 }} />
      <StopDetailsModal
        stop={modalStop}
        onClose={() => { setModalAnchorPosition(null); setModalStop(null); }}
        lineIcons={lineIcons}
        anchorPosition={modalAnchorPosition}
      />
    </Box>
  );
}

export default MapComponent;
