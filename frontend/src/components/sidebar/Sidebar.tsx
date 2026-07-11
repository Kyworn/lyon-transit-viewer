import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import FavoriteButton from '../ui/FavoriteButton';
import { useLines } from '../../hooks/useLines';
import { useStops } from '../../hooks/useStops';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Stop } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

// Code parsing and normalizations
const normalizeCode = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^NAVI/, 'NAV');

const addCodeAlias = (set: Set<string>, code?: string | null) => {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  set.add(normalized);
  if (normalized.startsWith('NAV')) set.add(normalized.replace(/^NAV/, 'NAVI'));
  if (normalized.startsWith('NAVI')) set.add(normalized.replace(/^NAVI/, 'NAV'));
};

const extractLineCode = (service: string) => {
  const raw = (service || '').trim();
  if (!raw) return '';
  const leading = raw.split(':')[0]?.trim() || '';
  if (/^(?:[ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})$/i.test(leading)) {
    return normalizeCode(leading);
  }
  const match = raw.match(/(?:^|::)([ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})(?::|$)/i);
  return normalizeCode(match?.[1] || '');
};

const normalizeDirection = (value?: string | null) => {
  const raw = (value || '').toString().trim().toUpperCase();
  if (raw === 'A' || raw === 'ALLER' || raw === 'OUTBOUND') return 'A';
  if (raw === 'R' || raw === 'RETOUR' || raw === 'INBOUND') return 'R';
  return '';
};

const extractDirection = (service: string) => {
  const raw = (service || '').trim();
  if (!raw) return '';
  const tokens = raw.split(':').map((v) => v.trim()).filter(Boolean);
  const last = tokens[tokens.length - 1] || '';
  return normalizeDirection(last);
};

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    selectedLine,
    setSelectedLine,
    favoriteLines,
    addFavoriteLine,
    removeFavoriteLine,
    setCenterCoordinates,
    setRoutePlannerOpen,
    setSelectedStop,
  } = useAppStore();

  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites'>('explore');
  const debouncedSearchInput = useDebouncedValue(searchInput, 250);

  // Eager DB Subscriptions for immediate 0ms search
  const { data: lines, isLoading: isLoadingLines } = useLines({ includeTrace: true });
  const { data: stops } = useStops(true);

  // Group and format unique lines by category
  const groupedLines = useMemo(() => {
    if (!lines) return {};
    const unique = lines.reduce((acc: any, line) => {
      if (!acc[line.line_sort_code]) acc[line.line_sort_code] = line;
      return acc;
    }, {});

    return Object.values(unique).reduce((acc: any, line: any) => {
      const category = line.category || 'bus';
      if (!acc[category]) acc[category] = [];
      acc[category].push(line);
      return acc;
    }, {});
  }, [lines]) as Record<string, any[]>;

  const sortedCategories = ['metro', 'tram', 'funicular', 'fluvial', 'bus'].filter(c => groupedLines[c]);

  // Handle line & stop search autocompletion
  const filteredResults = useMemo(() => {
    if (!debouncedSearchInput) return null;
    const q = debouncedSearchInput.toLowerCase();

    return {
      lines: lines?.filter(l =>
        (l.line_code?.toLowerCase() || '').includes(q) ||
        (l.line_sort_code?.toLowerCase() || '').includes(q) ||
        (l.line_name?.toLowerCase() || '').includes(q) ||
        (l.destination_name?.toLowerCase() || '').includes(q)
      ).filter((v, i, a) => a.findIndex(t => t.line_sort_code === v.line_sort_code) === i).slice(0, 8) || [],
      stops: stops?.filter(s =>
        (s.name?.toLowerCase() || '').includes(q)
      ).slice(0, 8) || []
    };
  }, [debouncedSearchInput, lines, stops]);

  // Geographically sort stops for the selected line
  const lineStops = useMemo(() => {
    if (!selectedLine || !stops) return [];

    const candidateCodes = new Set<string>();
    addCodeAlias(candidateCodes, selectedLine.line_sort_code);
    addCodeAlias(candidateCodes, selectedLine.line_code);

    const parseServices = (stop: Stop) =>
      (stop.service_info || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((service) => ({
          lineCode: extractLineCode(service),
          direction: extractDirection(service),
        }));

    const byLine = stops.filter((stop: Stop) => {
      const services = parseServices(stop);
      return services.some((s) => candidateCodes.has(s.lineCode));
    });

    const directionCode = selectedLine.direction === 'Aller' ? 'A' : selectedLine.direction === 'Retour' ? 'R' : '';
    let filteredStops = byLine;
    if (directionCode) {
      const strict = byLine.filter((stop: Stop) => {
        const services = parseServices(stop);
        return services.some((s) => candidateCodes.has(s.lineCode) && s.direction === directionCode);
      });
      const hasDirectionData = byLine.some((stop: Stop) => {
        const services = parseServices(stop);
        return services.some((s) => candidateCodes.has(s.lineCode) && (s.direction === 'A' || s.direction === 'R'));
      });
      filteredStops = strict.length > 0 ? strict : (hasDirectionData ? [] : byLine);
    }

    // Parse geometry coordinates to geographically sort stops along the line path
    let coordinates: [number, number][] = [];
    if (selectedLine.trace_code) {
      try {
        const geo = JSON.parse(selectedLine.trace_code);
        if (geo) {
          if (geo.type === 'LineString') {
            coordinates = geo.coordinates || [];
          } else if (geo.type === 'MultiLineString') {
            coordinates = (geo.coordinates || []).flat(1);
          }
        }
      } catch (e) {
        console.error('Failed to parse line trace coordinates:', e);
      }
    }

    if (coordinates.length > 0) {
      // Sort geographically along the line path using projected distance
      const getDistanceAlongLine = (stop: Stop) => {
        let minDistanceSq = Infinity;
        let distanceAlongLine = 0;
        let currentAccumulatedDistance = 0;

        for (let i = 0; i < coordinates.length - 1; i++) {
          const p1 = coordinates[i];
          const p2 = coordinates[i + 1];

          const dx = p2[0] - p1[0];
          const dy = p2[1] - p1[1];
          const segmentLengthSq = dx * dx + dy * dy;

          let t = 0;
          if (segmentLengthSq > 0) {
            t = ((stop.longitude - p1[0]) * dx + (stop.latitude - p1[1]) * dy) / segmentLengthSq;
            t = Math.max(0, Math.min(1, t));
          }

          const projLng = p1[0] + t * dx;
          const projLat = p1[1] + t * dy;

          const distSq = (stop.longitude - projLng) ** 2 + (stop.latitude - projLat) ** 2;

          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            const segmentLen = Math.sqrt(segmentLengthSq);
            distanceAlongLine = currentAccumulatedDistance + t * segmentLen;
          }

          currentAccumulatedDistance += Math.sqrt(segmentLengthSq);
        }

        return distanceAlongLine;
      };

      return filteredStops
        .map((stop) => ({ stop, dist: getDistanceAlongLine(stop) }))
        .sort((a, b) => a.dist - b.dist)
        .map(({ stop }) => stop);
    }

    return filteredStops;
  }, [selectedLine, stops]);

  const favoriteLinesData = useMemo(() => {
    if (!lines) return [];
    return lines.filter(l => favoriteLines.includes(l.line_sort_code))
      .filter((v, i, a) => a.findIndex(t => t.line_sort_code === v.line_sort_code) === i);
  }, [lines, favoriteLines]);

  const isFavorite = (code: string) => favoriteLines.includes(code);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'metro':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M12 18V6" />
            <path d="M6 12h12" />
          </svg>
        );
      case 'tram':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <line x1="9" y1="21" x2="9" y2="3" />
            <line x1="15" y1="21" x2="15" y2="3" />
          </svg>
        );
      case 'funicular':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 7 12 14 2 7" />
            <polyline points="22 13 12 20 2 13" />
          </svg>
        );
      case 'fluvial':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 12c-2.67 0-4.33-1.5-7-1.5s-4.33 1.5-7 1.5-4.33-1.5-7-1.5" />
            <path d="M22 17c-2.67 0-4.33-1.5-7-1.5s-4.33 1.5-7 1.5-4.33-1.5-7-1.5" />
          </svg>
        );
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <circle cx="7" cy="20" r="1" />
            <circle cx="17" cy="20" r="1" />
          </svg>
        );
    }
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -440, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -440, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="sidebar-wrapper"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .sidebar-wrapper {
              position: absolute;
              top: 0;
              left: 0;
              width: 400px;
              height: calc(100% - 48px);
              margin: 24px 0 24px 24px;
              z-index: 110;
              display: flex;
              flex-direction: column;
              pointer-events: auto;
              border: 1px solid var(--border-light);
              border-radius: var(--radius-lg);
              background: rgba(10, 10, 12, 0.92) !important;
              box-shadow: var(--glass-shadow);
              overflow: hidden;
              transition: border-color var(--transition-normal);
            }
            @media (max-width: 768px) {
              .sidebar-wrapper {
                position: fixed !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                top: 0 !important;
                left: 0 !important;
                z-index: 130 !important;
              }
            }
            .sidebar-wrapper:hover {
              border-color: rgba(255, 255, 255, 0.12);
            }
            .sidebar-brand-gradient {
              background: linear-gradient(120deg, var(--text-primary) 30%, var(--primary) 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .sidebar-search-group {
              position: relative;
              display: flex;
              align-items: center;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-md);
              padding: 4px 12px;
              transition: all var(--transition-fast);
            }
            .sidebar-search-group:focus-within {
              border-color: var(--border-focus);
              box-shadow: 0 0 0 2px var(--primary-glow);
              background: rgba(255, 255, 255, 0.05);
            }
            .sidebar-search-input {
              width: 100%;
              border: none;
              background: transparent;
              padding: 8px 4px 8px 10px;
              color: var(--text-primary);
              font-family: inherit;
              font-size: 0.95rem;
            }
            .sidebar-search-input:focus {
              outline: none;
            }
            .sidebar-tab-button {
              flex: 1;
              padding: 10px;
              border-radius: var(--radius-md);
              font-weight: 700;
              font-size: 0.8rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: all var(--transition-fast);
              color: var(--text-secondary);
              border: 1px solid transparent;
              background: rgba(255, 255, 255, 0.01);
            }
            .sidebar-tab-button.active-explore {
              background: rgba(139, 92, 246, 0.08);
              border-color: rgba(139, 92, 246, 0.2);
              color: var(--primary-hover);
              box-shadow: 0 4px 12px var(--primary-glow);
            }
            .sidebar-tab-button.active-favorites {
              background: rgba(16, 185, 129, 0.08);
              border-color: rgba(16, 185, 129, 0.2);
              color: var(--secondary);
              box-shadow: 0 4px 12px var(--secondary-glow);
            }
            .sidebar-tab-button:hover {
              background: rgba(255, 255, 255, 0.04);
              color: var(--text-primary);
            }
            .line-button-pill {
              height: 60px;
              border-radius: var(--radius-md);
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid var(--border-light);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.05rem;
              font-weight: 900;
              color: var(--text-primary);
              cursor: pointer;
              transition: all var(--transition-fast);
              position: relative;
              overflow: hidden;
            }
            .line-button-pill:hover {
              background: rgba(255, 255, 255, 0.05);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .line-button-left-border {
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 5px;
            }
            .stop-timeline-container {
              display: flex;
              flex-direction: column;
              position: relative;
              padding-left: 6px;
            }
            .stop-timeline-row {
              display: flex;
              gap: 16px;
              cursor: pointer;
              transition: all var(--transition-fast);
              padding: 10px 8px;
              border-radius: var(--radius-sm);
            }
            .stop-timeline-row:hover {
              background: rgba(255, 255, 255, 0.03);
            }
            .stop-timeline-row:hover .timeline-bullet {
              transform: scale(1.3);
              background: currentColor !important;
            }
            .stop-timeline-visual {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 16px;
              position: relative;
            }
            .timeline-segment-line {
              width: 2px;
              flex: 1;
              opacity: 0.35;
            }
            .timeline-bullet {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 2px solid;
              background: #0f172a;
              z-index: 2;
              transition: all var(--transition-fast);
            }
            .stop-timeline-details {
              display: flex;
              flex-direction: column;
              gap: 2px;
              flex: 1;
            }
            .stop-timeline-name {
              font-size: 0.88rem;
              font-weight: 700;
              color: var(--text-primary);
              line-height: 1.2;
            }
            .stop-timeline-muni {
              font-size: 0.72rem;
              color: var(--text-muted);
              font-weight: 500;
            }
            .btn-action-outline {
              flex: 1;
              padding: 12px;
              border-radius: var(--radius-md);
              font-size: 0.8rem;
              font-weight: 700;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid var(--border-light);
              cursor: pointer;
              transition: all var(--transition-fast);
            }
            .btn-action-outline:hover {
              background: rgba(255, 255, 255, 0.06);
              border-color: rgba(255, 255, 255, 0.15);
            }
            .btn-action-solid {
              flex: 1;
              padding: 12px;
              border-radius: var(--radius-md);
              font-size: 0.8rem;
              font-weight: 700;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--primary);
              box-shadow: 0 4px 12px var(--primary-glow);
              cursor: pointer;
              transition: all var(--transition-fast);
            }
            .btn-action-solid:hover {
              background: var(--primary-hover);
              transform: translateY(-1px);
            }
          ` }} />

          {/* 1. Header & App Brand */}
          <div style={{ padding: '24px 24px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{
                fontFamily: 'Outfit',
                fontWeight: 800,
                fontSize: '22px',
                letterSpacing: '-0.5px',
              }}>
                <span className="sidebar-brand-gradient">Explore.Lyon</span>
              </h2>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setRoutePlannerOpen(true);
                }}
                className="glass-panel"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                }}
                title="Itinéraires"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* 2. Interactive Search Box */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div className="sidebar-search-group">
                <span style={{ display: 'flex', color: 'var(--text-muted)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Rechercher une ligne, un arrêt..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="sidebar-search-input"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    style={{ display: 'flex', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Tab Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setActiveTab('explore'); setSelectedLine(null); }}
                className={`sidebar-tab-button ${activeTab === 'explore' ? 'active-explore' : ''}`}
              >
                Explorer
              </button>
              <button
                onClick={() => { setActiveTab('favorites'); setSelectedLine(null); }}
                className={`sidebar-tab-button ${activeTab === 'favorites' ? 'active-favorites' : ''}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Favoris
              </button>
            </div>
          </div>

          {/* 4. Scrolling lists container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
            {selectedLine ? (
              /* SELECTED LINE DETAIL VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '12px' }}>
                <div className="animate-fade-in" style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0) 100%)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glowing background aura */}
                  <div style={{
                    position: 'absolute',
                    top: '-60px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)',
                    filter: 'blur(40px)',
                    opacity: 0.18,
                    zIndex: 0
                  }} />

                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    boxShadow: `0 0 20px ${selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)'}66`,
                    marginBottom: '16px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {selectedLine.line_sort_code}
                    <button
                      onClick={() => {
                        const code = selectedLine.line_sort_code;
                        isFavorite(code) ? removeFavoriteLine(code) : addFavoriteLine(code);
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-surface-solid)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFavorite(selectedLine.line_sort_code) ? 'var(--secondary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={isFavorite(selectedLine.line_sort_code) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>

                  <div style={{ display: 'flex', width: '100%', gap: '16px', justifyContent: 'center', marginBottom: '24px', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '4px' }}>DESTINATION</span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)', margin: 0, lineHeight: '1.2' }}>
                        {selectedLine.destination_name}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid var(--border-light)', paddingLeft: '16px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '4px' }}>SENS</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: selectedLine.direction === 'Retour' ? 'var(--secondary)' : 'var(--primary)',
                        backgroundColor: selectedLine.direction === 'Retour' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        border: `1px solid ${selectedLine.direction === 'Retour' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {selectedLine.direction || 'Aller'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', width: '100%', zIndex: 1 }}>
                    <button
                      onClick={() => {
                        const reverseLine = lines?.find(l =>
                          l.line_sort_code === selectedLine.line_sort_code &&
                          l.destination_name !== selectedLine.destination_name
                        );
                        if (reverseLine) setSelectedLine(reverseLine);
                      }}
                      className="btn-action-outline"
                    >
                      Inverser
                    </button>
                    <button
                      onClick={() => setSelectedLine(null)}
                      className="btn-action-solid"
                      style={{
                        backgroundColor: selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)',
                        boxShadow: `0 4px 12px ${selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)'}44`
                      }}
                    >
                      Quitter
                    </button>
                  </div>
                </div>

                {/* Vertical interactive timeline of stops */}
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '14px',
                  }}>
                    Arrêts desservis ({lineStops.length})
                  </span>

                  {lineStops.length > 0 ? (
                    <div className="stop-timeline-container">
                      {lineStops.map((stop: Stop, idx: number) => {
                        const isFirst = idx === 0;
                        const isLast = idx === lineStops.length - 1;
                        const stopColor = selectedLine.color ? (selectedLine.color.startsWith('#') ? selectedLine.color : `#${selectedLine.color}`) : 'var(--primary)';

                        return (
                          <div
                            key={stop.id}
                            className="stop-timeline-row"
                            onClick={() => {
                              setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
                              setSelectedStop(stop);
                            }}
                          >
                            <div className="stop-timeline-visual">
                              {!isFirst && <div className="timeline-segment-line" style={{ background: stopColor }} />}
                              <div
                                className="timeline-bullet"
                                style={{
                                  borderColor: stopColor,
                                  color: stopColor, // used for hover bullet background inherit
                                  boxShadow: `0 0 8px ${stopColor}33`,
                                }}
                              />
                              {!isLast && <div className="timeline-segment-line" style={{ background: stopColor }} />}
                            </div>

                            <div className="stop-timeline-details">
                              <span className="stop-timeline-name">{stop.name}</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className="stop-timeline-muni">{stop.municipality || 'Lyon'}</span>
                                {stop.pmr_accessible && (
                                  <span title="Accessible PMR" style={{ opacity: 0.7, fontSize: '0.75rem' }}>♿</span>
                                )}
                                {(stop.has_elevator || stop.has_escalator) && (
                                  <span title="Escalateurs / Ascenseur" style={{ opacity: 0.7, fontSize: '0.75rem' }}>🛗</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Aucun arrêt trouvé pour cette direction
                    </div>
                  )}
                </div>
              </div>
            ) : searchInput ? (
              /* SEARCH RESULTS DISPLAY */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '12px' }}>
                {filteredResults?.lines.length ? (
                  <div>
                    <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px' }}>Lignes</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredResults.lines.map(line => (
                        <div
                          key={line.id}
                          onClick={() => { setSelectedLine(line); setSearchInput(''); }}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-light)',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : 'var(--primary)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 900,
                            boxShadow: `0 0 10px ${line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : 'var(--primary)'}44`
                          }}>
                            {line.line_code}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{line.line_name}</h5>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vers {line.destination_name}</p>
                          </div>
                          <FavoriteButton type="line" id={line.line_sort_code || line.id} size={14} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {filteredResults?.stops.length ? (
                  <div>
                    <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px' }}>Arrêts</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredResults.stops.map(stop => (
                        <div
                          key={stop.id}
                          onClick={() => {
                            setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
                            setSelectedStop(stop);
                            setSearchInput('');
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-light)',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            color: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </div>
                          <div>
                            <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{stop.name}</h5>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{stop.municipality}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!filteredResults?.lines.length && !filteredResults?.stops.length && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Aucun résultat pour "{searchInput}"
                  </div>
                )}
              </div>
            ) : activeTab === 'favorites' ? (
              /* FAVORITES LIST DISPLAY */
              <div style={{ marginTop: '12px' }}>
                {favoriteLinesData.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '12px' }}>Lignes favorites</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '10px' }}>
                      {favoriteLinesData.map(line => {
                        const lineCol = line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : 'var(--primary)';
                        return (
                          <button
                            key={line.id}
                            onClick={() => setSelectedLine(line)}
                            className="line-button-pill"
                          >
                            {/* Decorative line-colored border */}
                            <div className="line-button-left-border" style={{ backgroundColor: lineCol }} />
                            <span style={{ position: 'relative', zIndex: 1 }}>{line.line_sort_code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '12px', opacity: 0.3 }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <p style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)', fontWeight: 600 }}>Vos favoris apparaîtront ici</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Touchez l'étoile d'une ligne pour l'épingler.</p>
                  </div>
                )}
              </div>
            ) : (
              /* BROWSE ALL CATEGORIES */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                {isLoadingLines ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ height: '80px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.02)' }} className="animate-pulse-slow" />
                    ))}
                  </div>
                ) : (
                  sortedCategories.map(category => {
                    const categoryLines = groupedLines[category] || [];
                    return (
                      <div key={category}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>{getCategoryIcon(category)}</span>
                          <h4 style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            fontFamily: 'Outfit',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'var(--text-primary)',
                          }}>
                            {category}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            ({categoryLines.length})
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '8px' }}>
                          {categoryLines.map((line: any) => {
                            const lineCol = line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : 'var(--primary)';
                            return (
                              <button
                                key={line.id}
                                onClick={() => setSelectedLine(line)}
                                className="line-button-pill"
                              >
                                <div className="line-button-left-border" style={{ backgroundColor: lineCol }} />
                                <span style={{ position: 'relative', zIndex: 1 }}>{line.line_sort_code}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
