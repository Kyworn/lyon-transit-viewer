import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../stores/useAppStore';
import { calculatePathDistance, formatDistance, formatDuration, getWalkingInstructions } from '../../utils/geoUtils';

interface RouteSection {
  type: string;
  arrival: string;
  departure: string;
  from: { name: string };
  to: { name: string };
  line?: {
    code: string;
    color: string;
    mode: string;
  };
  headsign?: string;
  waitingTime?: number;
  geojson?: {
    type: string;
    coordinates: number[][];
  };
}

interface Journey {
  id: string;
  arrival: string;
  departure: string;
  sections: RouteSection[];
}

const JourneyNavigator: React.FC = () => {
  const { selectedJourney, setSelectedJourney, currentJourneyStep, setCurrentJourneyStep } = useAppStore();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (selectedJourney && currentJourneyStep === null) {
      setCurrentJourneyStep(0);
    }
  }, [selectedJourney, currentJourneyStep, setCurrentJourneyStep]);

  if (!selectedJourney || currentJourneyStep === null) return null;

  const journey: Journey = selectedJourney;
  const sections = journey.sections || [];
  if (sections.length === 0) return null;

  const safeStep = Math.min(Math.max(currentJourneyStep, 0), sections.length - 1);
  const currentSection = sections[safeStep];

  const totalDurationMs = new Date(journey.arrival).getTime() - new Date(journey.departure).getTime();
  const publicSteps = sections.filter((s) => s.type === 'public-transport').length;
  const transfers = Math.max(0, publicSteps - 1);
  const walkDistanceMeters = sections
    .filter((s) => s.type === 'walk' && s.geojson?.coordinates?.length)
    .reduce((sum, s) => sum + calculatePathDistance(s.geojson!.coordinates), 0);
  
  const stats = {
    totalDuration: formatDuration(totalDurationMs),
    transfers,
    walkDistance: formatDistance(walkDistanceMeters),
    totalSteps: sections.length,
  };

  const formatTime = (isoString: string): string =>
    new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const getModeColor = (section: RouteSection): string => {
    if (section.type === 'walk') return 'var(--accent)';
    if (section.type === 'bike') return 'var(--secondary)';
    if (section.type === 'waiting') return 'var(--warning)';
    if (section.line?.color) return `#${section.line.color}`;
    return 'var(--accent)';
  };

  const getModeEmoji = (section: RouteSection) => {
    if (section.type === 'walk') return '🚶';
    if (section.type === 'bike') return '🚴';
    if (section.type === 'waiting') return '⏳';

    const mode = section.line?.mode;
    if (mode === 'metro') return '🚇';
    if (mode === 'tramway' || mode === 'tram') return '🚋';
    if (mode === 'funicular') return '🚠';
    if (mode === 'boat' || mode === 'fluvial') return '🚢';
    return '🚌';
  };

  const getSectionTitle = (section: RouteSection): string => {
    if (section.type === 'walk') return 'Marche';
    if (section.type === 'bike') return 'Vélo';
    if (section.type === 'waiting') return 'Attente';
    if (section.line?.code) return `Ligne ${section.line.code}`;
    return 'Transport';
  };

  const getSectionSubtitle = (section: RouteSection): string => {
    if (section.type === 'walk') return getWalkingInstructions(section);
    if (section.type === 'bike') return `Vélo vers ${section.to.name}`;
    if (section.type === 'waiting') return `Attente ${formatDuration((section.waitingTime || 0) * 1000)}`;
    return `Direction ${section.headsign || section.to.name}`;
  };

  const getSectionDuration = (section: RouteSection): string => {
    const dep = new Date(section.departure).getTime();
    const arr = new Date(section.arrival).getTime();
    return formatDuration(Math.max(0, arr - dep));
  };

  const getSectionDistance = (section: RouteSection): string | null => {
    if ((section.type === 'walk' || section.type === 'bike') && section.geojson?.coordinates?.length) {
      return formatDistance(calculatePathDistance(section.geojson.coordinates));
    }
    return null;
  };

  const handleClose = () => {
    setSelectedJourney(null);
    setCurrentJourneyStep(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="journey-navigator-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          width: '520px',
          zIndex: 110,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .journey-navigator-container {
              left: 12px !important;
              right: 12px !important;
              bottom: 12px !important;
              width: auto !important;
            }
          }
          .navigator-stats-row {
            display: flex;
            gap: 6px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          .navigator-stat-tag {
            font-size: 0.7rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: var(--radius-full);
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-light);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .navigator-steps-list {
            max-height: 280px;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          @media (max-width: 768px) {
            .navigator-steps-list {
              max-height: 38vh !important;
            }
          }
          .step-card {
            display: flex;
            gap: 14px;
            padding: 14px;
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-light);
            transition: all var(--transition-fast);
            cursor: pointer;
          }
          .step-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
          }
          .step-card.active {
            background: var(--glow-step-bg, rgba(6, 182, 212, 0.08));
            border-color: var(--step-color, var(--accent));
          }
          .step-connector-line {
            width: 2px;
            background: rgba(255, 255, 255, 0.08);
            position: absolute;
            top: 22px;
            bottom: -22px;
            left: 5px;
          }
          .btn-navigator-prev, .btn-navigator-next {
            flex: 1;
            padding: 10px;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: 1px solid var(--border-light);
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .btn-navigator-prev {
            background: rgba(255, 255, 255, 0.02);
            color: var(--text-primary);
          }
          .btn-navigator-prev:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.15);
          }
          .btn-navigator-next {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
            box-shadow: 0 4px 12px var(--accent-glow);
          }
          .btn-navigator-next:hover:not(:disabled) {
            background: var(--accent-hover);
          }
          .btn-navigator-prev:disabled, .btn-navigator-next:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
        ` }} />

        <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(6, 182, 212, 0.25)', boxShadow: '0 16px 48px rgba(2, 6, 23, 0.75)' }}>
          {/* Header Panel */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            background: 'rgba(15, 22, 40, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Itinéraire Actif
              </h4>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Départ {formatTime(journey.departure)} • Arrivée {formatTime(journey.arrival)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setExpanded(!expanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg 
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--transition-fast)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <button 
                onClick={handleClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ padding: '0 20px 10px 20px', background: 'rgba(15, 22, 40, 0.4)' }}>
            <div className="navigator-stats-row">
              <span className="navigator-stat-tag">
                ⏳ {stats.totalDuration}
              </span>
              <span className="navigator-stat-tag">
                🔄 {stats.transfers} correspondance{stats.transfers > 1 ? 's' : ''}
              </span>
              <span className="navigator-stat-tag">
                🚶 {stats.walkDistance} marche
              </span>
            </div>
          </div>

          {expanded && (
            <>
              {/* Steps List */}
              <div className="navigator-steps-list">
                {sections.map((section, index) => {
                  const active = index === safeStep;
                  const color = getModeColor(section);
                  return (
                    <div 
                      key={`${section.type}-${index}`}
                      className={`step-card ${active ? 'active' : ''}`}
                      onClick={() => setCurrentJourneyStep(index)}
                      style={{
                        ['--step-color' as any]: color,
                        ['--glow-step-bg' as any]: color.startsWith('var') ? 'rgba(6, 182, 212, 0.08)' : `${color}14`
                      }}
                    >
                      {/* Left Dot timeline */}
                      <div style={{ position: 'relative', width: '12px', display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: `0 0 0 3px ${color.startsWith('var') ? 'rgba(6, 182, 212, 0.2)' : `${color}3B`}`,
                          zIndex: 2
                        }} />
                        {index < sections.length - 1 && (
                          <div className="step-connector-line" />
                        )}
                      </div>

                      {/* Right content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px',
                              backgroundColor: color.startsWith('var') ? 'rgba(255,255,255,0.06)' : `${color}24`,
                              border: `1px solid ${color.startsWith('var') ? 'var(--border-light)' : `${color}3B`}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}>
                              {getModeEmoji(section)}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getSectionTitle(section)}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)'
                          }}>
                            {getSectionDuration(section)}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block' }}>
                          {formatTime(section.departure)} - {formatTime(section.arrival)}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {section.from.name} → {section.to.name}
                        </span>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getSectionSubtitle(section)}
                        </span>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {section.line?.code && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: section.line.color ? `#${section.line.color}` : '#475569',
                              color: 'white'
                            }}>
                              {section.line.code}
                            </span>
                          )}
                          {getSectionDistance(section) && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-secondary)'
                            }}>
                              {getSectionDistance(section)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prev / Next controls */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: 'rgba(15, 22, 40, 0.4)', display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-navigator-prev"
                  disabled={safeStep === 0}
                  onClick={() => setCurrentJourneyStep(Math.max(0, safeStep - 1))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Précédent
                </button>

                <button 
                  className="btn-navigator-next"
                  disabled={safeStep === sections.length - 1}
                  onClick={() => setCurrentJourneyStep(Math.min(sections.length - 1, safeStep + 1))}
                >
                  Suivant
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JourneyNavigator;
