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
  Avatar,
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
import { useNextPassagesByLine } from '../hooks/useNextPassages';
import { useLines } from '../hooks/useLines';
import { useSelectionStore } from '../stores/selectionStore';

interface StopDetailsModalProps {
  stop: Stop | null;
  onClose: () => void;
  lineIcons: LineIcon[] | null | undefined;
  anchorPosition: { top: number; left: number } | null;
  allStops?: Stop[];
  onSelectStop?: (stop: Stop) => void;
}

const StopDetailsModal: React.FC<StopDetailsModalProps> = ({ stop, onClose, lineIcons, allStops, onSelectStop }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const selectedLine = useSelectionStore((state) => state.selectedLine);
  const { data: nextPassages, isLoading: isLoadingPassages } = useNextPassagesByLine(
    stop?.id || null,
    !!stop,
    selectedLine?.line_sort_code,
    selectedLine?.line_code,
    selectedLine?.direction,
    selectedLine?.destination_name
  );
  const { data: lines } = useLines({ includeTrace: false });
  const setCenterCoordinates = useSelectionStore((state) => state.setCenterCoordinates);
  const setSelectedLine = useSelectionStore((state) => state.setSelectedLine);

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

  const formatDestinationName = (value?: string | null) => {
    const raw = (value || '').trim();
    if (!raw) return 'Direction inconnue';
    if (raw.startsWith('ActIV:StopArea:')) return 'Direction en cours';
    return raw;
  };
  const formatEtaMinutes = (iso?: string | null) => {
    if (!iso) return "À l'approche";
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "À l'approche";
    const deltaMs = ts - Date.now();
    if (deltaMs <= 30_000) return "Imminent";
    return `${Math.max(1, Math.ceil(deltaMs / 60000))} min`;
  };

  const canonicalLineCode = (value?: string | null) =>
    (value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^NAVI/, 'NAV')
      .trim();
  const normalizeText = (value?: string | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const extractLineCode = (service: string) => {
    const raw = (service || '').trim();
    if (!raw) return '';
    const leading = raw.split(':')[0]?.trim() || '';
    if (/^(?:[ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})$/i.test(leading)) {
      return canonicalLineCode(leading);
    }
    const match = raw.match(/(?:^|::)([ABCD]|RX|REX|[A-Z]{1,6}\d{0,3}[A-Z]?|\d{1,4})(?::|$)/i);
    return canonicalLineCode(match?.[1] || '');
  };
  const extractDirectionCode = (service: string) => {
    const parts = (service || '').split(':').map((p) => p.trim()).filter(Boolean);
    const last = (parts[parts.length - 1] || '').toUpperCase();
    if (last === 'A' || last === 'ALLER' || last === 'OUTBOUND') return 'A';
    if (last === 'R' || last === 'RETOUR' || last === 'INBOUND') return 'R';
    return '';
  };
  const stopHasLineDirection = (candidate: Stop, lineCode: string, directionCode: string) => {
    const services = (candidate.service_info || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return services.some((svc) => {
      const svcLine = extractLineCode(svc);
      const svcDir = extractDirectionCode(svc);
      return svcLine === lineCode && svcDir === directionCode;
    });
  };
  const findOppositeStopForDirection = (targetDirection: 'Aller' | 'Retour', lineCode: string) => {
    if (!stop || !allStops || allStops.length === 0) return null;
    const targetDirCode = targetDirection === 'Aller' ? 'A' : 'R';
    if (stopHasLineDirection(stop, lineCode, targetDirCode)) return null;

    const currentName = normalizeText(stop.name);
    const siblings = allStops.filter((s) => s.id !== stop.id && normalizeText(s.name) === currentName);
    const sameNameMatch = siblings.find((s) => stopHasLineDirection(s, lineCode, targetDirCode));
    if (sameNameMatch) return sameNameMatch;

    const inTown = allStops.filter((s) => (s.municipality || '') === (stop.municipality || ''));
    const townMatch = inTown.find((s) => stopHasLineDirection(s, lineCode, targetDirCode));
    return townMatch || null;
  };
  const applyDirection = (direction: 'Aller' | 'Retour') => {
    const next = direction === 'Aller' ? lineDirections.aller : lineDirections.retour;
    if (!next) return;
    setSelectedLine(next);

    const lineCode = canonicalLineCode(next.line_sort_code || next.line_code || selectedLine?.line_sort_code || '');
    const oppositeStop = findOppositeStopForDirection(direction, lineCode);
    if (oppositeStop && onSelectStop) {
      onSelectStop(oppositeStop);
    }
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

  const displayedPassages = useMemo(() => {
    if (!nextPassages) return [];
    const now = Date.now();
    const upcoming = nextPassages.filter((passage) => {
      if (!passage.expected_arrival_time) return true;
      const t = new Date(passage.expected_arrival_time).getTime();
      return Number.isFinite(t) ? t >= now - 60_000 : true;
    });
    return (upcoming.length > 0 ? upcoming : nextPassages).slice(0, 5);
  }, [nextPassages]);

  const servingLines = useMemo(() => {
    if (!stop?.service_info) return [];
    const byCode = new Map<string, string>();
    stop.service_info
      .split(',')
      .map((service) => service.trim())
      .filter(Boolean)
      .forEach((rawService) => {
        const code = extractLineCode(rawService);
        if (code && !byCode.has(code)) byCode.set(code, code);
      });

    return Array.from(byCode.entries()).map(([canonicalCode, displayCode]) => {
      const line = lines?.find((l) => canonicalLineCode(l.line_sort_code) === canonicalCode);
      return {
        code: displayCode,
        canonicalCode,
        color: line?.color || null,
        destination: line?.destination_name || null,
      };
    });
  }, [stop, lines]);

  const lineDirections = useMemo(() => {
    if (!selectedLine?.line_sort_code || !lines) return { aller: null as any, retour: null as any };
    const sameCode = lines.filter((l) => canonicalLineCode(l.line_sort_code) === canonicalLineCode(selectedLine.line_sort_code));
    return {
      aller: sameCode.find((l) => (l.direction || '').toLowerCase() === 'aller') || null,
      retour: sameCode.find((l) => (l.direction || '').toLowerCase() === 'retour') || null,
    };
  }, [lines, selectedLine]);

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
          {servingLines.map((line) => {
            const icon = lineIcons?.find(li => canonicalLineCode(li.code_ligne) === line.canonicalCode);
            const chipBg = line.color
              ? (line.color.startsWith('#') ? line.color : `#${line.color}`)
              : alpha(theme.palette.background.paper, 0.7);
            return (
              <Chip
                key={line.code}
                label={line.code}
                avatar={
                  icon ? (
                    <Avatar
                      alt=""
                      src={`/icons/${icon.picto_ligne}`}
                      sx={{ width: 20, height: 20 }}
                      imgProps={{ alt: '' }}
                    />
                  ) : undefined
                }
                sx={{
                  fontWeight: 800,
                  bgcolor: chipBg,
                  color: '#fff',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.05)' },
                }}
              />
            );
          })}
        </Stack>

        {selectedLine && (lineDirections.aller || lineDirections.retour) && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
              Sens
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              {lineDirections.aller && (
                <Chip
                  label="Aller"
                  color={(selectedLine.direction || '').toLowerCase() === 'aller' ? 'primary' : 'default'}
                  variant={(selectedLine.direction || '').toLowerCase() === 'aller' ? 'filled' : 'outlined'}
                  onClick={() => applyDirection('Aller')}
                />
              )}
              {lineDirections.retour && (
                <Chip
                  label="Retour"
                  color={(selectedLine.direction || '').toLowerCase() === 'retour' ? 'primary' : 'default'}
                  variant={(selectedLine.direction || '').toLowerCase() === 'retour' ? 'filled' : 'outlined'}
                  onClick={() => applyDirection('Retour')}
                />
              )}
            </Stack>
          </>
        )}

        {/* Next Passages Timeline */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
          Prochains Départs
        </Typography>

        {isLoadingPassages ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} thickness={4} />
            <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>Chargement des horaires...</Typography>
          </Stack>
        ) : displayedPassages.length > 0 ? (
          <Stack spacing={2}>
              {displayedPassages.map((passage, index) => {
                const icon = lineIcons?.find(li => li.code_ligne === passage.published_line_name);
                return (
                  <Box key={`${passage.published_line_name}-${index}`}>
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
                              {formatDestinationName(passage.line_destination)}
                            </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                              {passage.expected_arrival_time
                                ? formatEtaMinutes(passage.expected_arrival_time)
                                : formatDuration(passage.delay || 'PT0S')}
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
                  </Box>
                );
              })}
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
