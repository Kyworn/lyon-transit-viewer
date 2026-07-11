import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { usePanelDismiss } from '../../hooks/usePanelDismiss';

interface LayerToggleProps {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  color: string;
  icon: React.ReactNode;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ label, description, active, onToggle, color, icon }) => (
  <button
    onClick={onToggle}
    className="layer-toggle-row"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 14px',
      width: '100%',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${active ? color + '55' : 'var(--border-light)'}`,
      background: active
        ? `linear-gradient(120deg, ${color}18 0%, transparent 100%)`
        : 'rgba(255, 255, 255, 0.02)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      transition: 'all var(--transition-fast)',
      textAlign: 'left',
    }}
  >
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? color + '22' : 'rgba(255, 255, 255, 0.04)',
        color: active ? color : 'var(--text-secondary)',
        flexShrink: 0,
        transition: 'all var(--transition-fast)',
        boxShadow: active ? `0 0 12px ${color}33` : 'none',
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: active ? color : 'var(--text-primary)' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
        {description}
      </div>
    </div>
    <div
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '9999px',
        position: 'relative',
        background: active ? color : 'rgba(255, 255, 255, 0.1)',
        transition: 'background var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: active ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left var(--transition-fast)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  </button>
);

export default function LayersPanel() {
  const {
    layersPanelOpen,
    setLayersPanelOpen,
    vehiclesVisible,
    toggleVehicles,
    stopsVisible,
    toggleStops,
    linesVisible,
    toggleLines,
    velovVisible,
    toggleVelov,
    autopartageVisible,
    toggleAutopartage,
    toiletsVisible,
    toggleToilets,
    vehiclesHeatmapVisible,
    toggleVehiclesHeatmap,
    nightBusOnly,
    toggleNightBusOnly,
  } = useAppStore();

  usePanelDismiss(layersPanelOpen, () => setLayersPanelOpen(false));

  const transit = [
    {
      label: 'Véhicules TCL',
      description: 'Bus, métro, tram en temps réel',
      active: vehiclesVisible,
      onToggle: toggleVehicles,
      color: 'var(--accent)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M8 6v6m8-6v6M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1l-1 2h-2l-1-2H9l-1 2H6l-1-2H4a2 2 0 0 1-2-2V6h2z" />
        </svg>
      ),
    },
    {
      label: 'Arrêts',
      description: 'Stations métro/tram/bus',
      active: stopsVisible,
      onToggle: toggleStops,
      color: 'var(--primary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </svg>
      ),
    },
    {
      label: 'Tracés lignes',
      description: 'Parcours des lignes sur carte',
      active: linesVisible,
      onToggle: toggleLines,
      color: 'var(--secondary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
      ),
    },
    {
      label: 'Heatmap densité',
      description: 'Concentration des véhicules en temps réel',
      active: vehiclesHeatmapVisible,
      onToggle: toggleVehiclesHeatmap,
      color: '#ec4899',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="7" opacity="0.5" />
          <circle cx="12" cy="12" r="11" opacity="0.25" />
        </svg>
      ),
    },
    {
      label: 'Bus de nuit uniquement',
      description: 'Filtre lignes Pleine Lune (PL1-PL5)',
      active: nightBusOnly,
      onToggle: toggleNightBusOnly,
      color: '#8b5cf6',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
  ];

  const mobility = [
    {
      label: "Vélo'v",
      description: 'Stations vélos en libre service',
      active: velovVisible,
      onToggle: toggleVelov,
      color: '#22c55e',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
        </svg>
      ),
    },
    {
      label: 'Autopartage',
      description: 'Stations Citiz LPA / LéO&Go',
      active: autopartageVisible,
      onToggle: toggleAutopartage,
      color: '#f59e0b',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
          <circle cx="6.5" cy="16.5" r="2.5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
        </svg>
      ),
    },
    {
      label: 'Toilettes publiques',
      description: 'Sanitaires gratuits Métropole',
      active: toiletsVisible,
      onToggle: toggleToilets,
      color: '#06b6d4',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="8" cy="5" r="2" />
          <circle cx="16" cy="5" r="2" />
          <path d="M5 22V14L7 9h2v13M19 22V14L17 9h-2v13" />
          <line x1="12" y1="3" x2="12" y2="22" />
        </svg>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {layersPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setLayersPanelOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 199,
              background: 'transparent',
            }}
          />
          <motion.div
            initial={{ y: 16, x: '-50%', opacity: 0, scale: 0.98 }}
            animate={{ y: 0, x: '-50%', opacity: 1, scale: 1 }}
            exit={{ y: 16, x: '-50%', opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: '96px',
              left: '50%',
              width: 'min(360px, calc(100vw - 32px))',
              zIndex: 200,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(10, 10, 12, 0.92)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.3px' }}>
                  Couches de la carte
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Choisir ce qui s'affiche
                </span>
              </div>
              <button
                onClick={() => setLayersPanelOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
                Transport TCL
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {transit.map((item) => <LayerToggle key={item.label} {...item} />)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
                Mobilités douces
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {mobility.map((item) => <LayerToggle key={item.label} {...item} />)}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
