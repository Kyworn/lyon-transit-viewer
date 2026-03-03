import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Drawer,
  Fab,
  Badge,
  useTheme,
  alpha,
  Toolbar,
  Fade,
  Slide,
  Snackbar,
  Alert as MuiAlert,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DirectionsIcon from '@mui/icons-material/Directions';
import CloseIcon from '@mui/icons-material/Close';
import { useSelectionStore } from './stores/selectionStore';

// Components
import ModernSidebar from './components/ModernSidebar';
import MapComponent from './components/Map';
import SelectedItemDetails from './components/SelectedItemDetails';
import AlertsPanel from './components/AlertsPanel';
import DashboardStats from './components/DashboardStats';
import AdminDashboard from './components/AdminDashboard';
import MapControls from './components/MapControls';
import RoutePlanner from './components/RoutePlanner';
import JourneyNavigator from './components/JourneyNavigator';
import FloatingDock from './components/FloatingDock';
import FloatingStatus from './components/FloatingStatus';

// Hooks
import { useAlerts } from './hooks/useAlerts';

// Constants
import { DIMENSIONS, Z_INDEX } from './constants/responsive';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed for "Immersive Map"
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineSelectedNotif, setShowLineSelectedNotif] = useState(false);
  const [mapLayers, setMapLayers] = useState({
    showStops: true,
    showVehicles: true,
    showLines: true,
  });

  const selectedItem = useSelectionStore((state) => state.selectedItem);
  const selectedLine = useSelectionStore((state) => state.selectedLine);
  const setSelectedItem = useSelectionStore((state) => state.setSelectedItem);
  const { data: alerts } = useAlerts();
  const alertCount = alerts?.length || 0;

  // Show notification when line is selected
  useEffect(() => {
    if (selectedLine) {
      setShowLineSelectedNotif(true);
    }
  }, [selectedLine]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleCenterOnLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          useSelectionStore.getState().setCenterCoordinates({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleLayerToggle = (layer: 'stops' | 'vehicles' | 'lines') => {
    setMapLayers((prev) => ({
      ...prev,
      [`show${layer.charAt(0).toUpperCase() + layer.slice(1)}`]:
        !prev[`show${layer.charAt(0).toUpperCase() + layer.slice(1)}` as keyof typeof prev],
    }));
  };

  const closeAllPanels = () => {
    setSidebarOpen(false);
    setAlertsPanelOpen(false);
    setDashboardOpen(false);
    setRoutePlannerOpen(false);
    setAdminDashboardOpen(false);
    setSelectedItem(null);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', bgcolor: 'background.default', position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(900px circle at 5% 10%, rgba(14,165,233,0.18), transparent 50%), radial-gradient(700px circle at 100% 95%, rgba(249,115,22,0.16), transparent 48%)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 92%)',
          zIndex: 0,
        }}
      />

      {/* 1. FLOATING STATUS (Dynamic Island) */}
      <FloatingStatus />

      {/* 2. FLOATING EXPLORER (Search Panel) */}
      {/* Only visible when toggled via Dock */}
      {/* 2. FLOATING EXPLORER (Search Panel) */}
      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            zIndex: Z_INDEX.sidebar,
            '& .MuiDrawer-paper': {
              height: '85vh',
              borderRadius: '24px 24px 0 0',
              bgcolor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(20px)',
              borderTop: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            }
          }}
        >
          <ModernSidebar
            open={true} // Always open inside the drawer
            onClose={() => setSidebarOpen(false)}
            onOpenRoutePlanner={() => {
              setSidebarOpen(false);
              setRoutePlannerOpen(true);
            }}
          />
        </Drawer>
      ) : (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: Z_INDEX.sidebar,
            pointerEvents: 'none', // Let clicks pass through the container
            height: '100vh',
            width: 'min(460px, 44vw)',
          }}
        >
          <ModernSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOpenRoutePlanner={() => setRoutePlannerOpen(true)}
          />
        </Box>
      )}

      {/* 3. MAIN CONTENT (Map) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Map is now full screen behind everything */}
        <Fade in timeout={500}>
          <Box sx={{ width: '100%', height: '100%' }}>
            <MapComponent />
          </Box>
        </Fade>

        {/* Map Controls */}
        <Fade in timeout={800}>
          <Box>
            <MapControls
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
              onCenterOnLocation={handleCenterOnLocation}
              layers={mapLayers}
              onLayerToggle={handleLayerToggle}
            />
          </Box>
        </Fade>

        {/* Journey Navigator (step-by-step navigation) */}
        <JourneyNavigator />
      </Box>

      {/* 4. FLOATING DOCK (Bottom Nav) */}
      <FloatingDock
        onToggleDashboard={() => {
          const next = !dashboardOpen;
          closeAllPanels();
          setDashboardOpen(next);
        }}
        onToggleAlerts={() => {
          const next = !alertsPanelOpen;
          closeAllPanels();
          setAlertsPanelOpen(next);
        }}
        onToggleRoutes={() => {
          const next = !routePlannerOpen;
          closeAllPanels();
          setRoutePlannerOpen(next);
        }}
        onToggleSearch={() => {
          const next = !sidebarOpen;
          closeAllPanels();
          setSidebarOpen(next);
        }}
      />

      {/* 5. PANELS & DRAWERS */}

      {/* Right Details Drawer (Now self-managed floating component) */}
      {selectedItem && <SelectedItemDetails />}

      {/* Alerts Panel */}
      {alertsPanelOpen && (
        <AlertsPanel
          open={alertsPanelOpen}
          onClose={() => setAlertsPanelOpen(false)}
        />
      )}

      {/* Route Planner */}
      {routePlannerOpen && (
        <RoutePlanner
          open={routePlannerOpen}
          onClose={() => setRoutePlannerOpen(false)}
        />
      )}

      {/* Dashboard Drawer */}
      {dashboardOpen && (
        <Drawer
          variant="temporary"
          anchor="bottom"
          open={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              height: isMobile ? '90vh' : (isTablet ? '70vh' : '50vh'),
              borderRadius: isMobile ? 0 : '32px 32px 0 0',
              background: 'rgba(5, 5, 5, 0.85)',
              backdropFilter: 'blur(40px)',
              boxShadow: `0 -20px 50px rgba(0,0,0,0.5)`,
              borderTop: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              zIndex: Z_INDEX.drawer,
            },
          }}
          transitionDuration={500}
        >
          <Slide direction="up" in={dashboardOpen} timeout={500}>
            <Box>
              <DashboardStats />
            </Box>
          </Slide>
        </Drawer>
      )}

      {/* Admin Dashboard Drawer */}
      {adminDashboardOpen && (
        <Drawer
          variant="temporary"
          anchor="top"
          open={adminDashboardOpen}
          onClose={() => setAdminDashboardOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              height: '90vh',
              background: 'rgba(5, 5, 5, 0.95)',
              backdropFilter: 'blur(40px)',
              overflowY: 'auto',
              zIndex: Z_INDEX.drawer,
            },
          }}
          transitionDuration={400}
        >
          <AdminDashboard onClose={() => setAdminDashboardOpen(false)} />
        </Drawer>
      )}

      {/* Line Selected Notification */}
      <Snackbar
        open={showLineSelectedNotif}
        autoHideDuration={3000}
        onClose={() => setShowLineSelectedNotif(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          mt: { xs: 12, md: 14 }, // Push down below status bar
          zIndex: Z_INDEX.snackbar,
        }}
      >
        <MuiAlert
          onClose={() => setShowLineSelectedNotif(false)}
          severity="success"
          variant="filled"
          sx={{
            borderRadius: '100px',
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            fontSize: { xs: '0.875rem', md: '1rem' },
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            color: theme.palette.primary.main,
            fontWeight: 700,
          }}
        >
          Ligne {selectedLine?.line_code} sélectionnée - Direction: {selectedLine?.destination_name}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default App;
