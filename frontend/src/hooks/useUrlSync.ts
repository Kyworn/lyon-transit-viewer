import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Two-way sync between app state and URL query params.
 * - Reads initial state from URL on mount (zoom, center, line)
 * - Writes URL when zoom/center/selectedLine change (debounced)
 */
export function useUrlSync() {
  const {
    zoom,
    centerCoordinates,
    selectedLine,
    setZoom,
    setCenterCoordinates,
  } = useAppStore();
  const didInit = useRef(false);

  // Init from URL once
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const params = new URLSearchParams(window.location.search);
    const z = Number(params.get('z'));
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    if (Number.isFinite(z) && z > 0) setZoom(z);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      setCenterCoordinates({ lng, lat });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write to URL on changes (debounced)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (centerCoordinates) {
        params.set('lat', centerCoordinates.lat.toFixed(5));
        params.set('lng', centerCoordinates.lng.toFixed(5));
      }
      if (zoom) params.set('z', zoom.toFixed(2));
      if (selectedLine?.line_sort_code) params.set('line', selectedLine.line_sort_code);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', next);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [zoom, centerCoordinates, selectedLine]);
}

export function buildShareUrl(): string {
  return window.location.href;
}

export async function copyShareUrl(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildShareUrl());
    return true;
  } catch {
    return false;
  }
}
