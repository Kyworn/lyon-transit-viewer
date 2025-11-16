import React, { useState } from 'react';
import { Box, Drawer, IconButton, Fab, Badge, useTheme, alpha, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useSelectionStore } from './stores/selectionStore';

// Components
import Header from './components/Header';
import EnhancedSidebar from './components/EnhancedSidebar';
import MapComponent from './components/Map';
import SelectedItemDetails from './components/SelectedItemDetails';
import AlertsPanel from './components/AlertsPanel';
import DashboardStats from './components/DashboardStats';
import MapControls from './components/MapControls';

// Hooks
import { useAlerts } from './hooks/useAlerts';

const drawerWidth = 380;

function App() {
  const theme = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLayers, setMapLayers] = useState({
    showStops: true,
    showVehicles: true,
    showLines: true,
  });

  const selectedItem = useSelectionStore((state) => state.selectedItem);
  const { data: alerts } = useAlerts();
  const alertCount = alerts?.length || 0;

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
      [`show${layer.charAt(0).toUpperCase() + layer.slice(1)}`]: !prev[`show${layer.charAt(0).toUpperCase() + layer.slice(1)}` as keyof typeof prev],
    }));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Header */}
      <Header />

      {/* Left Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        <Toolbar /> {/* Spacer for Header */}
        <EnhancedSidebar />
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          position: 'relative',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: sidebarOpen ? 0 : `-${drawerWidth}px`,
        }}
      >
        <Toolbar /> {/* Spacer for Header */}

        {/* Map */}
        <MapComponent />

        {/* Map Controls */}
        <MapControls
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
          onCenterOnLocation={handleCenterOnLocation}
          layers={mapLayers}
          onLayerToggle={handleLayerToggle}
        />

        {/* Floating Action Buttons */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: sidebarOpen ? 24 : 24,
            zIndex: 1000,
            transition: theme.transitions.create('left', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          {/* Menu Toggle */}
          <Fab
            color="primary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{
              mb: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              },
            }}
          >
            <MenuIcon />
          </Fab>

          {/* Dashboard Toggle */}
          <Fab
            color="secondary"
            onClick={() => setDashboardOpen(!dashboardOpen)}
            sx={{
              mb: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          >
            <DashboardIcon />
          </Fab>

          {/* Alerts Toggle */}
          <Badge badgeContent={alertCount} color="error" max={99}>
            <Fab
              onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
              sx={{
                backgroundColor: theme.palette.warning.main,
                color: 'white',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                '&:hover': {
                  backgroundColor: theme.palette.warning.dark,
                },
              }}
            >
              <NotificationsIcon />
            </Fab>
          </Badge>
        </Box>
      </Box>

      {/* Right Details Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={selectedItem !== null}
        onClose={() => useSelectionStore.getState().setSelectedItem(null)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: drawerWidth },
            boxSizing: 'border-box',
            background: alpha(theme.palette.background.default, 0.95),
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <Toolbar /> {/* Spacer for Header */}
        <SelectedItemDetails />
      </Drawer>

      {/* Alerts Panel */}
      <AlertsPanel open={alertsPanelOpen} onClose={() => setAlertsPanelOpen(false)} />

      {/* Dashboard Drawer */}
      <Drawer
        variant="temporary"
        anchor="bottom"
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            height: { xs: '80vh', md: '50vh' },
            borderRadius: '24px 24px 0 0',
            background: alpha(theme.palette.background.default, 0.98),
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DashboardStats />
      </Drawer>
    </Box>
  );
}

export default App;
