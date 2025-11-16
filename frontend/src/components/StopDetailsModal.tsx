import React from 'react';
import { Box, Typography, IconButton, Chip, Stack, Divider, CircularProgress, List, ListItem, ListItemText, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessibleIcon from '@mui/icons-material/Accessible';
import ElevatorIcon from '@mui/icons-material/Elevator';
import EscalatorIcon from '@mui/icons-material/Escalator';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { Stop, LineIcon } from '../types';
import { useNextPassages } from '../hooks/useNextPassages';
import { useSelectionStore } from '../stores/selectionStore';

interface StopDetailsModalProps {
  stop: Stop | null;
  onClose: () => void;
  lineIcons: LineIcon[] | null | undefined;
  anchorPosition: { top: number; left: number } | null;
}

const StopDetailsModal: React.FC<StopDetailsModalProps> = ({ stop, onClose, lineIcons, anchorPosition }) => {
  const { data: nextPassages, isLoading: isLoadingPassages } = useNextPassages(stop?.id || null, !!stop);
  const setCenterCoordinates = useSelectionStore((state) => state.setCenterCoordinates);

  if (!stop || !anchorPosition) {
    return null;
  }

  const formatDuration = (duration: string) => {
    if (!duration || duration === 'PT0S') return "À l'heure";
    const match = duration.match(/PT(?:(-?)(\d+)H)?(?:(-?)(\d+)M)?(?:(-?)(\d+)S)?/);
    if (!match) return duration;

    const sign = match[1] || match[3] || match[5] || '';
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[4] || '0');

    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m`;

    if (formatted.trim() === '') return "À l'heure";

    return sign === '-' ? `Avance ${formatted.trim()}` : `Retard ${formatted.trim()}`;
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

  // Filter passages to only show future ones (considering delays)
  const filterFuturePassages = (passages: any[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    return passages.filter(passage => {
      if (!passage.scheduled_arrival_time) return false;

      // Parse scheduled time (format: "HH:MM:SS" or "HH:MM")
      const [hours, minutes] = passage.scheduled_arrival_time.split(':').map(Number);
      const scheduledMinutes = hours * 60 + minutes;

      // Add delay to get actual arrival time
      const delayMinutes = parseDurationToMinutes(passage.delay || 'PT0S');
      const actualArrivalMinutes = scheduledMinutes + delayMinutes;

      // Only show if actual arrival is in the future
      return actualArrivalMinutes > currentTotalMinutes;
    });
  };

  // Parse service_info to extract lines serving this stop
  const servingLines = stop.service_info
    ? stop.service_info.split(',').map(service => {
        const [lineCode, direction] = service.split(':');
        return { lineCode, direction: direction === 'A' ? 'Aller' : 'Retour' };
      })
    : [];

  // Get unique line codes
  const uniqueLines = Array.from(new Set(servingLines.map(l => l.lineCode)));

  const style = {
    position: 'absolute' as 'absolute',
    top: `${anchorPosition.top}px`,
    left: `${anchorPosition.left}px`,
    transform: 'translate(-50%, -110%)',
    width: 350,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 2,
    zIndex: 1300,
    maxHeight: '400px',
    overflowY: 'auto',
  };

  return (
    <Box sx={style}>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>

      <Typography variant="h6" component="h2" sx={{ pr: 4, mb: 1 }}>
        {stop.name}
      </Typography>

      {/* Lines serving this stop */}
      {uniqueLines.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
            Lignes desservies
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {uniqueLines.map((lineCode) => {
              const icon = lineIcons?.find(li => li.code_ligne === lineCode);
              return icon ? (
                <img
                  key={lineCode}
                  src={`/icons/${icon.picto_ligne}`}
                  alt={lineCode}
                  style={{ width: 32, height: 32, margin: '2px' }}
                />
              ) : (
                <Chip key={lineCode} label={lineCode} size="small" />
              );
            })}
          </Stack>
        </>
      )}

      {/* Next passages */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Prochains passages
      </Typography>
      {isLoadingPassages ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : nextPassages && nextPassages.length > 0 ? (
        <List dense sx={{ py: 0 }}>
          {filterFuturePassages(nextPassages).slice(0, 5).map((passage, index) => {
            const icon = lineIcons?.find(li => li.code_ligne === passage.published_line_name);
            return (
              <ListItem key={index} sx={{ px: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  {icon ? (
                    <img
                      src={`/icons/${icon.picto_ligne}`}
                      alt={passage.published_line_name}
                      style={{ width: 24, height: 24 }}
                    />
                  ) : (
                    <Chip label={passage.published_line_name} size="small" />
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                      {passage.line_destination || 'Destination inconnue'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {passage.scheduled_arrival_time ? passage.scheduled_arrival_time.slice(0, 5) : 'Horaire inconnu'}
                      {passage.delay && passage.delay !== 'PT0S' && ` - ${formatDuration(passage.delay)}`}
                    </Typography>
                  </Box>
                </Stack>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Aucun passage prévu prochainement
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Location info */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <LocationOnIcon fontSize="small" color="action" />
        <Box>
          <Typography variant="body2">
            {stop.address || 'Adresse non disponible'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stop.municipality}
          </Typography>
          {stop.zone && (
            <Typography variant="caption" color="text.secondary">
              Zone: {stop.zone}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Accessibility */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Accessibilité
      </Typography>
      <Stack direction="row" spacing={2}>
        {stop.pmr_accessible && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessibleIcon fontSize="small" color="primary" />
            <Typography variant="caption">PMR</Typography>
          </Box>
        )}
        {stop.has_elevator && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ElevatorIcon fontSize="small" color="primary" />
            <Typography variant="caption">Ascenseur</Typography>
          </Box>
        )}
        {stop.has_escalator && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <EscalatorIcon fontSize="small" color="primary" />
            <Typography variant="caption">Escalator</Typography>
          </Box>
        )}
        {!stop.pmr_accessible && !stop.has_elevator && !stop.has_escalator && (
          <Typography variant="caption" color="text.secondary">
            Aucune information d'accessibilité
          </Typography>
        )}
      </Stack>

      {/* Center map button */}
      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={() => setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude })}
        >
          Centrer sur la carte
        </Button>
      </Box>
    </Box>
  );
};

export default StopDetailsModal;
