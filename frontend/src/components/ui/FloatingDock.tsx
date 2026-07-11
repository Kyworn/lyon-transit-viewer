import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

export default function FloatingDock() {
  const {
    sidebarOpen,
    setSidebarOpen,
    routePlannerOpen,
    setRoutePlannerOpen,
    alertsPanelOpen,
    setAlertsPanelOpen,
    dashboardOpen,
    setDashboardOpen,
    closeAllPanels,
    layersPanelOpen,
    setLayersPanelOpen,
    favoritesPanelOpen,
    setFavoritesPanelOpen,
    setUserLocation,
    setCenterCoordinates,
    setZoom,
  } = useAppStore();

  const toggleLayers = () => setLayersPanelOpen(!layersPanelOpen);
  const toggleFavorites = () => setFavoritesPanelOpen(!favoritesPanelOpen);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lng: pos.coords.longitude, lat: pos.coords.latitude, accuracy: pos.coords.accuracy };
        setUserLocation(loc);
        setCenterCoordinates({ lng: loc.lng, lat: loc.lat });
        setZoom(15);
      },
      (err) => console.warn('Geolocation refusée', err),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    closeAllPanels();
    setSidebarOpen(next);
  };

  const toggleRoutePlanner = () => {
    const next = !routePlannerOpen;
    closeAllPanels();
    setRoutePlannerOpen(next);
  };

  const toggleAlerts = () => {
    const next = !alertsPanelOpen;
    closeAllPanels();
    setAlertsPanelOpen(next);
  };

  const toggleDashboard = () => {
    const next = !dashboardOpen;
    closeAllPanels();
    setDashboardOpen(next);
  };

  const items = [
    {
      label: 'Explorer',
      isActive: sidebarOpen,
      onClick: toggleSidebar,
      color: 'var(--primary)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    },
    {
      label: 'Itinéraire',
      isActive: routePlannerOpen,
      onClick: toggleRoutePlanner,
      color: 'var(--accent)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M18 15V9a4 4 0 0 0-4-4H9" />
          <polyline points="12 8 9 5 12 2" />
        </svg>
      )
    },
    {
      label: 'Alertes',
      isActive: alertsPanelOpen,
      onClick: toggleAlerts,
      color: 'var(--danger)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    },
    {
      label: 'Stats',
      isActive: dashboardOpen,
      onClick: toggleDashboard,
      color: 'var(--secondary)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      )
    },
    {
      label: 'Couches',
      isActive: layersPanelOpen,
      onClick: toggleLayers,
      color: '#06b6d4',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )
    },
    {
      label: 'Favoris',
      isActive: favoritesPanelOpen,
      onClick: toggleFavorites,
      color: '#facc15',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    },
    {
      label: 'Me localiser',
      isActive: false,
      onClick: locateMe,
      color: '#22d3ee',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      )
    }
  ];

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: 'var(--radius-full)',
      pointerEvents: 'auto',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--glass-shadow)',
    }}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <button
            onClick={item.onClick}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: item.isActive ? item.color : 'var(--text-secondary)',
              backgroundColor: item.isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'all var(--transition-fast)',
              position: 'relative',
            }}
            title={item.label}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform var(--transition-fast)',
            }}>
              {item.icon}
            </div>
            {item.isActive && (
              <span style={{
                position: 'absolute',
                bottom: '6px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: item.color,
                boxShadow: `0 0 6px ${item.color}`,
              }} />
            )}
          </button>
          {index < items.length - 1 && (
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
