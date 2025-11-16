import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
} from '@mui/material';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import WarningIcon from '@mui/icons-material/Warning';
import UpdateIcon from '@mui/icons-material/Update';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import InfoIcon from '@mui/icons-material/Info';
import { useVehicles } from '../hooks/useVehicles';
import { useAlerts } from '../hooks/useAlerts';
import { useThemeStore } from '../stores/themeStore';
import { DIMENSIONS, Z_INDEX } from '../constants/responsive';

interface HeaderProps {
  onOpenAdminDashboard?: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAdminDashboard, onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { data: vehicles } = useVehicles(undefined, undefined, false);
  const { data: alerts } = useAlerts();
  const { mode, toggleTheme } = useThemeStore();
  const [infoMenuAnchor, setInfoMenuAnchor] = useState<null | HTMLElement>(null);

  const vehicleCount = vehicles?.length || 0;
  const alertCount = alerts?.length || 0;
  const lastUpdate = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const handleInfoMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setInfoMenuAnchor(event.currentTarget);
  };

  const handleInfoMenuClose = () => {
    setInfoMenuAnchor(null);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: Z_INDEX.header,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.92)} 0%, ${alpha(theme.palette.primary.main, 0.92)} 50%, ${alpha(theme.palette.secondary.main, 0.92)} 100%)`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
      }}
    >
      <Toolbar
        sx={{
          minHeight: {
            xs: DIMENSIONS.header.mobile,
            sm: DIMENSIONS.header.tablet,
            md: DIMENSIONS.header.desktop
          },
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        {/* Mobile: Burger Menu */}
        {isMobile && onMenuClick && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <IconButton
              edge="start"
              color="inherit"
              onClick={onMenuClick}
              sx={{
                mr: 1,
                width: 40,
                height: 40,
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.2),
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </motion.div>
        )}

        {/* Logo et Titre */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          >
            <Box
              sx={{
                width: { xs: 40, md: 48 },
                height: { xs: 40, md: 48 },
                borderRadius: { xs: '10px', md: '12px' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: { xs: 1, sm: 1.5, md: 2 },
                boxShadow: `0 8px 24px ${alpha('#667eea', 0.4)}`,
                border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
                  borderRadius: { xs: '10px', md: '12px' },
                },
              }}
            >
              <DirectionsBusIcon sx={{ color: 'white', fontSize: { xs: 24, md: 28 }, position: 'relative' }} />
            </Box>
          </motion.div>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(45deg, #fff 30%, #e0e0e0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                lineHeight: 1.2,
              }}
              noWrap
            >
              {isMobile ? 'TCL' : 'Lyon Transit Viewer'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: alpha(theme.palette.common.white, 0.7),
                fontSize: { xs: '0.65rem', md: '0.7rem' },
                display: { xs: 'none', sm: 'block' },
              }}
              noWrap
            >
              Suivi en temps réel des transports TCL
            </Typography>
          </Box>
        </Box>

        {/* Mobile/Tablet: Compact Stats + Info Menu */}
        {(isMobile || isTablet) && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {/* Compact Badge Indicators */}
            <Badge
              badgeContent={vehicleCount}
              color="success"
              max={999}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem',
                  minWidth: 18,
                  height: 18,
                  fontWeight: 700,
                },
              }}
            >
              <IconButton
                size="small"
                onClick={handleInfoMenuOpen}
                sx={{
                  color: 'white',
                  width: 36,
                  height: 36,
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.2),
                  },
                }}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Badge>

            {/* Alert Badge */}
            {alertCount > 0 && (
              <Badge
                badgeContent={alertCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    minWidth: 18,
                    height: 18,
                    fontWeight: 700,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.warning.main,
                  }}
                />
              </Badge>
            )}

            {/* Theme Toggle (compact) */}
            <IconButton
              onClick={toggleTheme}
              size="small"
              sx={{
                color: 'white',
                width: 36,
                height: 36,
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.2),
                },
              }}
            >
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>

            {/* Admin (compact) */}
            {onOpenAdminDashboard && (
              <IconButton
                onClick={onOpenAdminDashboard}
                size="small"
                sx={{
                  color: 'white',
                  width: 36,
                  height: 36,
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.2),
                  },
                }}
              >
                <AdminPanelSettingsIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        )}

        {/* Desktop: Full Stats */}
        {!isMobile && !isTablet && (
          <Stack direction="row" spacing={2}>
            {/* Véhicules actifs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Chip
                icon={<DirectionsBusIcon sx={{ fontSize: 20 }} />}
                label={`${vehicleCount} véhicules`}
                size="medium"
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.25),
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  borderRadius: '14px',
                  border: `2px solid ${alpha(theme.palette.success.light, 0.4)}`,
                  backdropFilter: 'blur(10px)',
                  px: 1.5,
                  py: 2.5,
                  transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.success.main, 0.35),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 16px ${alpha(theme.palette.success.main, 0.3)}`,
                  },
                  '& .MuiChip-icon': {
                    color: theme.palette.success.light,
                  },
                }}
              />
            </motion.div>

            {/* Alertes */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Chip
                icon={<WarningIcon sx={{ fontSize: 20 }} />}
                label={`${alertCount} alertes`}
                size="medium"
                sx={{
                  backgroundColor: alpha(theme.palette.warning.main, 0.25),
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  borderRadius: '14px',
                  border: `2px solid ${alpha(theme.palette.warning.light, 0.4)}`,
                  backdropFilter: 'blur(10px)',
                  px: 1.5,
                  py: 2.5,
                  transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.warning.main, 0.35),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 16px ${alpha(theme.palette.warning.main, 0.3)}`,
                  },
                  '& .MuiChip-icon': {
                    color: theme.palette.warning.light,
                  },
                }}
              />
            </motion.div>

            {/* Dernière mise à jour */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Chip
                icon={<UpdateIcon sx={{ fontSize: 20 }} />}
                label={lastUpdate}
                size="medium"
                sx={{
                  backgroundColor: alpha(theme.palette.info.main, 0.25),
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  borderRadius: '14px',
                  border: `2px solid ${alpha(theme.palette.info.light, 0.4)}`,
                  backdropFilter: 'blur(10px)',
                  px: 1.5,
                  py: 2.5,
                  transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.info.main, 0.35),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 16px ${alpha(theme.palette.info.main, 0.3)}`,
                  },
                  '& .MuiChip-icon': {
                    color: theme.palette.info.light,
                  },
                }}
              />
            </motion.div>

            {/* Indicateur de connexion */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Box sx={{ position: 'relative' }}>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#4caf50',
                    boxShadow: `0 0 12px ${alpha('#4caf50', 0.6)}`,
                  }}
                />
                <Chip
                  icon={<SignalWifiStatusbar4BarIcon sx={{ fontSize: 20 }} />}
                  label="Connecté"
                  size="medium"
                  sx={{
                    backgroundColor: alpha('#4caf50', 0.25),
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    borderRadius: '14px',
                    border: `2px solid ${alpha('#4caf50', 0.4)}`,
                    backdropFilter: 'blur(10px)',
                    px: 1.5,
                    py: 2.5,
                    transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                    '&:hover': {
                      backgroundColor: alpha('#4caf50', 0.35),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 16px ${alpha('#4caf50', 0.3)}`,
                    },
                    '& .MuiChip-icon': {
                      color: '#4caf50',
                    },
                  }}
                />
              </Box>
            </motion.div>

            {/* Admin Dashboard Toggle */}
            {onOpenAdminDashboard && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tooltip title="Admin Dashboard" arrow>
                  <IconButton
                    onClick={onOpenAdminDashboard}
                    sx={{
                      color: 'white',
                      width: 44,
                      height: 44,
                      backgroundColor: alpha(theme.palette.common.white, 0.15),
                      border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.common.white, 0.25),
                        boxShadow: `0 8px 24px ${alpha(theme.palette.common.white, 0.2)}`,
                      },
                      transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                </Tooltip>
              </motion.div>
            )}

            {/* Theme Toggle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
            >
              <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'} arrow>
                <IconButton
                  onClick={toggleTheme}
                  sx={{
                    color: 'white',
                    width: 44,
                    height: 44,
                    backgroundColor: alpha(theme.palette.common.white, 0.15),
                    border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.25),
                      boxShadow: `0 8px 24px ${alpha(theme.palette.common.white, 0.2)}`,
                    },
                    transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                  }}
                >
                  {mode === 'dark' ? <Brightness7Icon sx={{ fontSize: 22 }} /> : <Brightness4Icon sx={{ fontSize: 22 }} />}
                </IconButton>
              </Tooltip>
            </motion.div>
          </Stack>
        )}
      </Toolbar>

      {/* Info Menu for Mobile/Tablet */}
      <Menu
        anchorEl={infoMenuAnchor}
        open={Boolean(infoMenuAnchor)}
        onClose={handleInfoMenuClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 3,
            minWidth: 250,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
          },
        }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <DirectionsBusIcon color="success" />
          </ListItemIcon>
          <ListItemText
            primary="Véhicules actifs"
            secondary={vehicleCount}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          />
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <WarningIcon color="warning" />
          </ListItemIcon>
          <ListItemText
            primary="Alertes"
            secondary={alertCount}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          />
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemIcon>
            <UpdateIcon color="info" />
          </ListItemIcon>
          <ListItemText
            primary="Dernière mise à jour"
            secondary={lastUpdate}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          />
        </MenuItem>
        <MenuItem disabled>
          <ListItemIcon>
            <SignalWifiStatusbar4BarIcon sx={{ color: '#4caf50' }} />
          </ListItemIcon>
          <ListItemText
            primary="État"
            secondary="Connecté"
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ color: '#4caf50' }}
          />
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
