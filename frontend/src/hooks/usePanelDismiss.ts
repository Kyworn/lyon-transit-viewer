import { useEffect } from 'react';
import { useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

const SWIPE_CLOSE_DISTANCE = 80; // px dragged down
const SWIPE_CLOSE_VELOCITY = 400; // px/s flick

type SwipeResult = {
  panelProps: Record<string, any>;
  handleProps: { onPointerDown?: (e: ReactPointerEvent) => void; style?: CSSProperties };
};

/**
 * Swipe-down-to-close on mobile, initiated ONLY from the grab handle.
 * Spread `panelProps` onto the panel's `motion` element and `handleProps` onto
 * the grab-handle element. `dragListener:false` means the panel body never
 * captures drag, so its scroll area keeps working (regression fix).
 * On desktop (`enabled=false`) both are no-ops.
 */
export function useSwipeToClose(enabled: boolean, onClose: () => void): SwipeResult {
  const controls = useDragControls();
  if (!enabled) return { panelProps: {}, handleProps: {} };
  return {
    panelProps: {
      drag: 'y' as const,
      dragControls: controls,
      dragListener: false,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.6 },
      onDragEnd: (_e: unknown, info: PanInfo) => {
        if (info.offset.y > SWIPE_CLOSE_DISTANCE || info.velocity.y > SWIPE_CLOSE_VELOCITY) onClose();
      },
    },
    handleProps: {
      onPointerDown: (e: ReactPointerEvent) => controls.start(e),
      style: { touchAction: 'none' as const, cursor: 'grab' as const },
    },
  };
}

/**
 * Shared close behavior for every overlay panel.
 * Wires the Escape key to `onClose` while `open` is true. Backdrop-click stays
 * in each panel's markup but calls the same `onClose`, so every panel dismisses
 * identically (X button + backdrop + Escape, plus swipe-down on mobile).
 */
export function usePanelDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}
