import React, { useEffect, useState } from 'react';
import { useSpacetime } from '../../spacetime/useSpacetime';

type IngestionRunRow = {
  startedAt: { microsSinceUnixEpoch: bigint };
};

interface AdminStats {
  vehicles: number;
  alerts: number;
  lines: number;
  stops: number;
  ingestionRuns: number;
  lastIngestion?: string;
}

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { conn, connected } = useSpacetime();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (!conn || !connected) return;
    const vehicles = conn.db.vehicle_positions_current.count();
    const alerts = conn.db.alerts.count();
    const lines = conn.db.lines.count();
    const stops = conn.db.stops.count();
    const ingestionRuns = conn.db.ingestion_runs.count();

    const runs = Array.from(conn.db.ingestion_runs.iter() as Iterable<IngestionRunRow>);
    const last = runs
      .sort((a, b) => Number(b.startedAt.microsSinceUnixEpoch) - Number(a.startedAt.microsSinceUnixEpoch))[0];

    setStats({
      vehicles: Number(vehicles),
      alerts: Number(alerts),
      lines: Number(lines),
      stops: Number(stops),
      ingestionRuns: Number(ingestionRuns),
      lastIngestion: last 
        ? new Date(Number(last.startedAt.microsSinceUnixEpoch) / 1000).toLocaleString('fr-FR') 
        : undefined,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!conn || !connected) return;
    refresh();

    const update = () => refresh();
    conn.db.vehicle_positions_current.onInsert(update);
    conn.db.vehicle_positions_current.onDelete(update);
    conn.db.alerts.onInsert(update);
    conn.db.alerts.onDelete(update);
    conn.db.lines.onInsert(update);
    conn.db.lines.onDelete(update);
    conn.db.stops.onInsert(update);
    conn.db.stops.onDelete(update);
    conn.db.ingestion_runs.onInsert(update);

    return () => {
      conn.db.vehicle_positions_current.removeOnInsert(update);
      conn.db.vehicle_positions_current.removeOnDelete(update);
      conn.db.alerts.removeOnInsert(update);
      conn.db.alerts.removeOnDelete(update);
      conn.db.lines.removeOnInsert(update);
      conn.db.lines.removeOnDelete(update);
      conn.db.stops.removeOnInsert(update);
      conn.db.stops.removeOnDelete(update);
      conn.db.ingestion_runs.removeOnInsert(update);
    };
  }, [conn, connected]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(2, 6, 23, 0.7)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-dashboard-panel {
          width: 100%;
          max-width: 860px;
          border-radius: var(--radius-xl);
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(139, 92, 246, 0.2);
          box-shadow: 0 32px 64px rgba(0,0,0,0.6), var(--neon-shadow);
          overflow: hidden;
          animation: admin-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes admin-fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .admin-stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all var(--transition-fast);
        }
        .admin-stat-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .admin-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .admin-row:last-child {
          border-bottom: none;
        }
        .admin-value-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }
      ` }} />

      <div className="admin-dashboard-panel">
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--border-light)',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Supervision de Base
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Console de monitoring SpacetimeDB en temps réel
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={refresh}
              disabled={!connected}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              title="Rafraîchir les métriques"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            <button 
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div style={{ padding: '32px' }}>
          {loading && !stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 0' }}>
              <div className="spinner" style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(255, 255, 255, 0.05)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin-slow 0.8s linear infinite'
              }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mise en relation avec SpacetimeDB...</span>
            </div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              {/* Card 1: Ingestion */}
              <div className="admin-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'flex', color: 'var(--primary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                  <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    Synchronisation
                  </h4>
                </div>
                <div>
                  <div className="admin-row">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lancements totaux</span>
                    <span className="admin-value-pill" style={{ borderColor: 'rgba(139, 92, 246, 0.4)', color: 'var(--primary-hover)' }}>{stats.ingestionRuns}</span>
                  </div>
                  <div className="admin-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dernière ingestion</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stats.lastIngestion || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Network database */}
              <div className="admin-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'flex', color: 'var(--accent)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                  </span>
                  <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    Base Réseau
                  </h4>
                </div>
                <div>
                  <div className="admin-row">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lignes importées</span>
                    <span className="admin-value-pill" style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: 'var(--accent)' }}>{stats.lines}</span>
                  </div>
                  <div className="admin-row">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Arrêts cartographiés</span>
                    <span className="admin-value-pill">{stats.stops}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Realtime state */}
              <div className="admin-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'flex', color: 'var(--secondary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </span>
                  <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    Trafic Direct
                  </h4>
                </div>
                <div>
                  <div className="admin-row">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Véhicules en direct</span>
                    <span className="admin-value-pill" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--secondary)' }}>{stats.vehicles}</span>
                  </div>
                  <div className="admin-row">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alertes réseau</span>
                    <span className="admin-value-pill" style={{ 
                      borderColor: stats.alerts > 0 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-light)', 
                      color: stats.alerts > 0 ? 'var(--danger)' : 'var(--text-muted)' 
                    }}>{stats.alerts}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Aucune donnée reçue. Vérifiez que la base SpacetimeDB est lancée sur le port 3000.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
