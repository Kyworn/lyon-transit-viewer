import React, { useMemo } from 'react';
import { Stop, LineIcon } from '../../types';
import { useNextPassagesByLine } from '../../hooks/useNextPassages';
import { useLines } from '../../hooks/useLines';
import { useAppStore } from '../../stores/useAppStore';
import FavoriteButton from '../ui/FavoriteButton';
import { useVelov } from '../../hooks/useVelov';
import { motion, AnimatePresence } from 'framer-motion';

interface StopDetailsModalProps {
  stop: Stop | null;
  onClose: () => void;
  lineIcons: LineIcon[] | null | undefined;
  anchorPosition: { top: number; left: number } | null;
  allStops?: Stop[];
  onSelectStop?: (stop: Stop) => void;
}

const StopDetailsModal: React.FC<StopDetailsModalProps> = ({ 
  stop, 
  onClose, 
  lineIcons, 
  allStops, 
  onSelectStop 
}) => {
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useAppStore();

  const { data: nextPassages, isLoading: isLoadingPassages } = useNextPassagesByLine(
    stop?.id || null,
    !!stop,
    selectedLine?.line_sort_code,
    selectedLine?.line_code,
    selectedLine?.direction,
    selectedLine?.destination_name
  );
  const { data: lines } = useLines({ includeTrace: false });
  const { data: velovStations } = useVelov(!!stop);

  // 3 nearest Vélo'v within ~500m (Euclidean approx, ok for short range)
  const nearbyVelov = useMemo(() => {
    if (!stop || !velovStations.length) return [] as typeof velovStations;
    const R = 6371000; // m
    const toRad = (d: number) => (d * Math.PI) / 180;
    const lat0 = toRad(stop.latitude);
    const ranked = velovStations
      .map((v) => {
        const dLat = toRad(v.latitude - stop.latitude);
        const dLng = toRad(v.longitude - stop.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat0) * Math.cos(toRad(v.latitude)) * Math.sin(dLng / 2) ** 2;
        const dist = 2 * R * Math.asin(Math.sqrt(a));
        return { v, dist };
      })
      .filter((x) => x.dist <= 500)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
    return ranked;
  }, [stop, velovStations]);

  const formatEtaMinutes = (iso?: string | null) => {
    if (!iso) return "Imminent";
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "Imminent";
    const deltaMs = ts - Date.now();
    if (deltaMs <= 30_000) return "Imminent";
    const mins = Math.max(1, Math.ceil(deltaMs / 60000));
    return mins === 1 ? "1 min" : `${mins} min`;
  };

  const canonicalLineCode = (value?: string | null) =>
    (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NAVI/, 'NAV').trim();

  const extractLineCode = (service: string) => {
    const raw = (service || '').trim();
    if (!raw) return '';
    const leading = raw.split(':')[0]?.trim() || '';
    if (/^(?:[ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})$/i.test(leading)) return canonicalLineCode(leading);
    const match = raw.match(/(?:^|::)([ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})(?::|$)/i);
    return canonicalLineCode(match?.[1] || '');
  };

  const servingLines = useMemo(() => {
    if (!stop?.service_info) return [];
    const byCode = new Map<string, string>();
    stop.service_info.split(',').map(s => s.trim()).filter(Boolean).forEach(raw => {
      const code = extractLineCode(raw);
      if (code) byCode.set(code, code);
    });

    return Array.from(byCode.entries()).map(([canonicalCode, displayCode]) => {
      const line = lines?.find(l => canonicalLineCode(l.line_sort_code) === canonicalCode);
      return { 
        code: displayCode, 
        canonicalCode, 
        color: line?.color || '#475569', 
        destination: line?.destination_name || null 
      };
    });
  }, [stop, lines]);

  const displayedPassages = useMemo(() => {
    if (!nextPassages) return [];
    const now = Date.now();
    const active = nextPassages.filter(p => {
      if (!p.expected_arrival_time) return true;
      return new Date(p.expected_arrival_time).getTime() >= now - 60_000;
    });
    if (active.length > 0) {
      return active.slice(0, 6);
    }
    return nextPassages.slice(0, 6);
  }, [nextPassages]);

  if (!stop) return null;

  const accentColor = selectedLine?.color || 'var(--primary)';

  const handleCenter = () => {
    setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="stop-details-modal-wrapper"
        style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          width: '420px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .stop-details-modal-wrapper {
            scrollbar-width: none;
          }
          .stop-details-modal-wrapper::-webkit-scrollbar {
            display: none;
          }
          @media (max-width: 768px) {
            .stop-details-modal-wrapper {
              position: fixed !important;
              top: auto !important;
              right: 0 !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              max-height: 80vh !important;
              border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important;
              border-bottom: none !important;
            }
          }
          .stop-details-header-aura {
            position: absolute;
            top: 0; left: 0; right: 0; height: 160px;
            background: radial-gradient(circle at 50% 0%, var(--aura-color, rgba(139, 92, 246, 0.15)), transparent 70%);
            pointer-events: none;
            z-index: 0;
            border-top-left-radius: inherit;
            border-top-right-radius: inherit;
          }
          .btn-action-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex: 1;
            padding: 10px 16px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-light);
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .btn-action-primary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.15);
          }
          .btn-action-route {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex: 1;
            padding: 10px 16px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--accent-color, var(--primary));
            background: var(--aura-color, rgba(139, 92, 246, 0.1));
            border: 1px solid var(--aura-color-border, rgba(139, 92, 246, 0.2));
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .btn-action-route:hover {
            background: var(--aura-color-hover, rgba(139, 92, 246, 0.18));
            border-color: var(--aura-color-border-hover, rgba(139, 92, 246, 0.3));
          }
          .stop-badge-circle {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.8rem;
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
          }
          .stop-badge-circle:hover {
            transform: scale(1.12) translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          }
          .passage-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-light);
            transition: all var(--transition-fast);
          }
          .passage-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--aura-color-border, rgba(139, 92, 246, 0.3));
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .live-ping-dot {
            width: 6px;
            height: 6px;
            border-radius: var(--radius-full);
            background-color: var(--secondary);
            animation: live-ping 2s infinite ease-in-out;
          }
          @keyframes live-ping {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.4); }
          }
        ` }} />

        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', height: '100%', padding: '24px' }}>
          {/* Header Ambient Glow */}
          <div className="stop-details-header-aura" style={{ 
            ['--aura-color' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.15)' : `${accentColor}24` 
          }} />

          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: accentColor, 
                  boxShadow: `0 0 10px ${accentColor}` 
                }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Station
                </span>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                {stop.name}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                {stop.municipality} {stop.zone && `• Zone ${stop.zone}`}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FavoriteButton type="stop" id={stop.id} size={16} />
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
            <button className="btn-action-primary" onClick={handleCenter}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              Centrer
            </button>
            <button 
              className="btn-action-route"
              style={{
                ['--accent-color' as any]: accentColor,
                ['--aura-color' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.1)' : `${accentColor}18`,
                ['--aura-color-border' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.2)' : `${accentColor}33`,
                ['--aura-color-hover' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.18)' : `${accentColor}29`,
                ['--aura-color-border-hover' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.3)' : `${accentColor}4D`,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Itinéraire
            </button>
          </div>

          {nearbyVelov.length > 0 && (
            <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                Vélo'v à proximité
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {nearbyVelov.map(({ v, dist }) => {
                  const isOpen = v.status === 'OPEN';
                  const ratio = v.bike_stands > 0 ? v.available_bikes / v.bike_stands : 0;
                  const tone = !isOpen ? '#64748b' : ratio === 0 ? 'var(--danger)' : ratio < 0.3 ? 'var(--warning)' : 'var(--secondary)';
                  return (
                    <div key={v.number} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${tone}1f`, border: `1px solid ${tone}55`, color: tone,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
                          <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {Math.round(dist)} m
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>
                          {v.available_bikes}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>/ {v.bike_stands}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Serving Lines Section */}
          <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
              Lignes à cet arrêt
            </span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {servingLines.length > 0 ? (
                servingLines.map((line) => (
                  <div 
                    key={line.canonicalCode}
                    className="stop-badge-circle"
                    title={`Vers ${line.destination || '...'}`}
                    style={{ backgroundColor: line.color }}
                  >
                    {line.code}
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucune ligne répertoriée</span>
              )}
            </div>
          </div>

          {/* Next Departures Timeline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Prochains Départs
              </span>
              {!isLoadingPassages && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="live-ping-dot" />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--secondary)' }}>Mise à jour en direct</span>
                </div>
              )}
            </div>

            {isLoadingPassages ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
                <div className="spinner" style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid rgba(255, 255, 255, 0.05)',
                  borderTopColor: accentColor,
                  borderRadius: '50%',
                  animation: 'spin-slow 1s linear infinite'
                }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mise à jour des horaires...</span>
              </div>
            ) : displayedPassages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayedPassages.map((passage, idx) => {
                  const lineIcon = lineIcons?.find(li => li.code_ligne === passage.published_line_name);
                  return (
                    <motion.div
                      key={`${passage.published_line_name}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2 }}
                      className="passage-card"
                      style={{
                        ['--aura-color-border' as any]: accentColor.startsWith('var') ? 'rgba(139, 92, 246, 0.25)' : `${accentColor}33`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {lineIcon ? (
                          <img 
                            src={`/icons/${lineIcon.picto_ligne}`} 
                            alt={passage.published_line_name}
                            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                const fb = parent.querySelector('.line-fallback');
                                if (fb) (fb as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className="line-fallback"
                          style={{ 
                            display: lineIcon ? 'none' : 'flex', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '6px', 
                            backgroundColor: accentColor.startsWith('var') ? 'rgba(255,255,255,0.06)' : `${accentColor}24`, 
                            border: `1px solid ${accentColor.startsWith('var') ? 'var(--border-light)' : `${accentColor}3B`}`,
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: 'white'
                          }}
                        >
                          {passage.published_line_name}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {passage.line_destination?.replace('ActIV:StopArea:', '') || 'Direction Lyon'}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
                            {passage.scheduled_arrival_time?.slice(0, 5)} • Planifié
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: accentColor }}>
                          {formatEtaMinutes(passage.expected_arrival_time)}
                        </span>
                        {passage.expected_arrival_time && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 600 }}>Tps Réel</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '36px 0', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucun passage prochainement</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StopDetailsModal;
