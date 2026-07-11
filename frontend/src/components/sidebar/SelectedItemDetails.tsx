import React, { useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Vehicle } from '../../types';
import { useLines } from '../../hooks/useLines';
import { useSpacetime } from '../../spacetime/useSpacetime';
import { motion, AnimatePresence } from 'framer-motion';

const extractLineSortCode = (lineRef?: string | null) => {
  if (!lineRef) return null;
  const idx = lineRef.indexOf('::');
  if (idx === -1) return null;
  const rest = lineRef.slice(idx + 2);
  return rest.split(':')[0] || null;
};

const SelectedItemDetails: React.FC = () => {
  const { selectedItem, setSelectedItem, setCenterCoordinates } = useAppStore();
  const { data: lines } = useLines();
  const { conn, connected } = useSpacetime();

  if (!selectedItem || selectedItem.type !== 'vehicle') return null;

  const vehicle = selectedItem as Vehicle;
  const publicLineName = vehicle.published_line_name || extractLineSortCode(vehicle.line_ref) || '';
  const line = lines?.find(l => l.line_sort_code === publicLineName || (vehicle.line_ref && l.id === vehicle.line_ref));
  const lineColor = line?.color || (vehicle as any).color || 'var(--primary)';

  const vehicleNumber = useMemo(() => {
    if (!vehicle.vehicle_ref) return 'LIVE';
    const parts = vehicle.vehicle_ref.split(':');
    if (parts.length >= 2) {
      if (parts[parts.length - 1] === 'LOC') {
        return parts[parts.length - 2];
      }
      return parts[parts.length - 1];
    }
    return vehicle.vehicle_ref;
  }, [vehicle.vehicle_ref]);

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const d = new Date(time);
    return Number.isFinite(d.getTime()) 
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
      : '--:--';
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const fallbackFromCalls = useMemo(() => {
    if (!conn || !connected) return { stopName: null, arrival: null, distanceMeters: null, destination: null };
    
    const currentOrder = vehicle.stop_order != null ? Number(vehicle.stop_order) : null;

    // Only consider calls strictly AFTER the current stop
    const futureCalls = Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>)
      .filter(c => {
        if (c.datedVehicleJourneyRef !== vehicle.dated_vehicle_journey_ref) return false;
        if (currentOrder != null && Number(c.stopOrder) <= currentOrder) return false;
        return true;
      })
      .sort((a, b) => Number(a.stopOrder ?? 999) - Number(b.stopOrder ?? 999));

    // Pick the closest future stop by order, fallback to soonest by time
    let nextCall: any = futureCalls[0] ?? null;
    if (!nextCall) {
      nextCall = futureCalls.find((c: any) => new Date(c.expectedArrivalTime || 0).getTime() > Date.now()) ?? null;
    }
    
    let dist = null;
    let stopName = null;
    if (nextCall) {
       const stop = Array.from(conn.db.stops.iter() as Iterable<any>).find(s => s.id === nextCall.stopPointRef || s.gtfsStopId === nextCall.gtfsStopId);
       if (stop) {
         if (vehicle.latitude && vehicle.longitude) {
           dist = haversineMeters(vehicle.latitude, vehicle.longitude, stop.latitude, stop.longitude);
         }
         stopName = stop.name || nextCall.stopPointName || null;
       }
    }

    // For destination: use last future call, or last ANY call for this journey, or journey destination_ref
    const lastFutureCall = futureCalls[futureCalls.length - 1];
    const allJourneyCalls = lastFutureCall ? null : Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>)
      .filter((c: any) => c.datedVehicleJourneyRef === vehicle.dated_vehicle_journey_ref)
      .sort((a: any, b: any) => Number(a.stopOrder ?? 0) - Number(b.stopOrder ?? 0));
    const terminalCall = lastFutureCall ?? (allJourneyCalls ? allJourneyCalls[allJourneyCalls.length - 1] : null);

    let destination = null;
    if (terminalCall) {
      const stop = Array.from(conn.db.stops.iter() as Iterable<any>).find((s: any) => {
        if (terminalCall.stopPointRef && s.id === terminalCall.stopPointRef) return true;
        if (terminalCall.gtfsStopId && (s.gtfsStopId === terminalCall.gtfsStopId || s.id?.endsWith?.(`.${terminalCall.gtfsStopId}`))) return true;
        return false;
      });
      destination = stop?.name || terminalCall.stopPointName || null;
    }
    // Final fallback: look up journey in estimated_vehicle_journeys_current for destination
    if (!destination && vehicle.dated_vehicle_journey_ref) {
      const journey = Array.from(conn.db.estimated_vehicle_journeys_current.iter() as Iterable<any>)
        .find((j: any) => j.datedVehicleJourneyRef === vehicle.dated_vehicle_journey_ref);
      if (journey?.destinationRef) {
        const destStop = Array.from(conn.db.stops.iter() as Iterable<any>)
          .find((s: any) => s.id === journey.destinationRef || s.id?.endsWith?.(journey.destinationRef));
        destination = destStop?.name || null;
      }
    }

    return { 
      stopName, 
      arrival: nextCall?.expectedArrivalTime || null, 
      distanceMeters: dist,
      destination
    };
  }, [conn, connected, vehicle]);

  // vehicle.stop_point_name = SIRI MonitoredCall = current stop, not next → use calls lookup
  const displayStopName = fallbackFromCalls.stopName || 'Terminus';
  const displayArrival = vehicle.expected_arrival_time || fallbackFromCalls.arrival;
  const displayDistance = vehicle.distance_from_stop != null ? vehicle.distance_from_stop : fallbackFromCalls.distanceMeters;
  const displayDestinationName = vehicle.destination_name || fallbackFromCalls.destination || 'Service Régulier';

  // Calculate progress (assuming average stop distance is 800m for visualization)
  const progress = Math.max(0, Math.min(100, 100 - ((displayDistance || 0) / 800) * 100));

  const handleFollowOnMap = () => {
    if (vehicle.longitude && vehicle.latitude) {
      setCenterCoordinates({ lng: vehicle.longitude, lat: vehicle.latitude });
    }
  };

  const isOnTime = vehicle.delay === 'PT0S' || !vehicle.delay;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="selected-item-details-wrapper"
        style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          width: '400px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .selected-item-details-wrapper {
              position: fixed !important;
              top: auto !important;
              right: 0 !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              max-height: 75vh !important;
              border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important;
            }
          }
          .vehicle-glow-aura {
            position: absolute;
            top: 0; left: 0; right: 0; height: 140px;
            background: linear-gradient(to bottom, var(--glow-color, rgba(139, 92, 246, 0.15)), transparent);
            pointer-events: none;
            z-index: 0;
            border-top-left-radius: inherit;
            border-top-right-radius: inherit;
          }
          .line-avatar-large {
            width: 50px;
            height: 50px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 1.2rem;
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: var(--shadow-avatar);
            flex-shrink: 0;
          }
          .progress-bar-container {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-full);
            position: relative;
            margin: 12px 0 16px 0;
            overflow: visible;
          }
          .progress-bar-fill {
            height: 100%;
            border-radius: var(--radius-full);
            background-color: var(--line-color, var(--primary));
            transition: width 0.4s ease-out;
          }
          .progress-vehicle-icon {
            position: absolute;
            top: -8px;
            margin-left: -10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            transition: left 0.4s ease-out;
          }
          .card-widget {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-md);
            padding: 16px;
            margin-bottom: 20px;
            transition: all var(--transition-fast);
          }
          .card-widget:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.12);
          }
          .status-badge-outline {
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: var(--radius-sm);
            border: 1px solid;
          }
          .status-badge-outline.ontime {
            color: var(--secondary);
            border-color: rgba(16, 185, 129, 0.3);
            background: rgba(16, 185, 129, 0.05);
          }
          .status-badge-outline.delayed {
            color: var(--warning);
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.05);
          }
          .secondary-stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
          .secondary-stat-box {
            padding: 12px;
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-light);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          .btn-follow-vehicle {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            border-radius: var(--radius-md);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
            color: var(--line-color, var(--primary));
            background: var(--glow-color, rgba(139, 92, 246, 0.1));
            border: 1px solid var(--glow-color-border, rgba(139, 92, 246, 0.2));
          }
          .btn-follow-vehicle:hover {
            background: var(--glow-color-hover, rgba(139, 92, 246, 0.18));
            border-color: var(--glow-color-border-hover, rgba(139, 92, 246, 0.3));
          }
        ` }} />

        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '24px' }}>
          {/* Ambient Glow */}
          <div className="vehicle-glow-aura" style={{ 
            ['--glow-color' as any]: lineColor.startsWith('var') ? 'rgba(139, 92, 246, 0.15)' : `${lineColor}24` 
          }} />

          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                className="line-avatar-large" 
                style={{ 
                  backgroundColor: lineColor,
                  ['--shadow-avatar' as any]: lineColor.startsWith('var') ? '0 8px 24px rgba(139, 92, 246, 0.3)' : `0 8px 24px ${lineColor}4D`
                }}
              >
                {publicLineName}
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px', lineHeight: '1.2' }}>
                  {displayDestinationName}
                </h3>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Ligne {publicLineName || 'LIVE'} • Véhicule #{vehicleNumber}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedItem(null)}
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

          {/* Real-time progress widget */}
          <div className="card-widget" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: lineColor, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Prochain Arrêt
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {displayDistance != null ? `${displayDistance}m` : '...'}
              </span>
            </div>

            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayStopName}
            </h4>

            {/* Progress bar */}
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${progress}%`,
                  ['--line-color' as any]: lineColor
                }} 
              />
              <div 
                className="progress-vehicle-icon"
                style={{ left: `${progress}%` }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="var(--bg-base)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" fill={lineColor} />
                  <path d="M8 11h8M12 7l4 4-4 4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Arrival details & delay badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {displayArrival ? formatTime(displayArrival) : '--:--'}
                </span>
              </div>

              <span className={`status-badge-outline ${isOnTime ? 'ontime' : 'delayed'}`}>
                {isOnTime ? "À l'heure" : 'Retardé'}
              </span>
            </div>
          </div>

          {/* Secondary stats grids */}
          <div className="secondary-stat-grid" style={{ position: 'relative', zIndex: 1 }}>
            <div className="secondary-stat-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Temps Réel</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>GPS Actif</span>
            </div>
            <div className="secondary-stat-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{line?.category || 'Transit'}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mode</span>
            </div>
          </div>

          {/* Follow button */}
          <button 
            className="btn-follow-vehicle"
            onClick={handleFollowOnMap}
            style={{
              position: 'relative',
              zIndex: 1,
              ['--line-color' as any]: lineColor,
              ['--glow-color' as any]: lineColor.startsWith('var') ? 'rgba(139, 92, 246, 0.1)' : `${lineColor}18`,
              ['--glow-color-border' as any]: lineColor.startsWith('var') ? 'rgba(139, 92, 246, 0.2)' : `${lineColor}33`,
              ['--glow-color-hover' as any]: lineColor.startsWith('var') ? 'rgba(139, 92, 246, 0.18)' : `${lineColor}29`,
              ['--glow-color-border-hover' as any]: lineColor.startsWith('var') ? 'rgba(139, 92, 246, 0.3)' : `${lineColor}4D`
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Suivre sur la carte
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SelectedItemDetails;
