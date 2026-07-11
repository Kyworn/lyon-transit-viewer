import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useAlerts } from '../../hooks/useAlerts';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertsPanel() {
  const { alertsPanelOpen, setAlertsPanelOpen } = useAppStore();
  const { data: alerts, isLoading } = useAlerts();
  const [search, setSearch] = useState('');

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    if (!search.trim()) return alerts;
    const q = search.toLowerCase();
    return alerts.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.message?.toLowerCase().includes(q) ||
      (a.affected_lines || []).some(l => l.toLowerCase().includes(q))
    );
  }, [alerts, search]);

  return (
    <AnimatePresence>
      {alertsPanelOpen && (
        <motion.div
          initial={{ x: 424, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 424, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="alerts-panel-wrapper"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .alerts-panel-wrapper {
              position: absolute;
              top: 0;
              right: 0;
              width: 400px;
              height: calc(100% - 48px);
              margin: 24px 24px 24px 0;
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
              .alerts-panel-wrapper {
                position: fixed !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                top: 0 !important;
                right: 0 !important;
                z-index: 130 !important;
              }
            }
            .alerts-panel-wrapper:hover {
              border-color: rgba(255, 255, 255, 0.12);
            }
            .alert-item-card {
              transition: all var(--transition-fast);
              border: 1px solid var(--border-light) !important;
            }
            .alert-item-card:hover {
              border-color: rgba(244, 63, 94, 0.3) !important;
              background-color: rgba(244, 63, 94, 0.03) !important;
              box-shadow: 0 4px 12px rgba(244, 63, 94, 0.05);
            }
          ` }} />

          {/* Header section */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-light)',
            background: 'linear-gradient(to bottom, rgba(244, 63, 94, 0.03) 0%, transparent 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--danger) 0%, #be123c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(244, 63, 94, 0.3)',
                  color: 'white',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div>
                  <h3 style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '-0.3px',
                    color: 'var(--text-primary)',
                  }}>
                    Alertes Trafic
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Réseau TCL en direct
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setAlertsPanelOpen(false)}
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
                  e.currentTarget.style.color = 'var(--danger)';
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
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

            {/* Search bar input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Rechercher une ligne, un incident..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(244, 63, 94, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>
          </div>

          {/* Alerts dynamic list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: '96px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }} className="animate-pulse-slow" />
                ))}
              </div>
            ) : filteredAlerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="glass-panel alert-item-card"
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{
                        color: alert.severity_type === 'SIGNIFICANT_DELAYS' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alert.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {alert.affected_lines?.map(line => (
                            <span key={line} style={{
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '9px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-light)',
                            }}>
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                      {alert.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>
                        {alert.start_time ? new Date(alert.start_time).toLocaleDateString('fr-FR') : 'Permanent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '12px', opacity: 0.3, display: 'inline-block' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                </svg>
                <p style={{ fontSize: '13px' }}>Aucune alerte trafic active</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
