import React from 'react';
import { motion } from 'framer-motion';
import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

interface FloatingDockProps {
  onToggleDashboard: () => void;
  onToggleAlerts: () => void;
  onToggleRoutes: () => void;
  onToggleSearch: () => void;
}

const FloatingDock: React.FC<FloatingDockProps> = ({
  onToggleDashboard,
  onToggleAlerts,
  onToggleRoutes,
  onToggleSearch,
}) => {
  const theme = useTheme();

  const items = [
    { label: 'Explorer', icon: <SearchRoundedIcon fontSize="small" />, onClick: onToggleSearch },
    { label: 'Route', icon: <AltRouteRoundedIcon fontSize="small" />, onClick: onToggleRoutes },
    { label: 'Alertes', icon: <NotificationsActiveRoundedIcon fontSize="small" />, onClick: onToggleAlerts },
    { label: 'Stats', icon: <DashboardRoundedIcon fontSize="small" />, onClick: onToggleDashboard },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        mx: 'auto',
        width: 'fit-content',
        bottom: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 10px)', md: 18 },
        zIndex: 2300,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.7, md: 1.2 },
        px: { xs: 1, md: 1.5 },
        py: { xs: 0.8, md: 1.1 },
        borderRadius: 999,
        border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
        background: `linear-gradient(120deg, ${alpha('#0F172A', 0.92)} 0%, ${alpha('#1E293B', 0.88)} 100%)`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 14px 28px ${alpha('#020617', 0.75)}`,
      }}
    >
      {items.map((item) => (
        <Tooltip key={item.label} title={item.label}>
          <IconButton
            onClick={item.onClick}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.7,
              borderRadius: 999,
              minWidth: { xs: 42, md: 108 },
              height: { xs: 38, md: 40 },
              px: { xs: 1.2, md: 1.4 },
              py: 0,
              color: theme.palette.text.secondary,
              border: `1px solid ${alpha(theme.palette.text.secondary, 0.15)}`,
              '&:hover': {
                color: theme.palette.primary.light,
                borderColor: alpha(theme.palette.primary.light, 0.5),
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
            }}
          >
            {item.icon}
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, lineHeight: 1, display: { xs: 'none', md: 'inline' }, whiteSpace: 'nowrap' }}
            >
              {item.label}
            </Typography>
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};

export default FloatingDock;
