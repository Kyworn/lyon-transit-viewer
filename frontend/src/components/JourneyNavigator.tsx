import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Chip,
  Stack,
  useTheme,
  alpha,
  Collapse,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import DirectionsSubwayIcon from '@mui/icons-material/DirectionsSubway';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSelectionStore } from '../stores/selectionStore';
import { calculatePathDistance, formatDistance, formatDuration, getWalkingInstructions } from '../utils/geoUtils';

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
  geojson?: {
    type: string;
    coordinates: number[][];
  };
}

interface Journey {
  id: string;
  arrival: string;
  departure: string;
  sections: RouteSection[];
}

const JourneyNavigator: React.FC = () => {
  const theme = useTheme();
  const { selectedJourney, setSelectedJourney, currentJourneyStep, setCurrentJourneyStep } = useSelectionStore();
  const [showDetails, setShowDetails] = React.useState(false);

  // Auto-reset step when journey changes
  useEffect(() => {
    if (selectedJourney && currentJourneyStep === null) {
      setCurrentJourneyStep(0);
    }
  }, [selectedJourney, currentJourneyStep, setCurrentJourneyStep]);

  if (!selectedJourney || currentJourneyStep === null) return null;

  const journey: Journey = selectedJourney;
  const currentSection: RouteSection = journey.sections[currentJourneyStep];
  const totalSteps = journey.sections.length;

  const handlePrevious = () => {
    if (currentJourneyStep > 0) {
      setCurrentJourneyStep(currentJourneyStep - 1);
    }
  };

  const handleNext = () => {
    if (currentJourneyStep < totalSteps - 1) {
      setCurrentJourneyStep(currentJourneyStep + 1);
    }
  };

  const handleClose = () => {
    setSelectedJourney(null);
    setCurrentJourneyStep(null);
  };

  const getModeIcon = (section: RouteSection) => {
    if (section.type === 'walk') return <DirectionsWalkIcon />;
    if (section.type === 'bike') return <DirectionsBikeIcon />;
    if (section.type === 'waiting') return <TimerIcon />;

    // Public transport - use mode-specific icon
    if (section.line?.mode === 'metro') return <DirectionsSubwayIcon />;
    if (section.line?.mode === 'tramway' || section.line?.mode === 'tram') return <TramIcon />;
    if (section.line?.mode === 'bus') return <DirectionsBusIcon />;

    return <DirectionsBusIcon />; // Default
  };

  const getModeColor = (section: RouteSection): string => {
    if (section.type === 'walk') return theme.palette.info.main;
    if (section.type === 'bike') return theme.palette.success.main;
    if (section.type === 'waiting') return theme.palette.warning.main;

    // Use line color if available
    if (section.line?.color) return `#${section.line.color}`;

    return theme.palette.primary.main;
  };

  const getStepDistance = (section: RouteSection): string | null => {
    if (section.type === 'walk' || section.type === 'bike') {
      if (section.geojson?.coordinates) {
        const distanceMeters = calculatePathDistance(section.geojson.coordinates);
        return formatDistance(distanceMeters);
      }
    }
    return null;
  };

  const getStepDuration = (section: RouteSection): string => {
    const departure = new Date(section.departure).getTime();
    const arrival = new Date(section.arrival).getTime();
    return formatDuration(arrival - departure);
  };

  const getStepTitle = (section: RouteSection): string => {
    if (section.type === 'walk') {
      return 'À pied';
    }
    if (section.type === 'bike') {
      return 'Vélo';
    }
    if (section.type === 'waiting') {
      return 'Attente';
    }
    if (section.line) {
      return `Ligne ${section.line.code}`;
    }
    return 'Transport';
  };

  const getStepInstructions = (section: RouteSection): string => {
    if (section.type === 'walk') {
      return getWalkingInstructions(section);
    }
    if (section.type === 'bike') {
      const distance = getStepDistance(section);
      return `Vélo jusqu'à ${section.to.name}${distance ? ` (${distance})` : ''}`;
    }
    if (section.type === 'waiting') {
      return `Attendre ${getStepDuration(section)}`;
    }
    if (section.line) {
      return `Direction ${section.headsign || section.to.name}`;
    }
    return `Vers ${section.to.name}`;
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1400,
          width: '90%',
          maxWidth: 600,
        }}
      >
        <Paper
          elevation={12}
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${getModeColor(currentSection)} 0%, ${alpha(getModeColor(currentSection), 0.7)} 100%)`,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  p: 1,
                  borderRadius: 2,
                  display: 'flex',
                }}
              >
                {getModeIcon(currentSection)}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {getStepTitle(currentSection)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Étape {currentJourneyStep + 1} sur {totalSteps}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={handleClose}
              sx={{
                color: 'white',
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {/* Main instruction */}
              <Typography variant="body1" fontWeight={600}>
                {getStepInstructions(currentSection)}
              </Typography>

              {/* Details chips */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {/* Duration */}
                <Chip
                  icon={<AccessTimeIcon />}
                  label={getStepDuration(currentSection)}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                />

                {/* Distance (for walk/bike) */}
                {getStepDistance(currentSection) && (
                  <Chip
                    label={getStepDistance(currentSection)}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                    }}
                  />
                )}

                {/* Line chip for public transport */}
                {currentSection.line && (
                  <Chip
                    label={currentSection.line.code}
                    size="small"
                    sx={{
                      bgcolor: `#${currentSection.line.color}`,
                      color: 'white',
                      fontWeight: 700,
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                    }}
                  />
                )}
              </Stack>

              {/* From / To with times */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Départ
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentSection.from.name}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {formatTime(currentSection.departure)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 2,
                      bgcolor: alpha(theme.palette.divider, 0.3),
                    }}
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      Arrivée
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentSection.to.name}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {formatTime(currentSection.arrival)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Show details button for public transport */}
              {currentSection.type === 'public-transport' && (
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => setShowDetails(!showDetails)}
                    sx={{
                      width: '100%',
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    }}
                  >
                    {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {showDetails ? 'Masquer' : 'Voir'} les détails
                    </Typography>
                  </IconButton>
                  <Collapse in={showDetails}>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Information"
                          secondary={`Trajet direct de ${currentSection.from.name} à ${currentSection.to.name}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Note"
                          secondary="Les arrêts intermédiaires ne sont pas disponibles via l'API"
                        />
                      </ListItem>
                    </List>
                  </Collapse>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Navigation controls */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 2,
              pt: 0,
              gap: 2,
            }}
          >
            <motion.div
              style={{ flex: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconButton
                onClick={handlePrevious}
                disabled={currentJourneyStep === 0}
                sx={{
                  width: '100%',
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '&.Mui-disabled': {
                    bgcolor: alpha(theme.palette.action.disabled, 0.05),
                    border: `2px solid ${alpha(theme.palette.action.disabled, 0.1)}`,
                  },
                }}
              >
                <ChevronLeftIcon />
                <Typography variant="button" sx={{ ml: 0.5 }}>
                  Précédent
                </Typography>
              </IconButton>
            </motion.div>

            <motion.div
              style={{ flex: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <IconButton
                onClick={handleNext}
                disabled={currentJourneyStep === totalSteps - 1}
                sx={{
                  width: '100%',
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '&.Mui-disabled': {
                    bgcolor: alpha(theme.palette.action.disabled, 0.05),
                    border: `2px solid ${alpha(theme.palette.action.disabled, 0.1)}`,
                  },
                }}
              >
                <Typography variant="button" sx={{ mr: 0.5 }}>
                  Suivant
                </Typography>
                <ChevronRightIcon />
              </IconButton>
            </motion.div>
          </Box>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default JourneyNavigator;
