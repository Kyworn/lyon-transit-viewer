import React from 'react';
import { motion } from 'framer-motion';
import { Box, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MapIcon from '@mui/icons-material/Map';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DirectionsIcon from '@mui/icons-material/Directions';
import SearchIcon from '@mui/icons-material/Search';

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

    const dockItems = [
        { icon: <MapIcon />, label: 'Explorer', action: () => { } }, // Default view
        { icon: <SearchIcon />, label: 'Rechercher', action: onToggleSearch },
        { icon: <DirectionsIcon />, label: 'Itinéraire', action: onToggleRoutes },
        { icon: <NotificationsIcon />, label: 'Alertes', action: onToggleAlerts },
        { icon: <DashboardIcon />, label: 'Stats', action: onToggleDashboard },
    ];

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: { xs: 24, md: 32 },
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                display: 'flex',
                gap: { xs: 0.5, md: 2 }, // Reduced gap for mobile
                padding: { xs: '6px 12px', md: '12px 24px' }, // Reduced padding for mobile
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 10, 10, 0.6)', // Changed background
                backdropFilter: 'blur(20px)', // Changed blur
                border: '1px solid rgba(255, 255, 255, 0.08)', // Changed border
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', // Changed shadow
                width: 'auto', // Added width auto
                maxWidth: '95vw', // Prevent overflow
            }}
            component={motion.div}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {dockItems.map((item, index) => (
                <Tooltip key={index} title={item.label} placement="top" arrow>
                    <IconButton
                        onClick={item.action}
                        sx={{
                            color: 'rgba(255, 255, 255, 0.5)', // Changed default color
                            backgroundColor: 'transparent', // Changed default background
                            padding: { xs: 0.8, md: 1.5 }, // Changed padding for icon button
                            borderRadius: '12px', // Changed border radius
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Changed transition
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)', // Changed hover background
                                transform: 'translateY(-2px)', // Changed hover transform
                                color: 'rgba(255, 255, 255, 0.8)', // Changed hover color
                                boxShadow: 'none', // Removed specific shadow
                            },
                        }}
                    >
                        {item.icon}
                    </IconButton>
                </Tooltip>
            ))}
        </Box>
    );
};

export default FloatingDock;
