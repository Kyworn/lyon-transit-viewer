import React, { useState } from 'react';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';
import { useSelectionStore } from '../stores/selectionStore';
import { Line, Stop } from '../types';
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
  ListItemIcon,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Sidebar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const { data: lines, isLoading, error } = useLines();
  const { data: stops, isLoading: isLoadingStops, error: errorStops } = useStops(false);
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useSelectionStore();

  const handleLineClick = (line: Line) => {
    setSelectedLine(line);
  };

  const handleInvertDirection = (e: React.MouseEvent, line: Line) => {
    e.stopPropagation(); // Prevent the ListItemButton click event
    if (!lines) return;
    const otherDirectionLine = lines.find(l => l.line_sort_code === line.line_sort_code && l.direction !== line.direction);
    if (otherDirectionLine) {
      setSelectedLine(otherDirectionLine);
    }
  };

  const handleStopClick = (stop: Stop) => {
    setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
  };

  const uniqueLines = lines
    ? lines
        .filter((line) => line.line_type_name !== null)
        .reduce((acc: { [key: string]: Line }, line: Line) => {
          if (!acc[line.line_sort_code]) {
            acc[line.line_sort_code] = line;
          }
          return acc;
        }, {})
    : {};

  const groupedLines = Object.values(uniqueLines).reduce((acc: { [key: string]: Line[] }, line: Line) => {
    const category = line.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(line);
    return acc;
  }, {});

  const filteredGroupedLines = Object.keys(groupedLines).reduce((acc: { [key: string]: Line[] }, category) => {
    const filteredLines = groupedLines[category].filter((line: Line) =>
      line.line_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.line_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredLines.length > 0) {
      acc[category] = filteredLines;
    }
    return acc;
  }, {});

  const filteredStops = stops
    ? stops.filter((stop: Stop) =>
        stop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stop.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50) // Limit to 50 results for performance
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Transports à Lyon
        </Typography>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label="Lignes" />
          <Tab label="Arrêts" />
        </Tabs>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={activeTab === 0 ? "Rechercher une ligne..." : "Rechercher un arrêt..."}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Tab Lignes */}
        {activeTab === 0 && (
          <>
            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {error && <Typography color="error" sx={{ p: 4 }}>Erreur de chargement des lignes.</Typography>}

            {Object.keys(filteredGroupedLines).sort().map((category) => (
              <Accordion key={category} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{category.charAt(0).toUpperCase() + category.slice(1)}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <List dense>
                    {filteredGroupedLines[category].map((line: Line) => {
                      const isSelected = selectedLine?.line_sort_code === line.line_sort_code;
                      const lineToDisplay = isSelected ? selectedLine! : line;

                      return (
                        <ListItemButton
                          key={lineToDisplay.id}
                          selected={isSelected}
                          onClick={() => handleLineClick(lineToDisplay)}
                        >
                          <ListItemIcon sx={{ minWidth: 40, fontWeight: 'bold' }}>
                            {lineToDisplay.line_code}
                          </ListItemIcon>
                          <ListItemText
                            primary={lineToDisplay.line_name}
                            secondary={lineToDisplay.destination_name}
                          />
                          <IconButton
                            edge="end"
                            aria-label="invert direction"
                            onClick={(e) => handleInvertDirection(e, lineToDisplay)}
                          >
                            <SwapHorizIcon />
                          </IconButton>
                        </ListItemButton>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}

        {/* Tab Arrêts */}
        {activeTab === 1 && (
          <>
            {isLoadingStops && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {errorStops && <Typography color="error" sx={{ p: 4 }}>Erreur de chargement des arrêts.</Typography>}

            {!isLoadingStops && !errorStops && (
              <List dense>
                {filteredStops.map((stop: Stop) => (
                  <ListItemButton key={stop.id} onClick={() => handleStopClick(stop)}>
                    <ListItemIcon>
                      <LocationOnIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={stop.name}
                      secondary={stop.municipality}
                    />
                  </ListItemButton>
                ))}
                {filteredStops.length === 0 && searchTerm && (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    Aucun arrêt trouvé
                  </Typography>
                )}
                {filteredStops.length === 50 && (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 2, textAlign: 'center', display: 'block' }}>
                    Affichage limité à 50 résultats. Affinez votre recherche.
                  </Typography>
                )}
              </List>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
