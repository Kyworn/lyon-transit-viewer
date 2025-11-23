import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import CircleIcon from '@mui/icons-material/Circle';

const FloatingStatus: React.FC = () => {
    const theme = useTheme();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box
            component={motion.div}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            sx={{
                position: 'fixed',
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, md: 3 },
                padding: { xs: '6px 16px', md: '8px 24px' },
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(40px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
        >
            {/* Network Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WifiIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    TCL LIVE
                </Typography>
            </Box>

            {/* Time */}
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.05em', color: 'white' }}>
                {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Typography>

            {/* System Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircleIcon sx={{ fontSize: 10, color: theme.palette.success.main, boxShadow: `0 0 10px ${theme.palette.success.main}` }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    OPTIMAL
                </Typography>
            </Box>
        </Box>
    );
};

export default FloatingStatus;
