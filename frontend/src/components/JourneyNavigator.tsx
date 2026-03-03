import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import DirectionsSubwayIcon from '@mui/icons-material/DirectionsSubway';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FunicularIcon from '@mui/icons-material/Cable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import ExploreIcon from '@mui/icons-material/Explore';
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
  waitingTime?: number;
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { selectedJourney, setSelectedJourney, currentJourneyStep, setCurrentJourneyStep } = useSelectionStore();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (selectedJourney && currentJourneyStep === null) {
      setCurrentJourneyStep(0);
    }
  }, [selectedJourney, currentJourneyStep, setCurrentJourneyStep]);

  if (!selectedJourney || currentJourneyStep === null) return null;

  const journey: Journey = selectedJourney;
  const sections = journey.sections || [];
  if (sections.length === 0) return null;

  const safeStep = Math.min(Math.max(currentJourneyStep, 0), sections.length - 1);
  const currentSection = sections[safeStep];

  const totalDurationMs = new Date(journey.arrival).getTime() - new Date(journey.departure).getTime();
  const publicSteps = sections.filter((s) => s.type === 'public-transport').length;
  const transfers = Math.max(0, publicSteps - 1);
  const walkDistanceMeters = sections
    .filter((s) => s.type === 'walk' && s.geojson?.coordinates?.length)
    .reduce((sum, s) => sum + calculatePathDistance(s.geojson!.coordinates), 0);
  const stats = {
    totalDuration: formatDuration(totalDurationMs),
    transfers,
    walkDistance: formatDistance(walkDistanceMeters),
    totalSteps: sections.length,
  };

  const formatTime = (isoString: string): string =>
    new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const getModeColor = (section: RouteSection): string => {
    if (section.type === 'walk') return theme.palette.info.main;
    if (section.type === 'bike') return theme.palette.success.main;
    if (section.type === 'waiting') return theme.palette.warning.main;
    if (section.line?.color) return `#${section.line.color}`;
    return theme.palette.primary.main;
  };

  const getModeIcon = (section: RouteSection) => {
    if (section.type === 'walk') return <DirectionsWalkIcon fontSize="small" />;
    if (section.type === 'bike') return <DirectionsBikeIcon fontSize="small" />;
    if (section.type === 'waiting') return <AccessTimeIcon fontSize="small" />;

    const mode = section.line?.mode;
    if (mode === 'metro') return <DirectionsSubwayIcon fontSize="small" />;
    if (mode === 'tramway' || mode === 'tram') return <TramIcon fontSize="small" />;
    if (mode === 'funicular') return <FunicularIcon fontSize="small" />;
    if (mode === 'boat' || mode === 'fluvial') return <DirectionsBoatIcon fontSize="small" />;
    return <DirectionsBusIcon fontSize="small" />;
  };

  const getSectionTitle = (section: RouteSection): string => {
    if (section.type === 'walk') return 'Marche';
    if (section.type === 'bike') return 'Velo';
    if (section.type === 'waiting') return 'Attente';
    if (section.line?.code) return `Ligne ${section.line.code}`;
    return 'Transport';
  };

  const getSectionSubtitle = (section: RouteSection): string => {
    if (section.type === 'walk') return getWalkingInstructions(section);
    if (section.type === 'bike') return `Velo vers ${section.to.name}`;
    if (section.type === 'waiting') return `Attente ${formatDuration((section.waitingTime || 0) * 1000)}`;
    return `Direction ${section.headsign || section.to.name}`;
  };

  const getSectionDuration = (section: RouteSection): string => {
    const dep = new Date(section.departure).getTime();
    const arr = new Date(section.arrival).getTime();
    return formatDuration(Math.max(0, arr - dep));
  };

  const getSectionDistance = (section: RouteSection): string | null => {
    if ((section.type === 'walk' || section.type === 'bike') && section.geojson?.coordinates?.length) {
      return formatDistance(calculatePathDistance(section.geojson.coordinates));
    }
    return null;
  };

  const handleClose = () => {
    setSelectedJourney(null);
    setCurrentJourneyStep(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        style={{
          position: 'fixed',
          bottom: isMobile ? 12 : 24,
          left: isMobile ? 10 : 24,
          right: isMobile ? 10 : 'auto',
          width: isMobile ? 'auto' : 520,
          zIndex: 2100,
          pointerEvents: 'auto',
        }}
      >
        <Paper
          elevation={16}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.32)}`,
            background: `linear-gradient(170deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`,
            backdropFilter: 'blur(16px)',
          }}
        >
          <Box
            sx={{
              p: 1.6,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              background: alpha(theme.palette.background.default, 0.32),
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Trajet en cours
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(journey.departure)} - {formatTime(journey.arrival)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
                <IconButton size="small" onClick={handleClose}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={0.8} mt={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<AccessTimeIcon />} size="small" label={stats.totalDuration} />
              <Chip icon={<TransferWithinAStationIcon />} size="small" label={`${stats.transfers} corr.`} />
              <Chip icon={<ExploreIcon />} size="small" label={stats.walkDistance} />
            </Stack>
          </Box>

          {expanded && (
            <>
              <Box
                sx={{
                  maxHeight: isMobile ? '42vh' : 320,
                  overflowY: 'auto',
                  p: 1.2,
                }}
              >
                <Stack spacing={1}>
                  {sections.map((section, index) => {
                    const active = index === safeStep;
                    const color = getModeColor(section);
                    return (
                      <Box
                        key={`${section.type}-${index}`}
                        onClick={() => setCurrentJourneyStep(index)}
                        sx={{
                          cursor: 'pointer',
                          p: 1.1,
                          borderRadius: 2,
                          border: `1px solid ${active ? alpha(color, 0.8) : alpha(theme.palette.divider, 0.24)}`,
                          bgcolor: active ? alpha(color, 0.14) : alpha(theme.palette.background.paper, 0.45),
                          transition: 'all .18s ease',
                          '&:hover': {
                            borderColor: alpha(color, 0.7),
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1}>
                          <Box sx={{ width: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.4 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: color,
                                boxShadow: `0 0 0 3px ${alpha(color, 0.25)}`,
                              }}
                            />
                            {index < sections.length - 1 && (
                              <Box
                                sx={{
                                  mt: 0.5,
                                  width: 2,
                                  minHeight: 34,
                                  bgcolor: alpha(theme.palette.divider, 0.5),
                                }}
                              />
                            )}
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                                <Box
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 1.5,
                                    display: 'grid',
                                    placeItems: 'center',
                                    bgcolor: alpha(color, 0.2),
                                    color,
                                    flexShrink: 0,
                                  }}
                                >
                                  {getModeIcon(section)}
                                </Box>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {getSectionTitle(section)}
                                </Typography>
                              </Stack>
                              <Chip size="small" label={getSectionDuration(section)} />
                            </Stack>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
                              {formatTime(section.departure)} - {formatTime(section.arrival)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.35 }} noWrap>
                              {section.from.name}{' -> '}{section.to.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.35, display: 'block' }} noWrap>
                              {getSectionSubtitle(section)}
                            </Typography>

                            <Stack direction="row" spacing={0.8} mt={0.8} flexWrap="wrap" useFlexGap>
                              {section.line?.code && (
                                <Chip
                                  size="small"
                                  label={section.line.code}
                                  sx={{
                                    bgcolor: section.line.color ? `#${section.line.color}` : theme.palette.grey[700],
                                    color: theme.palette.common.white,
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                              {getSectionDistance(section) && (
                                <Chip size="small" label={getSectionDistance(section)} variant="outlined" />
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Divider />

              <Box sx={{ p: 1.2 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setCurrentJourneyStep(Math.max(0, safeStep - 1))}
                    disabled={safeStep === 0}
                    startIcon={<ChevronLeftIcon />}
                  >
                    Precedent
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setCurrentJourneyStep(Math.min(sections.length - 1, safeStep + 1))}
                    disabled={safeStep === sections.length - 1}
                    endIcon={<ChevronRightIcon />}
                  >
                    Suivant
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default JourneyNavigator;
