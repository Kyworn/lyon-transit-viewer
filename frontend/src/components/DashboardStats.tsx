import React, { useMemo } from 'react';
import { alpha, Box, Card, CardContent, Stack, Typography, useTheme } from '@mui/material';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import TramRoundedIcon from '@mui/icons-material/TramRounded';
import SubwayRoundedIcon from '@mui/icons-material/SubwayRounded';
import { useVehicles } from '../hooks/useVehicles';
import { useAlerts } from '../hooks/useAlerts';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color, icon }) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        background: `linear-gradient(140deg, ${alpha(color, 0.18)} 0%, ${alpha('#0F172A', 0.72)} 100%)`,
        border: `1px solid ${alpha(color, 0.35)}`,
      }}
    >
      <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, mt: 0.2 }}>
              {value.toLocaleString('fr-FR')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(color, 0.18),
              color,
              border: `1px solid ${alpha(color, 0.4)}`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const DashboardStats: React.FC = () => {
  const theme = useTheme();
  const { data: vehicles } = useVehicles(undefined, undefined, undefined, true);
  const { data: alerts } = useAlerts();
  const { data: lines } = useLines();
  const { data: stops } = useStops(true);

  const lineMap = useMemo(() => {
    const map = new Map<string, string>();
    (lines || []).forEach((line) => map.set(line.line_sort_code, line.category));
    return map;
  }, [lines]);

  const vehicleByMode = useMemo(() => {
    let bus = 0;
    let tram = 0;
    let metro = 0;
    (vehicles || []).forEach((vehicle) => {
      const lineRef = vehicle.line_ref || '';
      const code = lineRef.includes('::') ? lineRef.split('::')[1]?.split(':')[0] : '';
      const category = code ? lineMap.get(code) : '';
      if (category === 'metro') metro += 1;
      else if (category === 'tram') tram += 1;
      else bus += 1;
    });
    return { bus, tram, metro };
  }, [vehicles, lineMap]);

  const metrics = [
    {
      title: 'Véhicules',
      value: vehicles?.length || 0,
      subtitle: 'actifs',
      color: theme.palette.success.main,
      icon: <DirectionsBusRoundedIcon fontSize="small" />,
    },
    {
      title: 'Alertes',
      value: alerts?.length || 0,
      subtitle: 'en cours',
      color: theme.palette.warning.main,
      icon: <ReportProblemRoundedIcon fontSize="small" />,
    },
    {
      title: 'Lignes',
      value: lines ? new Set(lines.map((l) => l.line_sort_code)).size : 0,
      subtitle: 'référencées',
      color: theme.palette.primary.main,
      icon: <RouteRoundedIcon fontSize="small" />,
    },
    {
      title: 'Arrêts',
      value: stops?.length || 0,
      subtitle: 'desservis',
      color: theme.palette.info.main,
      icon: <PlaceRoundedIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Stats temps réel
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.2,
          mb: 1.2,
        }}
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 1.2,
        }}
      >
        <MetricCard
          title="Bus"
          value={vehicleByMode.bus}
          subtitle="en service"
          color="#F97316"
          icon={<DirectionsBusRoundedIcon fontSize="small" />}
        />
        <MetricCard
          title="Tram"
          value={vehicleByMode.tram}
          subtitle="en service"
          color="#22C55E"
          icon={<TramRoundedIcon fontSize="small" />}
        />
        <MetricCard
          title="Métro"
          value={vehicleByMode.metro}
          subtitle="en service"
          color="#38BDF8"
          icon={<SubwayRoundedIcon fontSize="small" />}
        />
      </Box>
    </Box>
  );
};

export default DashboardStats;
