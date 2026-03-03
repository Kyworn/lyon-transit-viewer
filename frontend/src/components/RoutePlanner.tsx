import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
  Autocomplete,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  FormGroup,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControl,
  Select,
  MenuItem,
  useMediaQuery, // <--- AJOUTÉ
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import DirectionsSubwayIcon from '@mui/icons-material/DirectionsSubway';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import AccessibleIcon from '@mui/icons-material/Accessible';
import { useStops } from '../hooks/useStops';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSelectionStore } from '../stores/selectionStore';
import { useSpacetime } from '../spacetime/useSpacetime';

interface Location {
  name: string;
  lat: number;
  lng: number;
  type: 'stop' | 'address';
}

interface RouteSection {
  type: string;
  arrival: string;
  departure: string;
  from: { name: string };
  to: { name: string };
  line?: {
    code: string;
    color: string;
    mode: string;
  };
  headsign?: string;
}

interface Journey {
  id: string;
  arrival: string;
  departure: string;
  sections: RouteSection[];
  co2?: number;
  co2_car?: number;
}

interface RoutePlannerProps {
  open: boolean;
  onClose: () => void;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { conn, connected } = useSpacetime();
  const [from, setFrom] = useState<Location | null>(null);
  const [to, setTo] = useState<Location | null>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const debouncedFromSearch = useDebouncedValue(fromSearch, 250);
  const debouncedToSearch = useDebouncedValue(toSearch, 250);
  const [addressSuggestions, setAddressSuggestions] = useState<Location[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transport mode options
  const [transportModes, setTransportModes] = useState({
    metro: true,
    tramway: true,
    bus: true,
    funicular: true,
    boat: true,
    tod: true,
    train: true,
    carRegion: true,
    bike: false,
    car: false,
  });

  // Routing preferences
  const [walkSpeed, setWalkSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [bikeSpeed, setBikeSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [bikeType, setBikeType] = useState<'bike' | 'bss'>('bike');
  const [isElectricBike, setIsElectricBike] = useState(false);
  const [isPmr, setIsPmr] = useState(false);
  const [useRealtime, setUseRealtime] = useState(true);

  // Date & Time preferences
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Default to 5 minutes from now
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [isArrivalTime, setIsArrivalTime] = useState(false); // false = departure, true = arrival

  const { data: stops } = useStops(open);
  const { selectedJourney, setSelectedJourney } = useSelectionStore();

  const invokeCalculateJourney = async (requestPayload: Record<string, any>) => {
    if (!conn || !connected) {
      throw new Error('SpacetimeDB non connecté');
    }

    const anyConn = conn as any;
    const procedures = anyConn?.procedures ?? {};
    const callCandidates: Array<{ fn?: (...args: any[]) => Promise<any>; args: any[] }> = [
      { fn: procedures.calculateJourney, args: [{ req: requestPayload }] },
      { fn: procedures.calculate_journey, args: [{ req: requestPayload }] },
      { fn: anyConn.calculateJourney, args: [{ req: requestPayload }] },
      { fn: anyConn.calculate_journey, args: [{ req: requestPayload }] },
    ];

    let lastError: any = null;
    for (const candidate of callCandidates) {
      if (typeof candidate.fn !== 'function') continue;
      try {
        return await candidate.fn(...candidate.args);
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      lastError
        ? `Appel procedure calculate_journey impossible: ${String(lastError)}`
        : 'Procedure calculate_journey introuvable sur la connexion SpacetimeDB'
    );
  };

  const handleSwap = () => {
    const tempLocation = from;
    const tempSearch = fromSearch;

    setFrom(to);
    setFromSearch(toSearch);

    setTo(tempLocation);
    setToSearch(tempSearch);
  };

  // Search addresses using Mapbox Geocoding API
  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxToken}&` +
        `proximity=4.835,45.764&` + // Lyon center
        `bbox=4.7,45.7,4.95,45.82&` + // Lyon bbox
        `limit=5&` +
        `language=fr`
      );

      if (response.ok) {
        const data = await response.json();
        const suggestions: Location[] = data.features.map((feature: any) => ({
          name: feature.place_name,
          lng: feature.center[0],
          lat: feature.center[1],
          type: 'address' as const,
        }));
        setAddressSuggestions(suggestions);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  }, []);

  // Combine stops and addresses for autocomplete
  const getOptions = (searchQuery: string): Location[] => {
    const stopOptions: Location[] = stops
      ? stops
        .filter(stop =>
          stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stop.municipality?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10)
        .map(stop => ({
          name: `${stop.name} (${stop.municipality})`,
          lat: stop.latitude,
          lng: stop.longitude,
          type: 'stop' as const,
        }))
      : [];

    return [...stopOptions, ...addressSuggestions];
  };

  // Geocode a text address if needed
  const geocodeIfNeeded = async (location: Location | null, searchText: string): Promise<Location | null> => {
    // If we already have a Location object with coordinates, use it
    if (location && location.lat && location.lng) {
      return location;
    }

    // If we have text but no location, geocode it
    if (searchText && searchText.length >= 3) {
      try {
        const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?` +
          `access_token=${mapboxToken}&` +
          `proximity=4.835,45.764&` +
          `bbox=4.7,45.7,4.95,45.82&` +
          `limit=1&` +
          `language=fr`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            return {
              name: feature.place_name,
              lng: feature.center[0],
              lat: feature.center[1],
              type: 'address',
            };
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    return null;
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Geocode both locations if needed
      const fromLocation = await geocodeIfNeeded(from, fromSearch);
      const toLocation = await geocodeIfNeeded(to, toSearch);

      if (!fromLocation || !toLocation) {
        setError('Veuillez sélectionner ou entrer des lieux valides pour le départ et l\'arrivée');
        setLoading(false);
        return;
      }

      // Build transport modes array
      const selectedModes: string[] = [];
      if (transportModes.metro) selectedModes.push('metro');
      if (transportModes.tramway) selectedModes.push('tramway');
      if (transportModes.bus) selectedModes.push('bus');
      if (transportModes.funicular) selectedModes.push('funicular');
      if (transportModes.boat) selectedModes.push('boat');
      if (transportModes.tod) selectedModes.push('tod');
      if (transportModes.train) selectedModes.push('train');
      if (transportModes.carRegion) selectedModes.push('car-region');
      // Note: bike and car are handled separately via their own parameters

      // Prepare datetime parameter
      const finalDateTime = useCustomDateTime
        ? new Date(dateTime).toISOString()
        : new Date().toISOString();

      const requestPayload = {
        fromLat: fromLocation.lat,
        fromLng: fromLocation.lng,
        toLat: toLocation.lat,
        toLng: toLocation.lng,
        datetime: finalDateTime,
        isArrivalTime: isArrivalTime,
        transportModes: JSON.stringify(selectedModes),
        walk: walkSpeed,
        bike: transportModes.bike
          ? {
              some: JSON.stringify({
                type: [bikeType, 'bss'],
                speed: bikeSpeed,
                isElectric: isElectricBike,
              }),
            }
          : { none: [] },
        pmr: isPmr,
        car: transportModes.car,
        dataFreshness: useRealtime ? '1' : '0',
      };

      const result = await invokeCalculateJourney(requestPayload);
      const parsed = typeof result === 'string' ? JSON.parse(result || '{}') : (result || {});
      if (parsed.ok === false) {
        throw new Error(parsed.err || "Erreur lors du calcul de l'itinéraire");
      }

      const payload = parsed.data || parsed;
      setJourneys(payload.journeys || []);

      // Update the locations with geocoded results
      if (!from) setFrom(fromLocation);
      if (!to) setTo(toLocation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = (isFrom: boolean) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            name: 'Ma position',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            type: 'address',
          };
          if (isFrom) {
            setFrom(location);
            setFromSearch('Ma position');
          } else {
            setTo(location);
            setToSearch('Ma position');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Impossible d\'obtenir votre position');
        }
      );
    }
  };

  const formatDuration = (arrival: string, departure: string) => {
    const arrivalTime = new Date(arrival).getTime();
    const departureTime = new Date(departure).getTime();
    const durationMs = arrivalTime - departureTime;
    const minutes = Math.floor(durationMs / 1000 / 60);
    return `${minutes} min`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const countTransfers = (sections: RouteSection[]) => {
    return sections.filter(s => s.type === 'public-transport').length - 1;
  };

  const getModeIcon = (type: string) => {
    switch (type) {
      case 'public-transport':
        return '🚇';
      case 'walk':
        return '🚶';
      case 'bike':
        return '🚴';
      case 'waiting':
        return '⏳';
      default:
        return '•';
    }
  };

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: isMobile ? '100%' : 'min(460px, 44vw)',
            height: '100vh',
            zIndex: 1200,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              pointerEvents: 'auto',
              width: '100%',
              height: isMobile ? '100%' : 'calc(100% - 28px)',
              m: isMobile ? 0 : 2,
              bgcolor: alpha(theme.palette.background.paper, 0.92),
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? 0 : 5,
              border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
              boxShadow: `0 24px 48px ${alpha('#020617', 0.65)}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                borderBottom: `1px solid ${alpha(theme.palette.primary.light, 0.15)}`,
                background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.12)} 100%)`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 34, md: 40 },
                      height: { xs: 34, md: 40 },
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #2563EB 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                  >
                    <DirectionsIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                      Route Planner
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Calcul multimodal temps réel
                    </Typography>
                  </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.background.default, 0.35) }}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={2.2}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack spacing={1.2}>
                      <Autocomplete
                        freeSolo
                        options={getOptions(debouncedFromSearch)}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={from}
                        onChange={(_, newValue) => {
                          if (newValue && typeof newValue !== 'string') setFrom(newValue);
                          else if (newValue === null) setFrom(null);
                        }}
                        inputValue={fromSearch}
                        onInputChange={(_, newValue) => {
                          setFromSearch(newValue);
                          searchAddress(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Départ"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LocationOnIcon sx={{ color: theme.palette.primary.main }} fontSize="small" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <>
                                  {params.InputProps.endAdornment}
                                  <IconButton size="small" onClick={() => handleUseMyLocation(true)}>
                                    <MyLocationIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={`from-${option.name}-${option.lat}-${option.lng}`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {option.type === 'stop' ? '🚏' : '📍'}
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          </li>
                        )}
                      />

                      <Stack direction="row" justifyContent="center">
                        <IconButton
                          onClick={handleSwap}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.16),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                          }}
                        >
                          <SwapVertIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Autocomplete
                        freeSolo
                        options={getOptions(debouncedToSearch)}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={to}
                        onChange={(_, newValue) => {
                          if (newValue && typeof newValue !== 'string') setTo(newValue);
                          else if (newValue === null) setTo(null);
                        }}
                        inputValue={toSearch}
                        onInputChange={(_, newValue) => {
                          setToSearch(newValue);
                          searchAddress(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Destination"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LocationOnIcon sx={{ color: theme.palette.secondary.main }} fontSize="small" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <>
                                  {params.InputProps.endAdornment}
                                  <IconButton size="small" onClick={() => handleUseMyLocation(false)}>
                                    <MyLocationIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={`to-${option.name}-${option.lat}-${option.lng}`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {option.type === 'stop' ? '🚏' : '📍'}
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          </li>
                        )}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                <Accordion
                  elevation={0}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    '&:before': { display: 'none' },
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    borderRadius: '14px !important',
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.background.default, 0.25) }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TuneIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={700}>Options</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: alpha(theme.palette.background.default, 0.18) }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">
                          MODES
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {[
                            { key: 'metro', icon: <DirectionsSubwayIcon fontSize="small" />, label: 'Métro' },
                            { key: 'tramway', icon: <TramIcon fontSize="small" />, label: 'Tram' },
                            { key: 'bus', icon: <DirectionsBusIcon fontSize="small" />, label: 'Bus' },
                            { key: 'funicular', icon: <DirectionsSubwayIcon fontSize="small" />, label: 'Funi' },
                            { key: 'boat', icon: <DirectionsBusIcon fontSize="small" />, label: 'Fluvial' },
                            { key: 'tod', icon: <DirectionsBusIcon fontSize="small" />, label: 'TOD' },
                            { key: 'train', icon: <DirectionsSubwayIcon fontSize="small" />, label: 'Train' },
                            { key: 'carRegion', icon: <DirectionsBusIcon fontSize="small" />, label: 'Car région' },
                            { key: 'bike', icon: <DirectionsBikeIcon fontSize="small" />, label: 'Vélo' },
                            { key: 'car', icon: <DirectionsBusIcon fontSize="small" />, label: 'Voiture' },
                          ].map((mode) => (
                            <Chip
                              key={mode.key}
                              icon={mode.icon}
                              label={mode.label}
                              onClick={() => setTransportModes(prev => ({ ...prev, [mode.key]: !prev[mode.key as keyof typeof transportModes] }))}
                              color={transportModes[mode.key as keyof typeof transportModes] ? 'primary' : 'default'}
                              variant={transportModes[mode.key as keyof typeof transportModes] ? 'filled' : 'outlined'}
                              size="small"
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Divider />
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button
                          variant={useCustomDateTime ? 'outlined' : 'contained'}
                          size="small"
                          onClick={() => setUseCustomDateTime(false)}
                        >
                          Maintenant
                        </Button>
                        <Button
                          variant={useCustomDateTime ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => setUseCustomDateTime(true)}
                        >
                          Date/heure
                        </Button>
                        <Button
                          variant={isArrivalTime ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => setIsArrivalTime((v) => !v)}
                        >
                          {isArrivalTime ? 'Arriver pour' : 'Partir à'}
                        </Button>
                      </Stack>

                      {useCustomDateTime && (
                        <TextField
                          label="Date et heure"
                          type="datetime-local"
                          value={dateTime}
                          onChange={(e) => setDateTime(e.target.value)}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      )}

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <FormControl size="small" fullWidth>
                          <Typography variant="caption" color="text.secondary">Marche</Typography>
                          <Select
                            value={walkSpeed}
                            onChange={(e) => setWalkSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                          >
                            <MenuItem value="slow">Lente</MenuItem>
                            <MenuItem value="normal">Normale</MenuItem>
                            <MenuItem value="fast">Rapide</MenuItem>
                          </Select>
                        </FormControl>

                        {transportModes.bike && (
                          <FormControl size="small" fullWidth>
                            <Typography variant="caption" color="text.secondary">Vélo</Typography>
                            <Select
                              value={bikeSpeed}
                              onChange={(e) => setBikeSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                            >
                              <MenuItem value="slow">Lent</MenuItem>
                              <MenuItem value="normal">Normal</MenuItem>
                              <MenuItem value="fast">Rapide</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Stack>

                      {transportModes.bike && (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <FormControl size="small" fullWidth>
                            <Typography variant="caption" color="text.secondary">Type vélo</Typography>
                            <Select
                              value={bikeType}
                              onChange={(e) => setBikeType(e.target.value as 'bike' | 'bss')}
                            >
                              <MenuItem value="bike">Personnel</MenuItem>
                              <MenuItem value="bss">Libre-service</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControlLabel
                            control={<Switch checked={isElectricBike} onChange={(e) => setIsElectricBike(e.target.checked)} size="small" />}
                            label={<Typography variant="body2">Vélo électrique</Typography>}
                          />
                        </Stack>
                      )}

                      <FormControlLabel
                        control={<Switch checked={isPmr} onChange={(e) => setIsPmr(e.target.checked)} size="small" />}
                        label={<Typography variant="body2">Accessibilité PMR</Typography>}
                      />
                      <FormControlLabel
                        control={<Switch checked={useRealtime} onChange={(e) => setUseRealtime(e.target.checked)} size="small" />}
                        label={<Typography variant="body2">Données temps réel</Typography>}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleCalculate}
                  disabled={loading}
                  sx={{
                    py: 1.35,
                    borderRadius: 2.5,
                    fontWeight: 700,
                  }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Calculer le trajet'}
                </Button>

                {error && (
                  <Typography color="error" variant="body2" align="center" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), p: 1, borderRadius: 2 }}>
                    {error}
                  </Typography>
                )}

                {journeys.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="overline" color="text.secondary" fontWeight={700}>
                      ITINERAIRES
                    </Typography>
                    <Stack spacing={1.4} mt={0.8}>
                      {journeys.map((journey, idx) => (
                        <Card
                          key={idx}
                          onClick={() => {
                            setSelectedJourney(journey);
                            onClose();
                          }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: selectedJourney?.id === journey.id ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.background.paper, 0.52),
                            border: `1px solid ${selectedJourney?.id === journey.id ? alpha(theme.palette.primary.main, 0.7) : alpha(theme.palette.divider, 0.35)}`,
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateX(4px)', borderColor: alpha(theme.palette.primary.main, 0.7) },
                          }}
                        >
                          <CardContent sx={{ p: 1.4 }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.8}>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {formatDuration(journey.arrival, journey.departure)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(journey.departure)} - {formatTime(journey.arrival)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 0.8 }}>
                              {journey.sections.map((section, sIdx) => (
                                <React.Fragment key={sIdx}>
                                  {section.type === 'public-transport' ? (
                                    <Chip
                                      label={section.line?.code}
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        bgcolor: section.line?.color ? `#${section.line.color}` : theme.palette.grey[700],
                                        color: 'white',
                                      }}
                                    />
                                  ) : section.type === 'walk' ? (
                                    <DirectionsWalkIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                  ) : null}
                                  {sIdx < journey.sections.length - 1 && (
                                    <Typography variant="caption" color="text.disabled">›</Typography>
                                  )}
                                </React.Fragment>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoutePlanner;
