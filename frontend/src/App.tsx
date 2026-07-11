import React, { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useUrlSync } from './hooks/useUrlSync';
import { useBreakpoint } from './hooks/useBreakpoint';
import { useSpacetime } from './spacetime/useSpacetime';

// Sleek Custom Components
import MapComponent from './components/map/Map';
import Sidebar from './components/sidebar/Sidebar';
import StopDetailsModal from './components/sidebar/StopDetailsModal';
import SelectedItemDetails from './components/sidebar/SelectedItemDetails';
import RoutePlanner from './components/route/RoutePlanner';
import JourneyNavigator from './components/route/JourneyNavigator';
import AdminDashboard from './components/dashboard/AdminDashboard';
import DashboardStats from './components/dashboard/DashboardStats';
import Header from './components/ui/Header';
import FloatingDock from './components/ui/FloatingDock';
import AlertsPanel from './components/ui/AlertsPanel';
import LayersPanel from './components/ui/LayersPanel';
import FavoritesPanel from './components/ui/FavoritesPanel';
import Onboarding from './components/ui/Onboarding';
import Splash from './components/ui/Splash';

export default function App() {
  const {
    sidebarOpen,
    alertsPanelOpen,
    selectedStop,
    setSelectedStop,
    themeMode,
    selectedItem,
    selectedJourney,
    routePlannerOpen,
    setRoutePlannerOpen,
    adminDashboardOpen,
    setAdminDashboardOpen,
    dashboardOpen,
    setDashboardOpen,
  } = useAppStore();

  const { isMobile } = useBreakpoint();
  // Defer the MapLibre WebGL mount until connected so its main-thread freeze
  // happens under the Splash overlay instead of stuttering visible UI.
  const { connected } = useSpacetime();
  // On mobile, fullscreen panels are immersive: hide the floating Header + Dock
  // so no chrome overlaps a panel's own close button (was inconsistent per panel).
  const hideChrome = isMobile && (sidebarOpen || alertsPanelOpen || routePlannerOpen || adminDashboardOpen);

  // Sync theme attribute to document body for standard theme toggles
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Sync URL with state
  useUrlSync();

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-base)',
    }}>
      {/* 1. Neon Aura Background Glow Layer */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(900px circle at 8% 12%, rgba(139, 92, 246, 0.12), transparent 50%),
            radial-gradient(700px circle at 92% 85%, rgba(16, 185, 129, 0.08), transparent 50%)
          `,
          zIndex: 0,
        }}
        className="animate-pulse-slow"
      />

      {/* 2. Global Premium Header Nav Fix (Floating Overlay) */}
      {!hideChrome && <Header />}

      {/* 3. Main Coordinates Workspace (Sidebar overlaying MapLibre Canvas) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        {/* Unified Search/Details Navigation Drawer */}
        <Sidebar />

        {/* Dynamic MapLibre Rendering Layer */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {connected && <MapComponent />}
        </div>

        {/* Selected Stop Details Pop-over Card */}
        {selectedStop && (
          <StopDetailsModal 
            stop={selectedStop} 
            onClose={() => setSelectedStop(null)} 
            lineIcons={null} 
            anchorPosition={null} 
          />
        )}

        {/* Selected Vehicle Details Pop-over Card */}
        {selectedItem && selectedItem.type === 'vehicle' && (
          <SelectedItemDetails />
        )}

        {/* Global Network Alerts Layer Drawer */}
        <AlertsPanel />
      </div>

      {/* 4. Route Planner Left Overlay Drawer */}
      <RoutePlanner 
        open={routePlannerOpen} 
        onClose={() => setRoutePlannerOpen(false)} 
      />

      {/* 5. Journey Step-by-Step Navigator Panel */}
      {selectedJourney && <JourneyNavigator />}

      {/* 6. Centered Analytics Dashboard stats overlay */}
      {dashboardOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.65)',
            backdropFilter: 'blur(16px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }} 
          onClick={() => setDashboardOpen(false)}
        >
          <div 
            className="glass-panel" 
            style={{
              width: '100%',
              maxWidth: '960px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: 'var(--radius-xl)',
              padding: '12px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setDashboardOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <DashboardStats />
          </div>
        </div>
      )}

      {/* 7. Super-Admin Supervision Dashboard Center Overlay */}
      {adminDashboardOpen && (
        <AdminDashboard onClose={() => setAdminDashboardOpen(false)} />
      )}

      {!hideChrome && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}>
          <FloatingDock />
        </div>
      )}
      <LayersPanel />
      <FavoritesPanel />
      <Onboarding />
      <Splash />
    </div>
  );
}
