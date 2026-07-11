import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpacetime } from '../../spacetime/useSpacetime';
import { useAppStore } from '../../stores/useAppStore';

/**
 * Branded loading overlay shown until the map has actually rendered.
 * Deliberately does NOT subscribe to individual tables: a late-mounting
 * consumer misses the initial insert burst, so per-table counts stall.
 * Gates on `mapLoaded` (set on MapLibre's first `idle`) so the loader never
 * finishes before the map is visibly ready. Hard fallback so it can't trap
 * the user. All animation is transform/opacity (GPU, no jank).
 */
export default function Splash() {
  const { connected } = useSpacetime();
  const mapLoaded = useAppStore((s) => s.mapLoaded);
  const [hidden, setHidden] = useState(false);

  // Fade out once the map has rendered its first frame.
  useEffect(() => {
    if (!mapLoaded) return;
    const t = window.setTimeout(() => setHidden(true), 300);
    return () => window.clearTimeout(t);
  }, [mapLoaded]);

  // Hard fallback: never trap the user behind the splash.
  useEffect(() => {
    const t = window.setTimeout(() => setHidden(true), 12000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            background: `
              radial-gradient(900px circle at 8% 12%, rgba(139, 92, 246, 0.14), transparent 50%),
              radial-gradient(700px circle at 92% 85%, rgba(16, 185, 129, 0.10), transparent 50%),
              var(--bg-base)
            `,
          }}
        >
          {/* Pulsing brand mark — transform/opacity only (GPU, no repaint) */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <motion.div
              animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.9, 1.25, 0.9] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0, borderRadius: 20,
                background: 'var(--primary)', filter: 'blur(20px)',
                willChange: 'transform, opacity',
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'relative', width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                willChange: 'transform',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h1" />
                <circle cx="16" cy="17" r="2" />
                <circle cx="8" cy="17" r="2" />
              </svg>
            </motion.div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'Outfit', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              Lyon Transit
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {connected ? 'Chargement du réseau…' : 'Connexion au réseau TCL…'}
            </p>
          </div>

          {/* Indeterminate shimmer bar — pure transform (GPU) */}
          <div style={{ position: 'relative', width: 220, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              animate={{ x: ['-100%', '260%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', borderRadius: 2,
                background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)',
                willChange: 'transform',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
