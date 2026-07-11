import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStops } from '../../hooks/useStops';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAppStore } from '../../stores/useAppStore';
import { useSpacetime } from '../../spacetime/useSpacetime';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { usePanelDismiss, useSwipeToClose } from '../../hooks/usePanelDismiss';

interface Location {
  name: string;
  lat: number;
  lng: number;
  type: 'stop' | 'address';
}

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
}

interface Journey {
  id: string;
  arrival: string;
  departure: string;
  sections: RouteSection[];
  co2?: number;
  co2_car?: number;
}

interface RoutePlannerProps {
  open: boolean;
  onClose: () => void;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ open, onClose }) => {
  const { isMobile } = useBreakpoint();
  usePanelDismiss(open, onClose);
  const { panelProps, handleProps } = useSwipeToClose(isMobile, onClose);
  const { conn, connected } = useSpacetime();
  const [from, setFrom] = useState<Location | null>(null);
  const [to, setTo] = useState<Location | null>(null);
  
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const debouncedFromSearch = useDebouncedValue(fromSearch, 250);
  const debouncedToSearch = useDebouncedValue(toSearch, 250);
  
  const [addressSuggestions, setAddressSuggestions] = useState<Location[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Transport mode options
  const [transportModes, setTransportModes] = useState({
    metro: true,
    tramway: true,
    bus: true,
    funicular: true,
    boat: true,
    tod: true,
    train: true,
    carRegion: true,
    bike: false,
    car: false,
  });

  // Routing preferences
  const [walkSpeed, setWalkSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [bikeSpeed, setBikeSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [bikeType, setBikeType] = useState<'bike' | 'bss'>('bike');
  const [isElectricBike, setIsElectricBike] = useState(false);
  const [isPmr, setIsPmr] = useState(false);
  const [useRealtime, setUseRealtime] = useState(true);

  // Date & Time preferences
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  });
  const [isArrivalTime, setIsArrivalTime] = useState(false);

  const { data: stops } = useStops(open);
  const { selectedJourney, setSelectedJourney } = useAppStore();

  const toggleMode = (key: keyof typeof transportModes) => {
    setTransportModes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setFromFocused(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setToFocused(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  const invokeCalculateJourney = async (requestPayload: Record<string, any>) => {
    if (!connected) {
      throw new Error('SpacetimeDB non connecté');
    }
    const uri = import.meta.env.REACT_APP_SPACETIMEDB_URI || 'http://127.0.0.1:3000';
    const dbName = import.meta.env.REACT_APP_SPACETIMEDB_DB || 'lyon-transit';
    const response = await fetch(`${uri}/v1/database/${dbName}/call/calculate_journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([requestPayload]),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    // Procedure returns a String (JSON-encoded). The HTTP response wraps return
    // values in an array.
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed[0] : parsed;
  };

  const handleSwap = () => {
    const tempLocation = from;
    const tempSearch = fromSearch;
    setFrom(to);
    setFromSearch(toSearch);
    setTo(tempLocation);
    setToSearch(tempSearch);
  };

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const mapboxToken = import.meta.env.REACT_APP_MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxToken}&` +
        `proximity=4.835,45.764&` +
        `bbox=4.7,45.7,4.95,45.82&` +
        `limit=5&` +
        `language=fr`
      );

      if (response.ok) {
        const data = await response.json();
        const suggestions: Location[] = data.features.map((feature: any) => ({
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          type: 'address' as const,
        }));
        setAddressSuggestions(suggestions);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  }, []);

  const getOptions = (searchQuery: string): Location[] => {
    const stopOptions: Location[] = stops
      ? stops
        .filter(stop =>
          stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stop.municipality?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 8)
        .map(stop => ({
          name: `${stop.name} (${stop.municipality || 'Lyon'})`,
          lat: stop.latitude,
          lng: stop.longitude,
          type: 'stop' as const,
        }))
      : [];

    return [...stopOptions, ...addressSuggestions];
  };

  const geocodeIfNeeded = async (location: Location | null, searchText: string): Promise<Location | null> => {
    if (location && location.lat && location.lng) {
      return location;
    }

    if (searchText && searchText.length >= 3) {
      try {
        const mapboxToken = import.meta.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?` +
          `access_token=${mapboxToken}&` +
          `proximity=4.835,45.764&` +
          `bbox=4.7,45.7,4.95,45.82&` +
          `limit=1&` +
          `language=fr`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            return {
              name: feature.place_name,
              lng: feature.center[0],
              lat: feature.center[1],
              type: 'address',
            };
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    return null;
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const fromLocation = await geocodeIfNeeded(from, fromSearch);
      const toLocation = await geocodeIfNeeded(to, toSearch);

      if (!fromLocation || !toLocation) {
        setError("Veuillez sélectionner ou entrer des lieux valides pour le départ et l'arrivée");
        setLoading(false);
        return;
      }

      const selectedModes: string[] = [];
      if (transportModes.metro) selectedModes.push('metro');
      if (transportModes.tramway) selectedModes.push('tramway');
      if (transportModes.bus) selectedModes.push('bus');
      if (transportModes.funicular) selectedModes.push('funicular');
      if (transportModes.boat) selectedModes.push('boat');
      if (transportModes.tod) selectedModes.push('tod');
      if (transportModes.train) selectedModes.push('train');
      if (transportModes.carRegion) selectedModes.push('car-region');

      const finalDateTime = useCustomDateTime
        ? new Date(dateTime).toISOString()
        : new Date().toISOString();

      const requestPayload = {
        from_lat: fromLocation.lat,
        from_lng: fromLocation.lng,
        to_lat: toLocation.lat,
        to_lng: toLocation.lng,
        datetime: finalDateTime,
        is_arrival_time: isArrivalTime,
        transport_modes: JSON.stringify(selectedModes),
        walk: walkSpeed,
        bike: transportModes.bike
          ? {
              some: JSON.stringify({
                type: [bikeType, 'bss'],
                speed: bikeSpeed,
                isElectric: isElectricBike,
              }),
            }
          : { none: [] },
        pmr: isPmr,
        car: transportModes.car,
        data_freshness: useRealtime ? '1' : '0',
      };

      const result = await invokeCalculateJourney(requestPayload);
      const parsed = typeof result === 'string' ? JSON.parse(result || '{}') : (result || {});
      if (parsed.ok === false) {
        throw new Error(parsed.err || "Erreur lors du calcul de l'itinéraire");
      }

      const payload = parsed.data || parsed;
      setJourneys(payload.journeys || []);

      if (!from) setFrom(fromLocation);
      if (!to) setTo(toLocation);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = (isFrom: boolean) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            name: 'Ma position',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            type: 'address',
          };
          if (isFrom) {
            setFrom(location);
            setFromSearch('Ma position');
          } else {
            setTo(location);
            setToSearch('Ma position');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError("Impossible d'obtenir votre position GPS");
        }
      );
    }
  };

  const formatDuration = (arrival: string, departure: string) => {
    const arrivalTime = new Date(arrival).getTime();
    const departureTime = new Date(departure).getTime();
    const durationMs = arrivalTime - departureTime;
    const minutes = Math.floor(durationMs / 1000 / 60);
    return `${minutes} min`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -424, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -424, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="route-planner-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '424px',
            height: '100vh',
            zIndex: 120,
            display: 'flex',
            flexDirection: 'column',
          }}
          {...panelProps}
        >
          {isMobile && (
            <div
              {...handleProps}
              style={{
                display: 'flex', justifyContent: 'center', padding: '10px 0 2px',
                flexShrink: 0, ...handleProps.style,
              }}
            >
              <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
            </div>
          )}
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 768px) {
              .route-planner-container {
                width: 100vw !important;
                height: 100vh !important;
              }
            }
            .route-card-bg {
              margin: 24px 0 24px 24px;
              width: 400px;
              height: calc(100% - 48px);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              background: rgba(10, 10, 12, 0.92) !important;
            }
            @media (max-width: 768px) {
              .route-card-bg {
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 0 !important;
                border: none !important;
              }
            }
            .search-input-group {
              position: relative;
              display: flex;
              align-items: center;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-md);
              padding: 4px 12px;
              transition: all var(--transition-fast);
            }
            .search-input-group:focus-within {
              border-color: var(--border-focus);
              box-shadow: 0 0 0 2px var(--accent-glow);
              background: rgba(255, 255, 255, 0.05);
            }
            .search-input-field {
              width: 100%;
              border: none;
              background: transparent;
              padding: 8px 4px;
              color: var(--text-primary);
              font-family: inherit;
              font-size: 0.95rem;
            }
            .search-input-field:focus {
              outline: none;
            }
            .search-suggestions-dropdown {
              position: absolute;
              top: calc(100% + 4px);
              left: 0; right: 0;
              max-height: 240px;
              overflow-y: auto;
              z-index: 10;
              background: rgba(15, 22, 40, 0.95);
              backdrop-filter: blur(20px);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-md);
              box-shadow: var(--glass-shadow);
            }
            .suggestion-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 14px;
              cursor: pointer;
              transition: background var(--transition-fast);
              font-size: 0.85rem;
              color: var(--text-primary);
            }
            .suggestion-item:hover {
              background: rgba(255, 255, 255, 0.06);
            }
            .swap-button-circle {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid var(--border-light);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all var(--transition-fast);
              color: var(--text-secondary);
              margin: 4px auto;
            }
            .swap-button-circle:hover {
              background: rgba(255, 255, 255, 0.1);
              color: var(--text-primary);
              border-color: rgba(255, 255, 255, 0.15);
            }
            .accordion-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px 16px;
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-md);
              cursor: pointer;
              transition: all var(--transition-fast);
              margin-bottom: 12px;
            }
            .accordion-header:hover {
              background: rgba(255, 255, 255, 0.04);
            }
            .chip-pill {
              font-size: 0.75rem;
              font-weight: 600;
              padding: 4px 10px;
              border-radius: var(--radius-full);
              border: 1px solid var(--border-light);
              background: rgba(255, 255, 255, 0.03);
              color: var(--text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all var(--transition-fast);
            }
            .chip-pill.active {
              background: var(--accent);
              border-color: var(--accent);
              color: white;
              box-shadow: 0 4px 12px var(--accent-glow);
            }
            .settings-select-group {
              display: flex;
              flex-direction: column;
              gap: 4px;
              flex: 1;
            }
            .settings-select {
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-sm);
              color: var(--text-primary);
              padding: 6px 10px;
              font-family: inherit;
              font-size: 0.8rem;
              outline: none;
            }
            .switch-label-group {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 4px 0;
            }
            .btn-calculate {
              width: 100%;
              padding: 12px;
              border-radius: var(--radius-md);
              background: var(--accent);
              color: white;
              font-weight: 700;
              font-size: 0.95rem;
              box-shadow: 0 6px 20px var(--accent-glow);
              cursor: pointer;
              transition: all var(--transition-fast);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .btn-calculate:hover {
              background: var(--accent-hover);
              transform: translateY(-1px);
            }
            .btn-calculate:disabled {
              opacity: 0.6;
              cursor: not-allowed;
              transform: none;
            }
            .journey-item-card {
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid var(--border-light);
              border-radius: var(--radius-md);
              padding: 14px;
              cursor: pointer;
              transition: all var(--transition-fast);
            }
            .journey-item-card:hover {
              background: rgba(255, 255, 255, 0.05);
              border-color: var(--accent);
              transform: translateX(4px);
            }
            .journey-item-card.active {
              background: rgba(6, 182, 212, 0.08);
              border-color: var(--accent);
            }
          ` }} />

          <div className="glass-panel route-card-bg">
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-light)',
              background: 'linear-gradient(120deg, hsla(199, 89%, 48%, 0.15) 0%, rgba(16, 185, 129, 0.06) 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  color: 'white'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                    Itinéraires
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Calcul multimodal temps réel
                  </span>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent)';
                  e.currentTarget.style.borderColor = 'var(--accent-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Inputs Form */}
              <div className="card-widget" style={{ padding: '14px', marginBottom: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* From Search */}
                  <div ref={fromRef} style={{ position: 'relative' }}>
                    <div className="search-input-group">
                      <span style={{ display: 'flex', color: 'var(--accent)', paddingRight: '4px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <input 
                        type="text"
                        placeholder="Départ..."
                        value={fromSearch}
                        className="search-input-field"
                        onFocus={() => setFromFocused(true)}
                        onChange={(e) => {
                          setFromSearch(e.target.value);
                          searchAddress(e.target.value);
                        }}
                      />
                      <button 
                        onClick={() => handleUseMyLocation(true)}
                        title="Ma position"
                        style={{ display: 'flex', color: 'var(--text-secondary)', padding: '6px' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                        </svg>
                      </button>
                    </div>

                    {fromFocused && fromSearch.trim().length >= 2 && (
                      <div className="search-suggestions-dropdown">
                        {getOptions(debouncedFromSearch).map((opt, i) => (
                          <div 
                            key={`from-opt-${i}`}
                            className="suggestion-item"
                            onMouseDown={() => {
                              setFrom(opt);
                              setFromSearch(opt.name);
                              setFromFocused(false);
                            }}
                          >
                            <span>{opt.type === 'stop' ? '🚏' : '📍'}</span>
                            <span>{opt.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Swap Button */}
                  <button className="swap-button-circle" onClick={handleSwap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>

                  {/* To Search */}
                  <div ref={toRef} style={{ position: 'relative' }}>
                    <div className="search-input-group">
                      <span style={{ display: 'flex', color: 'var(--secondary)', paddingRight: '4px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <input 
                        type="text"
                        placeholder="Destination..."
                        value={toSearch}
                        className="search-input-field"
                        onFocus={() => setToFocused(true)}
                        onChange={(e) => {
                          setToSearch(e.target.value);
                          searchAddress(e.target.value);
                        }}
                      />
                      <button 
                        onClick={() => handleUseMyLocation(false)}
                        title="Ma position"
                        style={{ display: 'flex', color: 'var(--text-secondary)', padding: '6px' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                        </svg>
                      </button>
                    </div>

                    {toFocused && toSearch.trim().length >= 2 && (
                      <div className="search-suggestions-dropdown">
                        {getOptions(debouncedToSearch).map((opt, i) => (
                          <div 
                            key={`to-opt-${i}`}
                            className="suggestion-item"
                            onMouseDown={() => {
                              setTo(opt);
                              setToSearch(opt.name);
                              setToFocused(false);
                            }}
                          >
                            <span>{opt.type === 'stop' ? '🚏' : '📍'}</span>
                            <span>{opt.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Advanced Options Accordion */}
              <div>
                <div className="accordion-header" onClick={() => setShowOptions(!showOptions)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Préférences & Options</span>
                  </div>
                  <svg 
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ 
                      transform: showOptions ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform var(--transition-fast)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="card-widget" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.15)' }}>
                        {/* Transport modes selection */}
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Modes de transport
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {[
                              { key: 'metro', label: 'Métro' },
                              { key: 'tramway', label: 'Tramway' },
                              { key: 'bus', label: 'Bus' },
                              { key: 'funicular', label: 'Funiculaire' },
                              { key: 'boat', label: 'Fluvial' },
                              { key: 'train', label: 'TER Train' },
                              { key: 'bike', label: 'Vélo' },
                              { key: 'car', label: 'Voiture' },
                            ].map((item) => (
                              <div 
                                key={item.key}
                                className={`chip-pill ${transportModes[item.key as keyof typeof transportModes] ? 'active' : ''}`}
                                onClick={() => toggleMode(item.key as keyof typeof transportModes)}
                              >
                                {item.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Date/Time buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className={`chip-pill ${!useCustomDateTime ? 'active' : ''}`}
                            onClick={() => setUseCustomDateTime(false)}
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            Maintenant
                          </button>
                          <button 
                            className={`chip-pill ${useCustomDateTime ? 'active' : ''}`}
                            onClick={() => setUseCustomDateTime(true)}
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            Planifier...
                          </button>
                        </div>

                        {useCustomDateTime && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input 
                              type="datetime-local" 
                              value={dateTime}
                              className="settings-select"
                              onChange={(e) => setDateTime(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                className={`chip-pill ${!isArrivalTime ? 'active' : ''}`}
                                onClick={() => setIsArrivalTime(false)}
                                style={{ flex: 1, justifyContent: 'center' }}
                              >
                                Départ à
                              </button>
                              <button 
                                className={`chip-pill ${isArrivalTime ? 'active' : ''}`}
                                onClick={() => setIsArrivalTime(true)}
                                style={{ flex: 1, justifyContent: 'center' }}
                              >
                                Arrivée pour
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Speed preferences */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div className="settings-select-group">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vitesse Marche</span>
                            <select 
                              value={walkSpeed}
                              className="settings-select"
                              onChange={(e) => setWalkSpeed(e.target.value as any)}
                            >
                              <option value="slow">Tranquille</option>
                              <option value="normal">Normale</option>
                              <option value="fast">Rapide</option>
                            </select>
                          </div>

                          {transportModes.bike && (
                            <div className="settings-select-group">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vitesse Vélo</span>
                              <select 
                                value={bikeSpeed}
                                className="settings-select"
                                onChange={(e) => setBikeSpeed(e.target.value as any)}
                              >
                                <option value="slow">Calme</option>
                                <option value="normal">Standard</option>
                                <option value="fast">Rapide</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Bike options */}
                        {transportModes.bike && (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className="settings-select-group">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Type de vélo</span>
                              <select 
                                value={bikeType}
                                className="settings-select"
                                onChange={(e) => setBikeType(e.target.value as any)}
                              >
                                <option value="bike">Vélo Personnel</option>
                                <option value="bss">Libre service (Vélo'v)</option>
                              </select>
                            </div>

                            <label className="switch-label-group" style={{ cursor: 'pointer', flex: 1, marginTop: '16px' }}>
                              <input 
                                type="checkbox"
                                checked={isElectricBike}
                                onChange={(e) => setIsElectricBike(e.target.checked)}
                                style={{ marginRight: '6px' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Vélo Électrique</span>
                            </label>
                          </div>
                        )}

                        {/* PMR & Realtime Toggles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label className="switch-label-group" style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Accessibilité PMR (Fauteuil)</span>
                            <input 
                              type="checkbox"
                              checked={isPmr}
                              onChange={(e) => setIsPmr(e.target.checked)}
                            />
                          </label>

                          <label className="switch-label-group" style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Utiliser le trafic temps réel</span>
                            <input 
                              type="checkbox"
                              checked={useRealtime}
                              onChange={(e) => setUseRealtime(e.target.checked)}
                            />
                          </label>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Trigger */}
              <button 
                className="btn-calculate" 
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? (
                  <div className="spinner" style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin-slow 0.8s linear infinite'
                  }} />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Calculer le trajet
                  </>
                )}
              </button>

              {/* Error messages */}
              {error && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              {/* Itinerary suggestions list */}
              {journeys.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                    Itinéraires recommandés
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {journeys.map((journey, idx) => {
                      const isActive = selectedJourney?.id === journey.id;
                      return (
                        <div 
                          key={journey.id || idx}
                          className={`journey-item-card ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedJourney(journey);
                            onClose();
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {formatDuration(journey.arrival, journey.departure)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {formatTime(journey.departure)} - {formatTime(journey.arrival)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {journey.sections.map((sec, sIdx) => (
                              <React.Fragment key={sIdx}>
                                {sec.type === 'public-transport' ? (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: sec.line?.color ? `#${sec.line.color}` : '#475569',
                                    color: 'white'
                                  }}>
                                    {sec.line?.code}
                                  </span>
                                ) : sec.type === 'walk' ? (
                                  <span style={{ fontSize: '0.75rem', display: 'flex', color: 'var(--text-muted)' }}>
                                    🚶
                                  </span>
                                ) : null}
                                {sIdx < journey.sections.length - 1 && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>›</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoutePlanner;
