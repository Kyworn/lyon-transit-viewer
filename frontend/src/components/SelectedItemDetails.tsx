import React, { useMemo } from 'react';
import { useSelectionStore } from '../stores/selectionStore';
import { Vehicle } from '../types';
import { useLines } from '../hooks/useLines';
import { useSpacetime } from '../spacetime/useSpacetime';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Drawer,
  Fade,
  Avatar,
  SwipeableDrawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import SubwayIcon from '@mui/icons-material/Subway';
import TrainIcon from '@mui/icons-material/Train';
import PinDropIcon from '@mui/icons-material/PinDrop';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SpeedIcon from '@mui/icons-material/Speed';

const SelectedItemDetails: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { selectedItem, setSelectedItem, setCenterCoordinates } = useSelectionStore();
  const { data: lines } = useLines();
  const { conn, connected } = useSpacetime();

  if (!selectedItem || selectedItem.type !== 'vehicle') return null;

  const vehicle = selectedItem as Vehicle;

  // Extract line info
  // Usually format is "301A:A" or similar in vehicle data, but we might need to match with lines
  // vehicle.line_ref is often internal ID. vehicle.published_line_name is the public name (e.g. "C13")
  const publicLineName = vehicle.published_line_name;
  // Try to find line by sort code, or fallback to matching by line_ref if possible
  const line = lines?.find(l =>
    l.line_sort_code === publicLineName ||
    (vehicle.line_ref && l.id === vehicle.line_ref)
  );

  const lineColor = line?.color || (vehicle as any).color || theme.palette.primary.main;

  // Determine transport type icon
  let TransportIcon = DirectionsBusIcon;
  const category = line?.category || (vehicle as any).type || 'bus';

  if (category.toLowerCase().includes('metro')) TransportIcon = SubwayIcon;
  else if (category.toLowerCase().includes('tram')) TransportIcon = TramIcon;
  else if (category.toLowerCase().includes('funicular')) TransportIcon = TrainIcon;

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const d = new Date(time);
    if (!Number.isFinite(d.getTime())) return '--:--';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDelay = (delay: string) => {
    if (!delay || delay === 'PT0S') {
      if (vehicle.expected_arrival_time) {
        const diffMs = new Date(vehicle.expected_arrival_time).getTime() - Date.now();
        const diffMin = Math.round(diffMs / 60000);
        if (Number.isFinite(diffMin) && diffMin > 0) return `Dans ${diffMin} min`;
      }
      return "Temps réel";
    }
    return delay.replace('PT', '').replace('M', ' min ').replace('S', ' s').toLowerCase();
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const fallbackFromCalls = useMemo(() => {
    if (!conn || !connected) {
      return { stopName: null as string | null, arrival: null as string | null, distanceMeters: null as number | null };
    }

    const now = Date.now() - 60_000;
    const horizon = Date.now() + 2 * 60 * 60 * 1000;
    const parseTime = (value?: string | null) => {
      if (!value) return null;
      const t = new Date(value).getTime();
      return Number.isFinite(t) ? t : null;
    };

    const stopsByGtfs = new Map<string, { name: string; lat: number | null; lon: number | null }>();
    const stopsById = new Map<string, { name: string; lat: number | null; lon: number | null }>();
    Array.from(conn.db.stops.iter() as Iterable<any>).forEach((s) => {
      const row = {
        name: s.name || '',
        lat: typeof s.latitude === 'number' ? s.latitude : null,
        lon: typeof s.longitude === 'number' ? s.longitude : null,
      };
      if (s.id) {
        stopsById.set(s.id, row);
      }
      if (s.gtfsStopId) {
        stopsByGtfs.set(s.gtfsStopId, row);
      }
    });

    const journeyByRef = new Map<string, { lineSortCode: string; directionRef: string }>();
    Array.from(conn.db.estimated_vehicle_journeys_current.iter() as Iterable<any>).forEach((j) => {
      if (!j.datedVehicleJourneyRef) return;
      journeyByRef.set(j.datedVehicleJourneyRef, {
        lineSortCode: (j.lineSortCode || '').toString().toUpperCase(),
        directionRef: (j.directionRef || '').toString().toLowerCase(),
      });
    });

    const targetLine = (vehicle.published_line_name || '').trim().toUpperCase();
    const targetDirection = (vehicle.direction_ref || '').trim().toLowerCase();
    const targetStopRef = vehicle.stop_point_ref || null;

    const calls = Array.from(conn.db.estimated_calls_current.iter() as Iterable<any>)
      .map((c) => ({
        datedVehicleJourneyRef: c.datedVehicleJourneyRef || null,
        stopPointRef: c.stopPointRef || null,
        gtfsStopId: c.gtfsStopId || null,
        stopPointName: c.stopPointName || null,
        expectedArrivalTime: c.expectedArrivalTime || c.aimedArrivalTime || null,
      }))
      .filter((c) => {
        const ts = parseTime(c.expectedArrivalTime);
        if (ts == null || ts < now || ts > horizon) return false;

        if (vehicle.dated_vehicle_journey_ref) {
          return c.datedVehicleJourneyRef === vehicle.dated_vehicle_journey_ref;
        }

        if (targetStopRef && c.stopPointRef !== targetStopRef) return false;
        if (!targetLine || !c.datedVehicleJourneyRef) return false;
        const journey = journeyByRef.get(c.datedVehicleJourneyRef);
        if (!journey || journey.lineSortCode !== targetLine) return false;
        if (targetDirection && journey.directionRef && journey.directionRef !== targetDirection) return false;
        return true;
      })
      .sort((a, b) => {
        const ta = parseTime(a.expectedArrivalTime) || Number.MAX_SAFE_INTEGER;
        const tb = parseTime(b.expectedArrivalTime) || Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });

    const first = calls[0] || null;
    const stopFromRef = targetStopRef ? stopsById.get(targetStopRef) : null;
    const stopData = first?.gtfsStopId ? stopsByGtfs.get(first.gtfsStopId) : null;
    const stopName = vehicle.stop_point_name || stopFromRef?.name || stopData?.name || first?.stopPointName || null;
    let distanceMeters: number | null = null;
    const distanceStop = stopFromRef || stopData;
    if (distanceStop?.lat != null && distanceStop?.lon != null && vehicle.latitude && vehicle.longitude) {
      distanceMeters = haversineMeters(vehicle.latitude, vehicle.longitude, distanceStop.lat, distanceStop.lon);
    }

    return { stopName, arrival: first?.expectedArrivalTime || null, distanceMeters };
  }, [
    conn,
    connected,
    vehicle.dated_vehicle_journey_ref,
    vehicle.direction_ref,
    vehicle.published_line_name,
    vehicle.stop_point_name,
    vehicle.stop_point_ref,
    vehicle.latitude,
    vehicle.longitude
  ]);

  const displayStopName = vehicle.stop_point_name || fallbackFromCalls.stopName || 'Information indisponible';
  const displayArrival = vehicle.expected_arrival_time || fallbackFromCalls.arrival || '';
  const displayDistance =
    vehicle.distance_from_stop != null
      ? vehicle.distance_from_stop
      : fallbackFromCalls.distanceMeters;

  const Content = () => (
    <Box sx={{ p: 0 }}>
      {/* Header with Line Color Gradient */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(lineColor, 0.2)} 0%, transparent 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: lineColor,
                width: 48,
                height: 48,
                fontSize: '1.2rem',
                fontWeight: 800,
                boxShadow: `0 8px 16px ${alpha(lineColor, 0.4)}`,
              }}
            >
              {publicLineName}
            </Avatar>
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.2, color: 'text.secondary' }}>
                {category.toUpperCase()}
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'Space Grotesk', fontWeight: 700, lineHeight: 1 }}>
                Vers {vehicle.destination_name || line?.destination_name || 'Terminus'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setSelectedItem(null)} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.2) }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Key Stats Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          {/* Next Stop Card */}
          <Card
            sx={{
              gridColumn: 'span 2',
              bgcolor: alpha(theme.palette.background.paper, 0.4),
              border: `1px solid ${theme.palette.divider}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                <PinDropIcon />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>PROCHAIN ARRÊT</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {displayStopName}
                </Typography>
                <Typography variant="caption" color="primary">
                  Arrivée prévue : {displayArrival ? formatTime(displayArrival) : 'Donnée non disponible'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ p: '16px !important', textAlign: 'center' }}>
              <ScheduleIcon color={vehicle.delay && vehicle.delay !== 'PT0S' ? 'warning' : 'success'} sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight={700}>
                {formatDelay(vehicle.delay || '')}
              </Typography>
              <Typography variant="caption" color="text.secondary">Statut</Typography>
            </CardContent>
          </Card>

          {/* Distance Card */}
          <Card sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4), border: `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ p: '16px !important', textAlign: 'center' }}>
              <SpeedIcon color="action" sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight={700}>
                {displayDistance != null ? `${displayDistance}m` : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Distance arrêt</Typography>
            </CardContent>
          </Card>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={() => setCenterCoordinates({ lng: vehicle.longitude, lat: vehicle.latitude })}
          sx={{ py: 1.5, borderRadius: 3, borderStyle: 'dashed' }}
        >
          Suivre ce véhicule
        </Button>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={!!vehicle}
        onClose={() => setSelectedItem(null)}
        onOpen={() => { }}
        disableSwipeToOpen={true}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            bgcolor: alpha(theme.palette.background.default, 0.95),
            backdropFilter: 'blur(20px)',
            maxHeight: '85vh',
          },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: 'grey.600',
            borderRadius: 2,
            mx: 'auto',
            mt: 2,
            mb: 1,
            opacity: 0.5,
          }}
        />
        <Content />
      </SwipeableDrawer>
    );
  }

  return (
    <Fade in={!!vehicle}>
      <Card
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 380,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          borderRadius: 5, // 20px
          bgcolor: 'rgba(10, 10, 10, 0.85)', // Darker glass
          backdropFilter: 'blur(30px)',
          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          zIndex: 1300,
        }}
      >
        <Content />
      </Card>
    </Fade>
  );
};

export default SelectedItemDetails;
