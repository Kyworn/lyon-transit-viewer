import { useEffect, useState } from 'react';

const WFS_BASE = 'https://data.grandlyon.com/geoserver/wfs';

/**
 * Fetch a DataGrandLyon WFS layer as GeoJSON, straight from the browser.
 * These layers are served with `access-control-allow-origin: *` and need no
 * API key, so they skip the SpacetimeDB ingestion path entirely.
 */
export const useWfsGeoJson = (typename: string, enabled: boolean) => {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled || data) return;
    const params = new URLSearchParams({
      SERVICE: 'WFS',
      VERSION: '2.0.0',
      request: 'GetFeature',
      typename,
      outputFormat: 'application/json',
      SRSNAME: 'EPSG:4171',
    });
    const controller = new AbortController();
    fetch(`${WFS_BASE}?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`WFS ${res.status}`))))
      .then((json) => setData(json))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(`WFS ${typename} failed:`, err);
      });
    return () => controller.abort();
  }, [typename, enabled, data]);

  return data;
};
