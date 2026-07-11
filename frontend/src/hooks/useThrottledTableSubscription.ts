import { useEffect, useRef } from 'react';

type Cleanup = () => void;

/**
 * Subscribe to a SpacetimeDB table with insert/update/delete callbacks
 * throttled to at most one invocation every `minIntervalMs`. Re-fires after
 * trailing edge if events arrived during the throttle window. A backup poll
 * runs every `backupIntervalMs` to catch missed updates.
 *
 * The `subscribe` callback registers handlers and must return a cleanup
 * function that removes them. `onUpdate` is invoked synchronously once,
 * then on each throttled event.
 */
export function useThrottledTableSubscription(
  enabled: boolean,
  onUpdate: () => void,
  subscribe: (handler: () => void) => Cleanup,
  deps: ReadonlyArray<unknown>,
  minIntervalMs = 500,
  backupIntervalMs = 15000,
) {
  // Stable refs so changing handlers don't invalidate the effect.
  const onUpdateRef = useRef(onUpdate);
  const subscribeRef = useRef(subscribe);
  onUpdateRef.current = onUpdate;
  subscribeRef.current = subscribe;

  useEffect(() => {
    if (!enabled) return;

    let lastRan = 0;
    let trailingTimer: number | null = null;

    const fire = () => {
      lastRan = Date.now();
      onUpdateRef.current();
    };

    const throttled = () => {
      const now = Date.now();
      const elapsed = now - lastRan;
      if (!lastRan || elapsed >= minIntervalMs) {
        fire();
      } else {
        if (trailingTimer) window.clearTimeout(trailingTimer);
        trailingTimer = window.setTimeout(fire, minIntervalMs - elapsed);
      }
    };

    fire();
    const cleanup = subscribeRef.current(throttled);
    const interval = window.setInterval(throttled, backupIntervalMs);

    return () => {
      if (trailingTimer) window.clearTimeout(trailingTimer);
      window.clearInterval(interval);
      try { cleanup(); } catch {}
    };
  }, [enabled, ...deps]);
}
