import React from 'react';
import { useSelectionStore } from '../stores/selectionStore';
import { Vehicle, Stop } from '../types';
import { useLines } from '../hooks/useLines';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import SubwayIcon from '@mui/icons-material/Subway';
import PinDropIcon from '@mui/icons-material/PinDrop';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import SignpostIcon from '@mui/icons-material/Signpost';
import MyLocationIcon from '@mui/icons-material/MyLocation';

const SelectedItemDetails: React.FC = () => {
  const { selectedItem, setSelectedItem, setCenterCoordinates } = useSelectionStore();
  const { data: lines } = useLines();

  if (!selectedItem) return null;

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  const formatDuration = (duration: string) => {
    if (!duration || duration === 'PT0S') return "À l'heure";
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    
    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m`;

    if (formatted.trim() === '') return "À l'heure";
    
    return `Retard ${formatted.trim()}`;
  };

  const renderVehicleDetails = (vehicle: Vehicle) => {
    const vehicleLineCode = vehicle.line_ref ? vehicle.line_ref.substring(vehicle.line_ref.indexOf('::') + 2, vehicle.line_ref.lastIndexOf(':')) : null;
    const line = lines?.find(l => l.line_sort_code === vehicleLineCode);

    let Icon = DirectionsBusIcon;
    if (line?.category === 'metro') Icon = SubwayIcon;
    if (line?.category === 'tram') Icon = TramIcon;

    return (
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6">Détails du véhicule</Typography>
          <IconButton onClick={() => setSelectedItem(null)} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          <List>
            <ListItem>
              <ListItemIcon><Icon /></ListItemIcon>
              <ListItemText
                primary={`Ligne ${line ? line.line_name : vehicleLineCode || 'Inconnu'}`}
                secondary={vehicle.destination_name || line?.destination_name ? `Destination: ${vehicle.destination_name || line?.destination_name}` : undefined}
              />
            </ListItem>
            {vehicle.stop_point_name && (
              <>
                <Divider component="li" />
                <ListItem>
                  <ListItemIcon><PinDropIcon /></ListItemIcon>
                  <ListItemText
                    primary={`Prochain arrêt: ${vehicle.stop_point_name}`}
                    secondary={vehicle.expected_arrival_time ? `Arrivée estimée: ${formatTime(vehicle.expected_arrival_time)}` : undefined}
                  />
                </ListItem>
              </>
            )}
            <Divider component="li" />
            <ListItem>
              <ListItemIcon><ScheduleIcon /></ListItemIcon>
              <ListItemText primary={formatDuration(vehicle.delay)} />
            </ListItem>
            {vehicle.distance_from_stop !== undefined && (
              <>
                <Divider component="li" />
                <ListItem>
                  <ListItemIcon><AltRouteIcon /></ListItemIcon>
                  <ListItemText primary={`${vehicle.distance_from_stop}m de l\'arrêt`} />
                </ListItem>
              </>
            )}
          </List>
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={() => setCenterCoordinates({ lng: vehicle.longitude, lat: vehicle.latitude })}
            >
              Centrer sur la carte
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }

  const renderStopDetails = (stop: Stop) => {
    return (
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6">Détails de l\'arrêt</Typography>
          <IconButton onClick={() => setSelectedItem(null)} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          <List>
            <ListItem>
              <ListItemIcon><SignpostIcon /></ListItemIcon>
              <ListItemText primary={stop.name} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary={`Commune: ${stop.municipality}`} />
            </ListItem>
            <ListItem>
              <ListItemText primary={`Adresse: ${stop.address || 'Non disponible'}`} />
            </ListItem>
          </List>
        </Box>
      </Paper>
    );
  }

  if (selectedItem.type === 'vehicle') {
    return renderVehicleDetails(selectedItem as Vehicle);
  } else if (selectedItem.type === 'stop') {
    return renderStopDetails(selectedItem as Stop);
  } else {
    return null;
  }
};

export default SelectedItemDetails;
