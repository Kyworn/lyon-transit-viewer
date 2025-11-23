import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  List,
  ListItem,
  Button,
  Drawer,
  useTheme,
  useMediaQuery,
  alpha,
  Card,
  CardContent,
  Fade,
  SwipeableDrawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessibleIcon from '@mui/icons-material/Accessible';
import ElevatorIcon from '@mui/icons-material/Elevator';
import EscalatorIcon from '@mui/icons-material/Escalator';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Stop, LineIcon } from '../types';
import { useNextPassages } from '../hooks/useNextPassages';
import { useSelectionStore } from '../stores/selectionStore';
import { motion, AnimatePresence } from 'framer-motion';

interface StopDetailsModalProps {
  stop: Stop | null;
  onClose: () => void;
  lineIcons: LineIcon[] | null | undefined;
  anchorPosition: { top: number; left: number } | null;
}

const StopDetailsModal: React.FC<StopDetailsModalProps> = ({ stop, onClose, lineIcons }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: nextPassages, isLoading: isLoadingPassages } = useNextPassages(stop?.id || null, !!stop);
  const setCenterCoordinates = useSelectionStore((state) => state.setCenterCoordinates);

  const formatDuration = (duration: string) => {
    if (!duration || duration === 'PT0S') return "À l'approche";
    const match = duration.match(/PT(?:(-?)(\d+)H)?(?:(-?)(\d+)M)?(?:(-?)(\d+)S)?/);
    if (!match) return duration;

    const sign = match[1] || match[3] || match[5] || '';
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[4] || '0');

    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes} min`;

    if (formatted.trim() === '') return "À l'approche";

    return sign === '-' ? `Avance ${formatted.trim()}` : `${formatted.trim()}`;
  };

  // Parse ISO 8601 duration to get delay in minutes
  const parseDurationToMinutes = (duration: string): number => {
    if (!duration || duration === 'PT0S') return 0;
    const match = duration.match(/PT(?:(-?)(\d+)H)?(?:(-?)(\d+)M)?(?:(-?)(\d+)S)?/);
    if (!match) return 0;

    const sign = match[1] || match[3] || match[5] || '';
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[4] || '0');

    const totalMinutes = hours * 60 + minutes;
    return sign === '-' ? -totalMinutes : totalMinutes;
  };

  // Filter passages to only show future ones
  const futurePassages = useMemo(() => {
    if (!nextPassages) return [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    return nextPassages.filter(passage => {
      if (!passage.scheduled_arrival_time) return false;
      const [hours, minutes] = passage.scheduled_arrival_time.split(':').map(Number);
      const scheduledMinutes = hours * 60 + minutes;
      const delayMinutes = parseDurationToMinutes(passage.delay || 'PT0S');
      const actualArrivalMinutes = scheduledMinutes + delayMinutes;

      // Handle midnight crossing roughly
      if (actualArrivalMinutes < currentTotalMinutes && (currentTotalMinutes - actualArrivalMinutes) > 180) {
        return true; // Probably next day
      }

      return actualArrivalMinutes >= currentTotalMinutes;
    }).slice(0, 5);
  }, [nextPassages]);

  // Get unique line codes
  const uniqueLines = useMemo(() => {
    if (!stop?.service_info) return [];
    const servingLines = stop.service_info.split(',').map(service => {
      const [lineCode] = service.split(':');
      return lineCode;
    });
    return Array.from(new Set(servingLines));
  }, [stop]);

  if (!stop) return null;

  const Content = () => (
    <Box sx={{ p: 0 }}>
      {/* Header with Glass Effect */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
              ARRÊT
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Space Grotesk', fontWeight: 700, mb: 0.5 }}>
              {stop.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {stop.municipality}
              </Typography>
              {stop.zone && (
                <Chip
                  label={`Zone ${stop.zone}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem', borderColor: theme.palette.divider }}
                />
              )}
            </Stack>
          </Box>
          <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.2) }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Accessibility Badges */}
        <Stack direction="row" spacing={1} mb={3}>
          {stop.pmr_accessible && (
            <Chip
              icon={<AccessibleIcon sx={{ fontSize: '16px !important' }} />}
              label="PMR"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
          {stop.has_elevator && (
            <Chip
              icon={<ElevatorIcon sx={{ fontSize: '16px !important' }} />}
              label="Ascenseur"
              size="small"
              variant="outlined"
            />
          )}
          {stop.has_escalator && (
            <Chip
              icon={<EscalatorIcon sx={{ fontSize: '16px !important' }} />}
              label="Escalator"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        {/* Serving Lines */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
          Lignes desservies
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
          {uniqueLines.map((lineCode) => {
            const icon = lineIcons?.find(li => li.code_ligne === lineCode);
            return (
              <Box
                key={lineCode}
                sx={{
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.1)' },
                  cursor: 'pointer',
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                }}
              >
                {icon ? (
                  <img
                    src={`/icons/${icon.picto_ligne}`}
                    alt={lineCode}
                    style={{ width: 42, height: 42 }}
                  />
                ) : (
                  <Chip label={lineCode} sx={{ fontWeight: 800 }} />
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Next Passages Timeline */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
          Prochains Départs
        </Typography>

        {isLoadingPassages ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} thickness={4} />
            <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>Chargement des horaires...</Typography>
          </Stack>
        ) : futurePassages.length > 0 ? (
          <Stack spacing={2}>
            <AnimatePresence>
              {futurePassages.map((passage, index) => {
                const icon = lineIcons?.find(li => li.code_ligne === passage.published_line_name);
                return (
                  <motion.div
                    key={`${passage.published_line_name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.4),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 3,
                        overflow: 'visible',
                      }}
                    >
                      <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Line Icon */}
                        <Box sx={{ position: 'relative' }}>
                          {icon ? (
                            <img
                              src={`/icons/${icon.picto_ligne}`}
                              alt={passage.published_line_name}
                              style={{ width: 42, height: 42 }}
                            />
                          ) : (
                            <Chip label={passage.published_line_name} sx={{ fontWeight: 800 }} />
                          )}
                        </Box>

                        {/* Destination & Time */}
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {passage.line_destination || 'Terminus'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                              {formatDuration(passage.delay || 'PT0S')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {passage.scheduled_arrival_time?.slice(0, 5)}
                            </Typography>
                          </Stack>
                        </Box>

                        {/* Real-time pulse */}
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: theme.palette.success.main,
                            boxShadow: `0 0 8px ${theme.palette.success.main}`,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 1, transform: 'scale(1)' },
                              '50%': { opacity: 0.5, transform: 'scale(1.5)' },
                              '100%': { opacity: 1, transform: 'scale(1)' },
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Stack>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.background.paper, 0.3), borderRadius: 3 }}>
            <DirectionsBusIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Aucun passage détecté prochainement</Typography>
          </Box>
        )}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={() => setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude })}
          sx={{ mt: 4, py: 1.5, borderRadius: 3, borderStyle: 'dashed' }}
        >
          Centrer sur la carte
        </Button>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={!!stop}
        onClose={onClose}
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
    <Fade in={!!stop}>
      <Card
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 400,
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

export default StopDetailsModal;
