import React from 'react';
import { motion } from 'framer-motion';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DirectionsIcon from '@mui/icons-material/Directions';
import { DIMENSIONS, Z_INDEX } from '../constants/responsive';

interface MobileBottomNavProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  alertCount?: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ value, onChange, alertCount = 0 }) => {
  const theme = useTheme();

  return (
    <Paper
      component={motion.div}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: Z_INDEX.bottomNav,
        borderRadius: 0,
        boxShadow: `0 -4px 24px ${alpha(theme.palette.common.black, 0.15)}`,
        background: alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
      elevation={8}
    >
      <BottomNavigation
        value={value}
        onChange={onChange}
        showLabels
        sx={{
          height: DIMENSIONS.bottomNav.height,
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 64,
            padding: '8px 12px',
            color: alpha(theme.palette.text.secondary, 0.7),
            transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 700,
              },
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.15)',
              },
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            fontWeight: 600,
            marginTop: 4,
            transition: 'all 0.2s',
            '&.Mui-selected': {
              fontSize: '0.75rem',
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Explorer"
          icon={
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <ExploreIcon />
            </motion.div>
          }
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main,
                filter: `drop-shadow(0 2px 8px ${alpha(theme.palette.primary.main, 0.3)})`,
              },
            },
          }}
        />
        <BottomNavigationAction
          label="Alertes"
          icon={
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
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
                    ...(alertCount > 0 && {
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          transform: 'scale(1)',
                        },
                        '50%': {
                          transform: 'scale(1.1)',
                        },
                      },
                    }),
                  },
                }}
              >
                <NotificationsIcon />
              </Badge>
            </motion.div>
          }
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: theme.palette.warning.main,
                filter: `drop-shadow(0 2px 8px ${alpha(theme.palette.warning.main, 0.3)})`,
              },
            },
          }}
        />
        <BottomNavigationAction
          label="Stats"
          icon={
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <DashboardIcon />
            </motion.div>
          }
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: theme.palette.secondary.main,
                filter: `drop-shadow(0 2px 8px ${alpha(theme.palette.secondary.main, 0.3)})`,
              },
            },
          }}
        />
        <BottomNavigationAction
          label="Itinéraire"
          icon={
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <DirectionsIcon />
            </motion.div>
          }
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: theme.palette.info.main,
                filter: `drop-shadow(0 2px 8px ${alpha(theme.palette.info.main, 0.3)})`,
              },
            },
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
