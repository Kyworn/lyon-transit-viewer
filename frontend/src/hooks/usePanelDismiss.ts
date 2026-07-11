import { useEffect } from 'react';

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
