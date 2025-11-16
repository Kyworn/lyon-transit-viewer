import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import SubwayIcon from '@mui/icons-material/Subway';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RouteIcon from '@mui/icons-material/Route';
import PlaceIcon from '@mui/icons-material/Place';
import { BusIcon, TramIcon, MetroIcon } from './TransportIcons';
import { useVehicles } from '../hooks/useVehicles';
import { useAlerts } from '../hooks/useAlerts';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
  subtitle?: string;
  index: number;
}

// Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <Typography
      variant="h3"
      component={motion.div}
      sx={{
        fontWeight: 800,
        background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        mt: 1.5,
        mb: 0.5,
        fontSize: { xs: '2.25rem', sm: '2.75rem' },
      }}
    >
      {count.toLocaleString('fr-FR')}
    </Typography>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, isLoading, subtitle, index }) => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${alpha(color, 0.05)} 100%)`,
        backdropFilter: 'blur(10px)',
        border: `2px solid ${alpha(color, 0.25)}`,
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
        boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
        '&:hover': {
          borderColor: alpha(color, 0.4),
          boxShadow: `0 16px 40px ${alpha(color, 0.25)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, transparent 100%)`,
          opacity: 0,
          transition: 'opacity 0.4s',
        },
        '&:hover::before': {
          opacity: 1,
        },
      }}
    >
      {isLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: alpha(theme.palette.text.primary, 0.6),
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.7rem',
              }}
            >
              {title}
            </Typography>
            <AnimatedCounter value={value} color={color} />
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: alpha(theme.palette.text.primary, 0.5),
                  fontSize: '0.75rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.1)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
    </motion.div>
  );
};

const DashboardStats: React.FC = () => {
  const theme = useTheme();
  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles(undefined, undefined, false);
  const { data: alerts, isLoading: isLoadingAlerts } = useAlerts();
  const { data: lines, isLoading: isLoadingLines } = useLines();
  const { data: stops, isLoading: isLoadingStops } = useStops(false);

  // Calculate stats
  const vehicleCount = vehicles?.length || 0;
  const alertCount = alerts?.length || 0;
  const lineCount = lines ? new Set(lines.map(l => l.line_sort_code)).size : 0;
  const stopCount = stops?.length || 0;

  // Count by transport type
  const busCount = vehicles?.filter(v => {
    const lineRef = v.line_ref || '';
    const code = lineRef.substring(lineRef.indexOf('::') + 2, lineRef.lastIndexOf(':'));
    const line = lines?.find(l => l.line_sort_code === code);
    return line?.category === 'bus';
  }).length || 0;

  const tramCount = vehicles?.filter(v => {
    const lineRef = v.line_ref || '';
    const code = lineRef.substring(lineRef.indexOf('::') + 2, lineRef.lastIndexOf(':'));
    const line = lines?.find(l => l.line_sort_code === code);
    return line?.category === 'tram';
  }).length || 0;

  const metroCount = vehicles?.filter(v => {
    const lineRef = v.line_ref || '';
    const code = lineRef.substring(lineRef.indexOf('::') + 2, lineRef.lastIndexOf(':'));
    const line = lines?.find(l => l.line_sort_code === code);
    return line?.category === 'metro';
  }).length || 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: { xs: 2, md: 3 },
          color: theme.palette.text.primary,
          fontSize: { xs: '1.25rem', md: '1.5rem' },
        }}
      >
        Statistiques en temps réel
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 2,
        }}
      >
        <StatCard
          title="Véhicules actifs"
          value={vehicleCount}
          icon={<DirectionsBusIcon sx={{ fontSize: 28 }} />}
          color={theme.palette.success.main}
          isLoading={isLoadingVehicles}
          subtitle="En circulation"
          index={0}
        />
        <StatCard
          title="Alertes trafic"
          value={alertCount}
          icon={<WarningAmberIcon sx={{ fontSize: 28 }} />}
          color={theme.palette.warning.main}
          isLoading={isLoadingAlerts}
          subtitle="Actuellement"
          index={1}
        />
        <StatCard
          title="Lignes"
          value={lineCount}
          icon={<RouteIcon sx={{ fontSize: 28 }} />}
          color={theme.palette.info.main}
          isLoading={isLoadingLines}
          subtitle="Dans le réseau"
          index={2}
        />
        <StatCard
          title="Arrêts"
          value={stopCount}
          icon={<PlaceIcon sx={{ fontSize: 28 }} />}
          color={theme.palette.primary.main}
          isLoading={isLoadingStops}
          subtitle="Total"
          index={3}
        />
      </Box>

      {/* Transport type breakdown */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        <StatCard
          title="Bus"
          value={busCount}
          icon={<BusIcon sx={{ fontSize: 24 }} />}
          color="#FF6B6B"
          subtitle="En service"
          index={4}
        />
        <StatCard
          title="Tramway"
          value={tramCount}
          icon={<TramIcon sx={{ fontSize: 24 }} />}
          color="#4ECDC4"
          subtitle="En service"
          index={5}
        />
        <StatCard
          title="Métro"
          value={metroCount}
          icon={<MetroIcon sx={{ fontSize: 24 }} />}
          color="#95E1D3"
          subtitle="En service"
          index={6}
        />
      </Box>
    </Box>
  );
};

export default DashboardStats;
