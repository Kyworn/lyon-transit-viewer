import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Drawer,
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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450 },
          boxSizing: 'border-box',
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
        >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          pb: 2,
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}>
              <DirectionsIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Itinéraire
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'rotate(90deg)',
                bgcolor: alpha(theme.palette.error.main, 0.1),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        </motion.div>

        <Stack spacing={2}>
          {/* From */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Départ
            </Typography>
            <Autocomplete
              freeSolo
              options={getOptions(fromSearch)}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
              value={from}
              onChange={(_, newValue) => {
                if (newValue && typeof newValue !== 'string') {
                  setFrom(newValue);
                } else if (newValue === null) {
                  setFrom(null);
                }
              }}
              inputValue={fromSearch}
              onInputChange={(_, newValue) => {
                setFromSearch(newValue);
                searchAddress(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Rechercher un arrêt ou une adresse..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon fontSize="small" />
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
          </Box>

          {/* Swap button */}
          <Box sx={{ textAlign: 'center', my: 1 }}>
            <IconButton
              onClick={handleSwap}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                  transform: 'rotate(180deg) scale(1.1)',
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                },
              }}
            >
              <SwapVertIcon sx={{ color: theme.palette.primary.main }} />
            </IconButton>
          </Box>

          {/* To */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Arrivée
            </Typography>
            <Autocomplete
              freeSolo
              options={getOptions(toSearch)}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
              value={to}
              onChange={(_, newValue) => {
                if (newValue && typeof newValue !== 'string') {
                  setTo(newValue);
                } else if (newValue === null) {
                  setTo(null);
                }
              }}
              inputValue={toSearch}
              onInputChange={(_, newValue) => {
                setToSearch(newValue);
                searchAddress(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Rechercher un arrêt ou une adresse..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon fontSize="small" />
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
          </Box>

          {/* Options */}
          <Accordion
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TuneIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Options de recherche
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2.5}>
                {/* Transport Modes */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                    Modes de transport
                  </Typography>
                  <FormGroup>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.metro}
                            onChange={(e) => setTransportModes({ ...transportModes, metro: e.target.checked })}
                            icon={<DirectionsSubwayIcon />}
                            checkedIcon={<DirectionsSubwayIcon />}
                          />
                        }
                        label="Métro"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.tramway}
                            onChange={(e) => setTransportModes({ ...transportModes, tramway: e.target.checked })}
                            icon={<TramIcon />}
                            checkedIcon={<TramIcon />}
                          />
                        }
                        label="Tram"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.bus}
                            onChange={(e) => setTransportModes({ ...transportModes, bus: e.target.checked })}
                            icon={<DirectionsBusIcon />}
                            checkedIcon={<DirectionsBusIcon />}
                          />
                        }
                        label="Bus"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.funicular}
                            onChange={(e) => setTransportModes({ ...transportModes, funicular: e.target.checked })}
                          />
                        }
                        label="Funiculaire"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.bike}
                            onChange={(e) => setTransportModes({ ...transportModes, bike: e.target.checked })}
                            icon={<DirectionsBikeIcon />}
                            checkedIcon={<DirectionsBikeIcon />}
                          />
                        }
                        label="Vélo"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={transportModes.car}
                            onChange={(e) => setTransportModes({ ...transportModes, car: e.target.checked })}
                          />
                        }
                        label="Voiture"
                      />
                    </Stack>
                  </FormGroup>
                </Box>

                <Divider />

                {/* Date & Time */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                    <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Horaire de trajet
                  </Typography>
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useCustomDateTime}
                          onChange={(e) => setUseCustomDateTime(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Personnaliser l'heure"
                    />

                    {useCustomDateTime && (
                      <>
                        <ToggleButtonGroup
                          value={isArrivalTime ? 'arrival' : 'departure'}
                          exclusive
                          onChange={(_, newValue) => {
                            if (newValue !== null) {
                              setIsArrivalTime(newValue === 'arrival');
                            }
                          }}
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="departure">Partir à</ToggleButton>
                          <ToggleButton value="arrival">Arriver à</ToggleButton>
                        </ToggleButtonGroup>

                        <TextField
                          type="datetime-local"
                          value={dateTime}
                          onChange={(e) => setDateTime(e.target.value)}
                          size="small"
                          fullWidth
                          InputProps={{
                            sx: {
                              bgcolor: alpha(theme.palette.background.paper, 0.6),
                            }
                          }}
                        />
                      </>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Walk Speed */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                    <DirectionsWalkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Vitesse de marche
                  </Typography>
                  <ToggleButtonGroup
                    value={walkSpeed}
                    exclusive
                    onChange={(_, newValue) => newValue && setWalkSpeed(newValue)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="slow">Lent</ToggleButton>
                    <ToggleButton value="normal">Normal</ToggleButton>
                    <ToggleButton value="fast">Rapide</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Bike Options (only show if bike is selected) */}
                {transportModes.bike && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                        <DirectionsBikeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Options vélo
                      </Typography>
                      <Stack spacing={1.5}>
                        <ToggleButtonGroup
                          value={bikeType}
                          exclusive
                          onChange={(_, newValue) => newValue && setBikeType(newValue)}
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="bike">Mon vélo</ToggleButton>
                          <ToggleButton value="bss">VéloV</ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                          value={bikeSpeed}
                          exclusive
                          onChange={(_, newValue) => newValue && setBikeSpeed(newValue)}
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="slow">Lent</ToggleButton>
                          <ToggleButton value="normal">Normal</ToggleButton>
                          <ToggleButton value="fast">Rapide</ToggleButton>
                        </ToggleButtonGroup>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isElectricBike}
                              onChange={(e) => setIsElectricBike(e.target.checked)}
                              size="small"
                            />
                          }
                          label="Vélo électrique"
                        />
                      </Stack>
                    </Box>
                  </>
                )}

                <Divider />

                {/* Accessibility & Preferences */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                    Préférences
                  </Typography>
                  <Stack spacing={0.5}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isPmr}
                          onChange={(e) => setIsPmr(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessibleIcon fontSize="small" />
                          <span>Accessibilité PMR</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useRealtime}
                          onChange={(e) => setUseRealtime(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Utiliser les horaires en temps réel"
                    />
                  </Stack>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleCalculate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <DirectionsIcon />}
            sx={{
              py: 1.75,
              borderRadius: 3,
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'none',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
              transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
              '&:disabled': {
                background: theme.palette.action.disabledBackground,
                boxShadow: 'none',
              },
            }}
          >
            {loading ? 'Calcul en cours...' : 'Calculer l\'itinéraire'}
          </Button>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
            <Box sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
              textAlign: 'center',
            }}>
              <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
                ⚠️ {error}
              </Typography>
            </Box>
            </motion.div>
          )}
        </Stack>

        <Divider sx={{
          my: 3,
          borderColor: alpha(theme.palette.divider, 0.1),
          '&::before, &::after': {
            borderColor: alpha(theme.palette.divider, 0.1),
          },
        }} />

        {/* Results */}
        <Box sx={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto', pr: 1 }}>
          {journeys.length > 0 ? (
            <Stack spacing={2}>
              <AnimatePresence>
              {journeys.map((journey, idx) => {
                const isSelected = selectedJourney?.id === journey.id;
                return (
                <motion.div
                  key={journey.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                >
                <Card
                  onClick={() => setSelectedJourney(journey)}
                  sx={{
                    border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.2)}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    boxShadow: isSelected
                      ? `0 12px 32px ${alpha(theme.palette.primary.main, 0.2)}`
                      : `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      transform: 'translateY(-4px) scale(1.02)',
                      boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                      <Chip
                        label={`Départ: ${formatTime(journey.departure)}`}
                        size="medium"
                        sx={{
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.success.main, 0.15),
                          color: theme.palette.success.dark,
                          border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                          px: 1.5,
                        }}
                      />
                      <Chip
                        label={`Arrivée: ${formatTime(journey.arrival)}`}
                        size="medium"
                        sx={{
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.warning.main, 0.15),
                          color: theme.palette.warning.dark,
                          border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                          px: 1.5,
                        }}
                      />
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: 18 }} />}
                        label={formatDuration(journey.arrival, journey.departure)}
                        size="medium"
                        sx={{
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          color: theme.palette.primary.dark,
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                          px: 1.5,
                          '& .MuiChip-icon': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                      <Chip
                        icon={<TransferWithinAStationIcon sx={{ fontSize: 18 }} />}
                        label={`${countTransfers(journey.sections)} corresp.`}
                        size="medium"
                        sx={{
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.info.main, 0.15),
                          color: theme.palette.info.dark,
                          border: `2px solid ${alpha(theme.palette.info.main, 0.3)}`,
                          px: 1.5,
                          '& .MuiChip-icon': {
                            color: theme.palette.info.main,
                          },
                        }}
                      />
                      {journey.co2 !== undefined && journey.co2_car !== undefined && (
                        <Chip
                          label={`🌱 ${journey.co2.toFixed(2)} kg (vs ${journey.co2_car.toFixed(2)} kg)`}
                          size="medium"
                          sx={{
                            fontWeight: 700,
                            bgcolor: alpha(theme.palette.success.main, 0.15),
                            color: theme.palette.success.dark,
                            border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                            px: 1.5,
                          }}
                        />
                      )}
                    </Box>

                    <Stack spacing={1}>
                      {journey.sections.map((section, sIdx) => (
                        <Box key={sIdx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>
                            {getModeIcon(section.type)}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {section.type === 'public-transport' && section.line ? (
                                <Chip
                                  label={section.line.code}
                                  size="small"
                                  sx={{
                                    background: `linear-gradient(135deg, #${section.line.color} 0%, ${alpha(`#${section.line.color}`, 0.7)} 100%)`,
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    height: 24,
                                    px: 1,
                                    boxShadow: `0 2px 8px ${alpha(`#${section.line.color}`, 0.4)}`,
                                    border: '2px solid rgba(255, 255, 255, 0.2)',
                                  }}
                                />
                              ) : null}
                              <span>{section.from.name} → {section.to.name}</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDuration(section.arrival, section.departure)}
                              {section.headsign && ` • ${section.headsign}`}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
                </motion.div>
                );
              })}
              </AnimatePresence>
            </Stack>
          ) : !loading ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Entrez vos coordonnées de départ et d'arrivée pour calculer un itinéraire
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Drawer>
  );
};

export default RoutePlanner;
