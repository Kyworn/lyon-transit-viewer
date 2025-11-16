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
import Header from './components/Header';
import ModernSidebar from './components/ModernSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import MapComponent from './components/Map';
import SelectedItemDetails from './components/SelectedItemDetails';
import AlertsPanel from './components/AlertsPanel';
import DashboardStats from './components/DashboardStats';
import AdminDashboard from './components/AdminDashboard';
import MapControls from './components/MapControls';
import RoutePlanner from './components/RoutePlanner';
import JourneyNavigator from './components/JourneyNavigator';

// Hooks
import { useAlerts } from './hooks/useAlerts';

// Constants
import { DIMENSIONS, Z_INDEX } from './constants/responsive';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile); // Close by default on mobile
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineSelectedNotif, setShowLineSelectedNotif] = useState(false);
  const [mobileBottomNavValue, setMobileBottomNavValue] = useState(0);
  const [mapLayers, setMapLayers] = useState({
    showStops: true,
    showVehicles: true,
    showLines: true,
  });

  const selectedItem = useSelectionStore((state) => state.selectedItem);
  const selectedLine = useSelectionStore((state) => state.selectedLine);
  const { data: alerts } = useAlerts();
  const alertCount = alerts?.length || 0;

  // Get responsive sidebar width
  const sidebarWidth = isMobile ? DIMENSIONS.sidebar.mobile : (isTablet ? DIMENSIONS.sidebar.tablet : DIMENSIONS.sidebar.desktop);

  // Close sidebar on mobile when screen size changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Show notification when line is selected
  useEffect(() => {
    if (selectedLine) {
      setShowLineSelectedNotif(true);
    }
  }, [selectedLine]);

  // Handle mobile bottom navigation
  const handleMobileBottomNavChange = (event: React.SyntheticEvent, newValue: number) => {
    setMobileBottomNavValue(newValue);

    // Close all panels first
    setSidebarOpen(false);
    setAlertsPanelOpen(false);
    setDashboardOpen(false);
    setRoutePlannerOpen(false);

    // Open the selected panel
    switch (newValue) {
      case 0: // Explorer
        setSidebarOpen(true);
        break;
      case 1: // Alertes
        setAlertsPanelOpen(true);
        break;
      case 2: // Stats
        setDashboardOpen(true);
        break;
      case 3: // Itinéraire
        setRoutePlannerOpen(true);
        break;
    }
  };

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

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
    if (!sidebarOpen) {
      setMobileBottomNavValue(0);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Header */}
      <Header
        onOpenAdminDashboard={() => setAdminDashboardOpen(true)}
        onMenuClick={isMobile ? handleMenuClick : undefined}
      />

      {/* Left Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? sidebarWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            border: 'none',
            background: isMobile ? alpha(theme.palette.background.default, 0.98) : theme.palette.background.default,
            backdropFilter: isMobile ? 'blur(20px)' : 'none',
            transition: theme.transitions.create(['transform'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            zIndex: isMobile ? Z_INDEX.drawer : Z_INDEX.sidebar,
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        <ModernSidebar />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          position: 'relative',
          width: '100%',
          height: '100vh',
          pb: isMobile ? `${DIMENSIONS.bottomNav.height}px` : 0, // Add padding for bottom nav on mobile
        }}
      >
        <Toolbar />

        {/* Map */}
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

        {/* Desktop: Floating Action Buttons */}
        {!isMobile && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 32,
              left: 32,
              zIndex: Z_INDEX.mapControls,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* Menu Toggle (visible only when sidebar is closed) */}
            {!sidebarOpen && (
              <motion.div
                initial={{ scale: 0, x: -100 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
              >
                <Fab
                  color="primary"
                  size="large"
                  onClick={() => setSidebarOpen(true)}
                  sx={{
                    width: 64,
                    height: 64,
                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
                      boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
                    },
                  }}
                >
                  <MenuIcon sx={{ fontSize: 28 }} />
                </Fab>
              </motion.div>
            )}

            {/* Dashboard Toggle */}
            <motion.div
              initial={{ scale: 0, x: -100 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Fab
                color="secondary"
                size="large"
                onClick={() => setDashboardOpen(!dashboardOpen)}
                sx={{
                  width: 64,
                  height: 64,
                  boxShadow: `0 12px 32px ${alpha(theme.palette.secondary.main, 0.4)}`,
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                  border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: `0 16px 40px ${alpha(theme.palette.secondary.main, 0.5)}`,
                  },
                }}
              >
                <DashboardIcon sx={{ fontSize: 28 }} />
              </Fab>
            </motion.div>

            {/* Route Planner Toggle */}
            <motion.div
              initial={{ scale: 0, x: -100 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Fab
                size="large"
                onClick={() => setRoutePlannerOpen(!routePlannerOpen)}
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: theme.palette.info.main,
                  color: 'white',
                  boxShadow: `0 12px 32px ${alpha(theme.palette.info.main, 0.4)}`,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                  border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.light} 100%)`,
                    boxShadow: `0 16px 40px ${alpha(theme.palette.info.main, 0.5)}`,
                  },
                }}
              >
                <DirectionsIcon sx={{ fontSize: 28 }} />
              </Fab>
            </motion.div>

            {/* Alerts Toggle */}
            <motion.div
              initial={{ scale: 0, x: -100 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge
                badgeContent={alertCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    minWidth: 24,
                    height: 24,
                    borderRadius: '12px',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.5)}`,
                    animation: alertCount > 0 ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': {
                        transform: 'scale(1)',
                      },
                      '50%': {
                        transform: 'scale(1.1)',
                      },
                    },
                  },
                }}
              >
                <Fab
                  size="large"
                  onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
                  sx={{
                    width: 64,
                    height: 64,
                    backgroundColor: theme.palette.warning.main,
                    color: 'white',
                    boxShadow: `0 12px 32px ${alpha(theme.palette.warning.main, 0.4)}`,
                    background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                    border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.error.main} 100%)`,
                      boxShadow: `0 16px 40px ${alpha(theme.palette.warning.main, 0.5)}`,
                    },
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 28 }} />
                </Fab>
              </Badge>
            </motion.div>
          </Box>
        )}

        {/* Mobile: Bottom Navigation */}
        {isMobile && (
          <MobileBottomNav
            value={mobileBottomNavValue}
            onChange={handleMobileBottomNavChange}
            alertCount={alertCount}
          />
        )}
      </Box>

      {/* Right Details Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={selectedItem !== null}
        onClose={() => useSelectionStore.getState().setSelectedItem(null)}
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : (isTablet ? '80vw' : DIMENSIONS.drawer.desktop),
            boxSizing: 'border-box',
            background: alpha(theme.palette.background.default, 0.95),
            backdropFilter: 'blur(10px)',
            zIndex: Z_INDEX.drawer,
          },
        }}
        transitionDuration={400}
      >
        <Toolbar />
        <Slide direction="left" in={selectedItem !== null} timeout={400}>
          <Box>
            <SelectedItemDetails />
          </Box>
        </Slide>
      </Drawer>

      {/* Alerts Panel */}
      <AlertsPanel
        open={alertsPanelOpen}
        onClose={() => {
          setAlertsPanelOpen(false);
          if (isMobile) setMobileBottomNavValue(-1);
        }}
      />

      {/* Route Planner */}
      <RoutePlanner
        open={routePlannerOpen}
        onClose={() => {
          setRoutePlannerOpen(false);
          if (isMobile) setMobileBottomNavValue(-1);
        }}
      />

      {/* Dashboard Drawer */}
      <Drawer
        variant="temporary"
        anchor="bottom"
        open={dashboardOpen}
        onClose={() => {
          setDashboardOpen(false);
          if (isMobile) setMobileBottomNavValue(-1);
        }}
        sx={{
          '& .MuiDrawer-paper': {
            height: isMobile ? '90vh' : (isTablet ? '70vh' : '50vh'),
            borderRadius: isMobile ? 0 : '24px 24px 0 0',
            background: alpha(theme.palette.background.default, 0.98),
            backdropFilter: 'blur(20px)',
            boxShadow: `0 -8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
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

      {/* Admin Dashboard Drawer */}
      <Drawer
        variant="temporary"
        anchor="top"
        open={adminDashboardOpen}
        onClose={() => setAdminDashboardOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            height: '90vh',
            background: alpha(theme.palette.background.default, 0.98),
            backdropFilter: 'blur(20px)',
            overflowY: 'auto',
            zIndex: Z_INDEX.drawer,
          },
        }}
        transitionDuration={400}
      >
        <AdminDashboard onClose={() => setAdminDashboardOpen(false)} />
      </Drawer>

      {/* Line Selected Notification */}
      <Snackbar
        open={showLineSelectedNotif}
        autoHideDuration={3000}
        onClose={() => setShowLineSelectedNotif(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          mt: { xs: 7, md: 10 },
          zIndex: Z_INDEX.snackbar,
        }}
      >
        <MuiAlert
          onClose={() => setShowLineSelectedNotif(false)}
          severity="success"
          variant="filled"
          sx={{
            borderRadius: '12px',
            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.3)}`,
            fontSize: { xs: '0.875rem', md: '1rem' },
          }}
        >
          Ligne {selectedLine?.line_code} sélectionnée - Direction: {selectedLine?.destination_name}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default App;
