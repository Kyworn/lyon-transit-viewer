import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useAlerts } from '../../hooks/useAlerts';

export default function Header() {
  const {
    sidebarOpen,
    routePlannerOpen,
    themeMode,
    toggleTheme,
    alertsPanelOpen,
    setAlertsPanelOpen,
    adminDashboardOpen,
    setAdminDashboardOpen,
  } = useAppStore();

  const { data: alerts } = useAlerts();
  const alertCount = alerts?.length || 0;

  // Real-time ticking clock state
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .main-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          margin: 24px 24px 0 24px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
          pointer-events: auto;
          border: 1px solid var(--border-light);
          transition: margin-left var(--transition-normal), margin-right var(--transition-normal), border-color var(--transition-normal), background var(--transition-normal);
          margin-left: ${(sidebarOpen || routePlannerOpen) ? '448px' : '24px'};
          margin-right: ${alertsPanelOpen ? '448px' : '24px'};
        }

        .header-brand-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-status-widget {
          padding: 6px 16px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.04);
          color: var(--text-primary);
          transition: all var(--transition-normal);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--secondary);
          box-shadow: 0 0 8px var(--secondary-glow);
          animation: pulse-live 2s infinite;
        }

        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        .header-clock {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.5px;
        }

        .header-divider {
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.15);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 992px) {
          .main-header {
            margin-left: 24px !important;
            margin-right: 24px !important;
          }
        }

        @media (max-width: 768px) {
          .main-header {
            margin: 16px 16px 0 16px !important;
            padding: 10px 16px;
          }
          .header-tagline {
            display: none;
          }
          .header-brand-container {
            gap: 12px;
          }
        }

        @media (max-width: 520px) {
          .header-status-widget {
            display: none; /* Hide clock on mobile to prevent layout issues */
          }
          .main-header {
            margin: 12px 12px 0 12px !important;
            padding: 8px 12px;
          }
        }
      `}} />

      <header className="glass-panel main-header">
        {/* Brand logo & tagline */}
        <div className="header-brand-container">
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--neon-shadow)',
            position: 'relative',
          }}>
            {/* Custom SVG logo representing rapid transit lines */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h1" />
              <circle cx="16" cy="17" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
              fontFamily: 'Outfit',
            }}>Lyon Transit</h1>
            <p className="header-tagline" style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}>Réseau TCL en temps réel</p>
          </div>
        </div>

        {/* Unified Live Clock & Connection Status Widget */}
        <div className="header-status-widget">
          <div className="live-indicator">
            <span className="live-dot" />
            <span style={{
              color: 'var(--secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: '10px',
              fontWeight: 800,
            }}>TCL Live</span>
          </div>
          <div className="header-divider" />
          <div className="header-clock">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Network Stats & Control toggles */}
        <div className="header-actions">
          {/* Alerts count badge */}
          <button 
            onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
            className="glass-panel" 
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              color: alertCount > 0 ? 'var(--danger)' : 'var(--text-secondary)',
              borderColor: alertCount > 0 ? 'rgba(244, 63, 94, 0.2)' : 'var(--border-light)',
              background: alertCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{alertCount} alertes</span>
          </button>

          {/* Admin Dashboard toggle */}
          <button
            onClick={() => setAdminDashboardOpen(!adminDashboardOpen)}
            className="glass-panel"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              borderColor: adminDashboardOpen ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-light)',
              background: adminDashboardOpen ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
            }}
            title="Panneau d'administration"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="glass-panel"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
            title="Basculer le thème"
          >
            {themeMode === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
