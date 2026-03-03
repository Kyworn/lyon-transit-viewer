import React, { useState } from 'react';
import {
  alpha,
  Box,
  Card,
  Collapse,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { Z_INDEX } from '../constants/responsive';

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
  const [open, setOpen] = useState(false);

  const controlCardSx = {
    bgcolor: alpha(theme.palette.background.paper, 0.9),
    border: `1px solid ${alpha(theme.palette.primary.light, 0.22)}`,
    boxShadow: `0 10px 24px ${alpha('#020617', 0.65)}`,
    borderRadius: 3,
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        right: { xs: 10, md: 16 },
        top: { xs: 80, md: 96 },
        zIndex: Z_INDEX.mapControls,
      }}
    >
      <Stack spacing={1}>
        <Card sx={{ ...controlCardSx, overflow: 'hidden', minWidth: isMobile ? 170 : 220 }}>
          <Box
            onClick={() => setOpen((v) => !v)}
            sx={{
              px: 1.2,
              py: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <LayersRoundedIcon fontSize="small" color="primary" />
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                CALQUES
              </Typography>
            </Box>
            {open ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
          </Box>
          <Collapse in={open}>
            <Stack spacing={0.6} sx={{ px: 1.2, pb: 1.1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <PlaceRoundedIcon fontSize="small" />
                  <Typography variant="body2">Arrêts</Typography>
                </Box>
                <Switch checked={layers.showStops} onChange={() => onLayerToggle?.('stops')} size="small" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <DirectionsBusRoundedIcon fontSize="small" />
                  <Typography variant="body2">Véhicules</Typography>
                </Box>
                <Switch checked={layers.showVehicles} onChange={() => onLayerToggle?.('vehicles')} size="small" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <RouteRoundedIcon fontSize="small" />
                  <Typography variant="body2">Lignes</Typography>
                </Box>
                <Switch checked={layers.showLines} onChange={() => onLayerToggle?.('lines')} size="small" />
              </Box>
            </Stack>
          </Collapse>
        </Card>

        <Card sx={{ ...controlCardSx, p: 0.45 }}>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Ma position">
              <IconButton onClick={onCenterOnLocation} color="primary" sx={{ borderRadius: 2 }}>
                <MyLocationRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!isMobile && (
              <Tooltip title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}>
                <IconButton onClick={onToggleFullscreen} color="secondary" sx={{ borderRadius: 2 }}>
                  {isFullscreen ? <FullscreenExitRoundedIcon fontSize="small" /> : <FullscreenRoundedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
};

export default MapControls;
