import React, { useState } from 'react';
import {
  Box,
  Card,
  IconButton,
  Typography,
  Switch,
  Stack,
  Divider,
  Chip,
  alpha,
  useTheme,
  Tooltip,
  Collapse,
  useMediaQuery,
  Fab,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import SubwayIcon from '@mui/icons-material/Subway';
import PlaceIcon from '@mui/icons-material/Place';
import RouteIcon from '@mui/icons-material/Route';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { DIMENSIONS, Z_INDEX } from '../constants/responsive';

interface MapControlsProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onCenterOnLocation?: () => void;
  layers?: {
    showStops: boolean;
    showVehicles: boolean;
    showLines: boolean;
  };
  onLayerToggle?: (layer: 'stops' | 'vehicles' | 'lines') => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onToggleFullscreen,
  isFullscreen = false,
  onCenterOnLocation,
  layers = { showStops: true, showVehicles: true, showLines: true },
  onLayerToggle,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: {
          xs: 72, // Below mobile header
          sm: 80,
          md: 90,
        },
        right: {
          xs: 8,
          sm: 12,
          md: 16,
        },
        zIndex: Z_INDEX.mapControls,
      }}
    >
      <Stack spacing={{ xs: 0.75, md: 1 }}>
        {/* Legend Card - Collapsible on mobile */}
        <Card
          sx={{
            borderRadius: { xs: '10px', md: '12px' },
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
            minWidth: { xs: 'auto', md: 200 },
          }}
        >
          <Box
            sx={{
              p: { xs: 1, md: 1.5 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.05),
              },
            }}
            onClick={() => setLegendOpen(!legendOpen)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LayersIcon sx={{ mr: { xs: 0.5, md: 1 }, color: theme.palette.primary.main, fontSize: { xs: 20, md: 24 } }} />
              {!isMobile && (
                <Typography variant="subtitle2" fontWeight={600}>
                  Calques
                </Typography>
              )}
            </Box>
            <IconButton size="small" sx={{ p: { xs: 0.5, md: 1 } }}>
              {legendOpen ? <ExpandLessIcon fontSize={isMobile ? 'small' : 'medium'} /> : <ExpandMoreIcon fontSize={isMobile ? 'small' : 'medium'} />}
            </IconButton>
          </Box>

          <Collapse in={legendOpen}>
            <Divider />
            <Box sx={{ p: { xs: 1.5, md: 2 } }}>
              <Stack spacing={{ xs: 1, md: 1.5 }}>
                {/* Stops Layer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PlaceIcon sx={{ mr: { xs: 0.75, md: 1 }, fontSize: { xs: 18, md: 20 }, color: theme.palette.info.main }} />
                    <Typography variant="body2" fontSize={{ xs: '0.8rem', md: '0.875rem' }}>Arrêts</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={layers.showStops}
                    onChange={() => onLayerToggle?.('stops')}
                  />
                </Box>

                {/* Vehicles Layer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DirectionsBusIcon sx={{ mr: { xs: 0.75, md: 1 }, fontSize: { xs: 18, md: 20 }, color: theme.palette.success.main }} />
                    <Typography variant="body2" fontSize={{ xs: '0.8rem', md: '0.875rem' }}>Véhicules</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={layers.showVehicles}
                    onChange={() => onLayerToggle?.('vehicles')}
                  />
                </Box>

                {/* Lines Layer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <RouteIcon sx={{ mr: { xs: 0.75, md: 1 }, fontSize: { xs: 18, md: 20 }, color: theme.palette.warning.main }} />
                    <Typography variant="body2" fontSize={{ xs: '0.8rem', md: '0.875rem' }}>Lignes</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={layers.showLines}
                    onChange={() => onLayerToggle?.('lines')}
                  />
                </Box>

                {/* Transport Types Legend - Hide on mobile when collapsed */}
                {!isMobile && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Types de transport
                    </Typography>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsBusIcon sx={{ mr: 1, fontSize: 18, color: '#FF6B6B' }} />
                        <Typography variant="caption">Bus</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TramIcon sx={{ mr: 1, fontSize: 18, color: '#4ECDC4' }} />
                        <Typography variant="caption">Tramway</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SubwayIcon sx={{ mr: 1, fontSize: 18, color: '#95E1D3' }} />
                        <Typography variant="caption">Métro</Typography>
                      </Box>
                    </Stack>
                  </>
                )}
              </Stack>
            </Box>
          </Collapse>
        </Card>

        {/* Quick Action Buttons */}
        <Stack spacing={{ xs: 0.75, md: 1 }}>
          {/* My Location */}
          <Tooltip title="Ma position" placement="left" arrow>
            <Card
              sx={{
                borderRadius: { xs: '10px', md: '12px' },
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(10px)',
                boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.12)}`,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
                  transform: 'scale(1.05)',
                },
              }}
            >
              <IconButton
                onClick={onCenterOnLocation}
                sx={{
                  width: { xs: 40, md: 48 },
                  height: { xs: 40, md: 48 },
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <MyLocationIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
              </IconButton>
            </Card>
          </Tooltip>

          {/* Fullscreen - Only on desktop */}
          {!isMobile && (
            <Tooltip title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'} placement="left" arrow>
              <Card
                sx={{
                  borderRadius: '12px',
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.12)}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: `0 6px 24px ${alpha(theme.palette.secondary.main, 0.2)}`,
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <IconButton
                  onClick={onToggleFullscreen}
                  sx={{
                    width: 48,
                    height: 48,
                    color: theme.palette.secondary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    },
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Card>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default MapControls;
