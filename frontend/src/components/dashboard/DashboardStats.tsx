import React, { useMemo } from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useAlerts } from '../../hooks/useAlerts';
import { useLines } from '../../hooks/useLines';
import { useStops } from '../../hooks/useStops';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color, icon }) => {
  const isVar = color.startsWith('var');
  const glowColor = isVar ? 'rgba(139, 92, 246, 0.2)' : `${color}2D`;
  const borderColor = isVar ? 'var(--border-light)' : `${color}59`;

  return (
    <div 
      className="glass-panel metric-card-hover" 
      style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        background: `linear-gradient(140deg, ${glowColor} 0%, rgba(15, 23, 42, 0.6) 100%)`,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <div>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
          {title}
        </span>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
          {value.toLocaleString('fr-FR')}
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      </div>

      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glowColor,
        border: `1px solid ${borderColor}`,
        color: color
      }}>
        {icon}
      </div>
    </div>
  );
};

const DashboardStats: React.FC = () => {
  const { data: vehicles } = useVehicles(undefined, undefined, undefined, true);
  const { data: alerts } = useAlerts();
  const { data: lines } = useLines();
  const { data: stops } = useStops(true);

  const lineMap = useMemo(() => {
    const map = new Map<string, string>();
    (lines || []).forEach((line) => map.set(line.line_sort_code, line.category));
    return map;
  }, [lines]);

  const vehicleByMode = useMemo(() => {
    let bus = 0;
    let tram = 0;
    let metro = 0;
    (vehicles || []).forEach((vehicle) => {
      const lineRef = vehicle.line_ref || '';
      const code = lineRef.includes('::') ? lineRef.split('::')[1]?.split(':')[0] : '';
      const category = code ? lineMap.get(code) : '';
      if (category === 'metro') metro += 1;
      else if (category === 'tram') tram += 1;
      else bus += 1;
    });
    return { bus, tram, metro };
  }, [vehicles, lineMap]);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .metric-card-hover {
          transition: all var(--transition-fast) !important;
        }
        .metric-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: var(--glass-shadow);
        }
        .metrics-grid-four {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .metrics-grid-three {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .metrics-grid-four {
            grid-template-columns: repeat(2, 1fr);
          }
          .metrics-grid-three {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 500px) {
          .metrics-grid-four {
            grid-template-columns: 1fr;
          }
        }
      ` }} />

      <div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
          Statistiques du Réseau
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Données consolidées temps réel
        </span>
      </div>

      {/* Row 1: Global metrics */}
      <div className="metrics-grid-four">
        <MetricCard 
          title="Véhicules"
          value={vehicles?.length || 0}
          subtitle="Actifs en direct"
          color="var(--secondary)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <line x1="9" y1="18" x2="15" y2="18" />
              <line x1="9" y1="6" x2="15" y2="6" />
            </svg>
          }
        />
        
        <MetricCard 
          title="Perturbations"
          value={alerts?.length || 0}
          subtitle="Alertes trafic"
          color={alerts && alerts.length > 0 ? 'var(--danger)' : 'var(--text-muted)'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />

        <MetricCard 
          title="Lignes"
          value={lines ? new Set(lines.map((l) => l.line_sort_code)).size : 0}
          subtitle="Parcours indexés"
          color="var(--primary)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          }
        />

        <MetricCard 
          title="Points d'Arrêt"
          value={stops?.length || 0}
          subtitle="Desservis"
          color="var(--accent)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
        />
      </div>

      {/* Row 2: Transit splits */}
      <div className="metrics-grid-three">
        <MetricCard
          title="Réseau Bus"
          value={vehicleByMode.bus}
          subtitle="Bus en service direct"
          color="#F97316" // Orange
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <circle cx="8" cy="18" r="1.5" />
              <circle cx="16" cy="18" r="1.5" />
              <line x1="4" y1="14" x2="20" y2="14" />
            </svg>
          }
        />
        
        <MetricCard
          title="Réseau Tramway"
          value={vehicleByMode.tram}
          subtitle="Rames en circulation"
          color="#10B981" // Emerald green
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="3" width="12" height="18" rx="2" />
              <line x1="9" y1="21" x2="9" y2="3" />
              <line x1="15" y1="21" x2="15" y2="3" />
            </svg>
          }
        />
        
        <MetricCard
          title="Réseau Métro"
          value={vehicleByMode.metro}
          subtitle="Trains de métro actifs"
          color="#06B6D4" // Cyan
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <circle cx="7" cy="15" r="1" />
              <circle cx="17" cy="15" r="1" />
            </svg>
          }
        />
      </div>
    </div>
  );
};

export default DashboardStats;
