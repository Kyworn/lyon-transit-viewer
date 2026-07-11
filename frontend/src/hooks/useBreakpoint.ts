import { useEffect, useState } from 'react';
import { MOBILE_MAX } from '../constants/responsive';

const QUERY = `(max-width: ${MOBILE_MAX}px)`;

/**
 * Single source of truth for responsive panel behavior.
 * Returns `{ isMobile }`, reactive to viewport resize / rotation.
 * Replaces the four ad-hoc `@media` thresholds scattered across components.
 */
export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches); // sync in case it changed before effect ran
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return { isMobile };
}
