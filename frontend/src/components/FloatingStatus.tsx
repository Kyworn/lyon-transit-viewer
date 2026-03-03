import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import WifiRoundedIcon from '@mui/icons-material/WifiRounded';
import CircleIcon from '@mui/icons-material/Circle';

const FloatingStatus: React.FC = () => {
  const theme = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      component={motion.div}
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{
        position: 'fixed',
        top: { xs: 10, md: 18 },
        left: 0,
        right: 0,
        mx: 'auto',
        width: 'fit-content',
        zIndex: 2500,
        borderRadius: 999,
        px: { xs: 1.3, md: 2 },
        py: { xs: 0.8, md: 1 },
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: { xs: 1, md: 1.7 },
        minWidth: { xs: 220, md: 300 },
        bgcolor: alpha('#0F172A', 0.86),
        border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
        boxShadow: `0 10px 30px ${alpha('#020617', 0.7)}`,
        backdropFilter: 'blur(18px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
        <WifiRoundedIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
          SYTRAL LIVE
        </Typography>
      </Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          justifySelf: 'center',
        }}
      >
        {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, justifySelf: 'end', minWidth: 0 }}>
        <CircleIcon sx={{ fontSize: 10, color: theme.palette.success.main }} />
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1 }}>
          ONLINE
        </Typography>
      </Box>
    </Box>
  );
};

export default FloatingStatus;
