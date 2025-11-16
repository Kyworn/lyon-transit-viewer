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
  Tab,
  InputAdornment,
  Chip,
  alpha,
  useTheme,
  Badge,
  Divider,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import SubwayIcon from '@mui/icons-material/Subway';
import RouteIcon from '@mui/icons-material/Route';
import ClearIcon from '@mui/icons-material/Clear';

const EnhancedSidebar: React.FC = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const { data: lines, isLoading, error } = useLines();
  const { data: stops, isLoading: isLoadingStops, error: errorStops } = useStops(false);
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useSelectionStore();

  const handleLineClick = (line: Line) => {
    setSelectedLine(line);
  };

  const handleInvertDirection = (e: React.MouseEvent, line: Line) => {
    e.stopPropagation();
    if (!lines) return;
    const otherDirectionLine = lines.find(
      (l) => l.line_sort_code === line.line_sort_code && l.direction !== line.direction
    );
    if (otherDirectionLine) {
      setSelectedLine(otherDirectionLine);
    }
  };

  const handleStopClick = (stop: Stop) => {
    setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bus':
        return <DirectionsBusIcon sx={{ fontSize: 20 }} />;
      case 'tram':
        return <TramIcon sx={{ fontSize: 20 }} />;
      case 'metro':
        return <SubwayIcon sx={{ fontSize: 20 }} />;
      default:
        return <RouteIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bus':
        return '#FF6B6B';
      case 'tram':
        return '#4ECDC4';
      case 'metro':
        return '#95E1D3';
      default:
        return theme.palette.grey[500];
    }
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

  const groupedLines = Object.values(uniqueLines).reduce(
    (acc: { [key: string]: Line[] }, line: Line) => {
      const category = line.category || 'Autre';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(line);
      return acc;
    },
    {}
  );

  const filteredGroupedLines = Object.keys(groupedLines).reduce(
    (acc: { [key: string]: Line[] }, category) => {
      const filteredLines = groupedLines[category].filter(
        (line: Line) =>
          line.line_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.line_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredLines.length > 0) {
        acc[category] = filteredLines;
      }
      return acc;
    },
    {}
  );

  const filteredStops = stops
    ? stops
        .filter(
          (stop: Stop) =>
            stop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stop.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 50)
    : [];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
        backdropFilter: 'blur(10px)',
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 700,
            mb: 0.5,
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Navigation
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.text.secondary, 0.8),
            fontSize: '0.75rem',
          }}
        >
          Explorez le réseau TCL
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 2, pt: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              borderRadius: '8px 8px 0 0',
            },
            '& .Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <Tab
            icon={<RouteIcon />}
            iconPosition="start"
            label="Lignes"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<LocationOnIcon />}
            iconPosition="start"
            label="Arrêts"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={activeTab === 0 ? 'Rechercher une ligne...' : 'Rechercher un arrêt...'}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: alpha(theme.palette.action.hover, 0.05),
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.1),
              },
              '&.Mui-focused': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            },
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {/* Tab Lignes */}
        {activeTab === 0 && (
          <>
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {error && (
              <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>
                Erreur de chargement des lignes.
              </Typography>
            )}

            {Object.keys(filteredGroupedLines)
              .sort()
              .map((category) => {
                const categoryColor = getCategoryColor(category);
                const lineCount = filteredGroupedLines[category].length;

                return (
                  <Accordion
                    key={category}
                    defaultExpanded
                    sx={{
                      mb: 1,
                      borderRadius: '12px !important',
                      border: `1px solid ${alpha(categoryColor, 0.2)}`,
                      '&:before': { display: 'none' },
                      boxShadow: 'none',
                      background: alpha(categoryColor, 0.03),
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        borderRadius: '12px',
                        '&:hover': {
                          backgroundColor: alpha(categoryColor, 0.05),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            background: alpha(categoryColor, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: categoryColor,
                          }}
                        >
                          {getCategoryIcon(category)}
                        </Box>
                        <Typography sx={{ fontWeight: 600, flex: 1 }}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Typography>
                        <Chip
                          label={lineCount}
                          size="small"
                          sx={{
                            height: 24,
                            backgroundColor: alpha(categoryColor, 0.2),
                            color: categoryColor,
                            fontWeight: 600,
                            border: `1px solid ${alpha(categoryColor, 0.3)}`,
                          }}
                        />
                      </Box>
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
                              sx={{
                                borderRadius: '8px',
                                mx: 1,
                                mb: 0.5,
                                '&.Mui-selected': {
                                  backgroundColor: alpha(categoryColor, 0.15),
                                  '&:hover': {
                                    backgroundColor: alpha(categoryColor, 0.2),
                                  },
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                <Chip
                                  label={lineToDisplay.line_code}
                                  size="small"
                                  sx={{
                                    height: 28,
                                    fontWeight: 700,
                                    backgroundColor: categoryColor,
                                    color: 'white',
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={lineToDisplay.line_name}
                                secondary={lineToDisplay.destination_name}
                                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                              />
                              <IconButton
                                edge="end"
                                aria-label="invert direction"
                                onClick={(e) => handleInvertDirection(e, lineToDisplay)}
                                size="small"
                                sx={{
                                  color: categoryColor,
                                  '&:hover': {
                                    backgroundColor: alpha(categoryColor, 0.1),
                                  },
                                }}
                              >
                                <SwapHorizIcon />
                              </IconButton>
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
          </>
        )}

        {/* Tab Arrêts */}
        {activeTab === 1 && (
          <>
            {isLoadingStops && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {errorStops && (
              <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>
                Erreur de chargement des arrêts.
              </Typography>
            )}

            {!isLoadingStops && !errorStops && (
              <List dense sx={{ px: 1 }}>
                {filteredStops.map((stop: Stop) => (
                  <ListItemButton
                    key={stop.id}
                    onClick={() => handleStopClick(stop)}
                    sx={{
                      borderRadius: '10px',
                      mb: 0.5,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                      },
                    }}
                  >
                    <ListItemIcon>
                      <LocationOnIcon sx={{ color: theme.palette.info.main }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={stop.name}
                      secondary={stop.municipality}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
                {filteredStops.length === 0 && searchTerm && (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    Aucun arrêt trouvé
                  </Typography>
                )}
                {filteredStops.length === 50 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ p: 2, textAlign: 'center', display: 'block' }}
                  >
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

export default EnhancedSidebar;
