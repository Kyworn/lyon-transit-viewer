import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { useLines } from '../../hooks/useLines';
import { useStops } from '../../hooks/useStops';
import { usePanelDismiss } from '../../hooks/usePanelDismiss';

export default function FavoritesPanel() {
  const {
    favoritesPanelOpen,
    setFavoritesPanelOpen,
    favoriteLines,
    favoriteStops,
    removeFavoriteLine,
    removeFavoriteStop,
    setSelectedLine,
    setSelectedStop,
    setCenterCoordinates,
    setZoom,
  } = useAppStore();
  const { data: lines } = useLines({ enabled: favoritesPanelOpen });
  const { data: stops } = useStops(favoritesPanelOpen);
  usePanelDismiss(favoritesPanelOpen, () => setFavoritesPanelOpen(false));

  const favLines = lines.filter((l) => favoriteLines.includes(l.line_sort_code || l.id));
  const favStops = stops.filter((s) => favoriteStops.includes(s.id));

  return (
    <AnimatePresence>
      {favoritesPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFavoritesPanelOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'transparent' }}
          />
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 96,
              left: 24,
              width: 'min(360px, calc(100vw - 48px))',
              maxHeight: 'calc(100vh - 160px)',
              zIndex: 200,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: 'rgba(10,10,12,0.92)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.3px' }}>
                  Mes favoris
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {favLines.length + favStops.length} élément{favLines.length + favStops.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setFavoritesPanelOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {favLines.length === 0 && favStops.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                ⭐ Ajoute des lignes ou arrêts en favoris pour les retrouver ici
              </div>
            )}

            {favLines.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Lignes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {favLines.map((line) => (
                    <button
                      key={line.id}
                      onClick={() => {
                        setSelectedLine(line);
                        setFavoritesPanelOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                        background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
                        background: line.color ? `#${line.color.replace('#','')}` : '#475569', color: '#fff', minWidth: 36, textAlign: 'center',
                      }}>{line.line_sort_code || line.line_code}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{line.line_name || line.destination_name || '—'}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavoriteLine(line.line_sort_code || line.id); }}
                        style={{ background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {favStops.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Arrêts
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {favStops.map((stop) => (
                    <button
                      key={stop.id}
                      onClick={() => {
                        setSelectedStop(stop);
                        setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
                        setZoom(16);
                        setFavoritesPanelOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                        background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ color: '#facc15' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{stop.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{stop.municipality || 'Lyon'}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavoriteStop(stop.id); }}
                        style={{ background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
