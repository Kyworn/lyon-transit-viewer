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
import { useSelectionStore } from '../stores/selectionStore';

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
  const [from, setFrom] = useState<Location | null>(null);
  const [to, setTo] = useState<Location | null>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
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

  const { data: stops } = useStops(false);
  const { selectedJourney, setSelectedJourney } = useSelectionStore();

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
      // Note: bike and car are handled separately via their own parameters

      // Prepare datetime parameter
      const finalDateTime = useCustomDateTime
        ? new Date(dateTime).toISOString()
        : new Date().toISOString();

      // Build base params
      const paramsObj: Record<string, string> = {
        fromLat: fromLocation.lat.toString(),
        fromLng: fromLocation.lng.toString(),
        toLat: toLocation.lat.toString(),
        toLng: toLocation.lng.toString(),
        transportModes: JSON.stringify(selectedModes),
        datetime: finalDateTime,
        isArrivalTime: isArrivalTime ? '1' : '0',
        walk: walkSpeed,
        pmr: isPmr ? 'true' : 'false',
        car: transportModes.car ? '1' : '0',
        dataFreshness: useRealtime ? '1' : '0',
      };

      // Only add bike parameter if bike mode is enabled
      if (transportModes.bike) {
        paramsObj.bike = JSON.stringify({
          type: [bikeType, 'bss'],
          speed: bikeSpeed,
          isElectric: isElectricBike,
        });
      }

      const params = new URLSearchParams(paramsObj);

      const response = await fetch(`/api/tcl/journey?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du calcul de l\'itinéraire');
      }

      const data = await response.json();
      setJourneys(data.journeys || []);

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
          initial={{ x: -450, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -450, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: isMobile ? '100%' : '450px',
            height: '100vh',
            zIndex: 1200, // Above Sidebar (1100 usually)
            pointerEvents: 'none', // Container passes clicks
          }}
        >
          <Box
            sx={{
              pointerEvents: 'auto',
              width: isMobile ? '100%' : '400px',
              height: isMobile ? '100%' : 'calc(100% - 32px)',
              m: isMobile ? 0 : 2,
              bgcolor: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(24px)',
              borderRadius: isMobile ? 0 : 4,
              border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{
                    width: { xs: 32, md: 40 },
                    height: { xs: 32, md: 40 },
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}>
                    <DirectionsIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                    Itinéraire
                  </Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.1) }}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              <Stack spacing={2}>
                {/* Inputs */}
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{
                    position: 'absolute',
                    left: 14,
                    top: 18,
                    bottom: 18,
                    width: 2,
                    background: `linear-gradient(to bottom, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    zIndex: 0
                  }} />

                  <Stack spacing={2}>
                    <Autocomplete
                      freeSolo
                      options={getOptions(fromSearch)}
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
                          placeholder="Lieu de départ"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.primary.main, zIndex: 1, ml: 0.5 }} />
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
                            sx: { borderRadius: 3, bgcolor: alpha(theme.palette.background.default, 0.5) }
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

                    <Autocomplete
                      freeSolo
                      options={getOptions(toSearch)}
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
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.secondary.main, zIndex: 1, ml: 0.5 }} />
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
                            sx: { borderRadius: 3, bgcolor: alpha(theme.palette.background.default, 0.5) }
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

                  <IconButton
                    onClick={handleSwap}
                    size="small"
                    sx={{
                      position: 'absolute',
                      right: -12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: 1,
                      zIndex: 2,
                      '&:hover': { bgcolor: theme.palette.action.hover }
                    }}
                  >
                    <SwapVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Options Accordion (Simplified) */}
                <Accordion
                  elevation={0}
                  sx={{
                    bgcolor: 'transparent',
                    '&:before': { display: 'none' },
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: '12px !important',
                    overflow: 'hidden'
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TuneIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>Options de trajet</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">MODES</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {[
                            { key: 'metro', icon: <DirectionsSubwayIcon fontSize="small" />, label: 'Métro' },
                            { key: 'tramway', icon: <TramIcon fontSize="small" />, label: 'Tram' },
                            { key: 'bus', icon: <DirectionsBusIcon fontSize="small" />, label: 'Bus' },
                            { key: 'bike', icon: <DirectionsBikeIcon fontSize="small" />, label: 'Vélo' },
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
                      <FormControlLabel
                        control={<Switch checked={isPmr} onChange={(e) => setIsPmr(e.target.checked)} size="small" />}
                        label={<Typography variant="body2">Accès PMR</Typography>}
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
                    py: 1.5,
                    borderRadius: 3,
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Calculer'}
                </Button>

                {error && (
                  <Typography color="error" variant="body2" align="center" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), p: 1, borderRadius: 2 }}>
                    {error}
                  </Typography>
                )}
              </Stack>

              {/* Results List */}
              {journeys.length > 0 && (
                <Box mt={4}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>RÉSULTATS</Typography>
                  <Stack spacing={2} mt={1}>
                    {journeys.map((journey, idx) => (
                      <Card
                        key={idx}
                        onClick={() => {
                          setSelectedJourney(journey);
                          onClose(); // Close the planner to show the map/navigator
                        }}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selectedJourney?.id === journey.id ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.background.paper, 0.5),
                          border: `1px solid ${selectedJourney?.id === journey.id ? theme.palette.primary.main : theme.palette.divider}`,
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'translateX(4px)', borderColor: theme.palette.primary.main }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" mb={1}>
                            <Typography variant="h6" fontWeight={700}>{formatDuration(journey.arrival, journey.departure)}</Typography>
                            <Typography variant="body2" color="text.secondary">{formatTime(journey.departure)} - {formatTime(journey.arrival)}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
                            {journey.sections.map((section, sIdx) => (
                              <React.Fragment key={sIdx}>
                                {section.type === 'public-transport' ? (
                                  <Chip
                                    label={section.line?.code}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      bgcolor: section.line?.color ? `#${section.line.color}` : theme.palette.grey[700],
                                      color: 'white'
                                    }}
                                  />
                                ) : section.type === 'walk' ? (
                                  <DirectionsWalkIcon fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />
                                ) : null}
                                {sIdx < journey.sections.length - 1 && <Typography variant="caption" color="text.disabled">›</Typography>}
                              </React.Fragment>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoutePlanner;
