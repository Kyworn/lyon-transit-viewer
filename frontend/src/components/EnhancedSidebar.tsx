import React, { useState } from 'react';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';
import { useSelectionStore } from '../stores/selectionStore';
import { useFavoritesStore } from '../stores/favoritesStore';
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
  Divider,
  Collapse,
  Fade,
  Zoom,
  Skeleton,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const EnhancedSidebar: React.FC = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const { data: lines, isLoading, error } = useLines();
  const { data: stops, isLoading: isLoadingStops, error: errorStops } = useStops(false);
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useSelectionStore();
  const { favoriteLines, favoriteStops, addFavoriteLine, removeFavoriteLine, isFavoriteLine, addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavoritesStore();

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

  // Loading skeleton
  const LoadingSkeleton = () => (
    <Box sx={{ p: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '12px', mb: 1 }} />
        </Box>
      ))}
    </Box>
  );

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
      <Fade in timeout={600}>
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

          {/* Selected line indicator */}
          <Collapse in={selectedLine !== null} timeout={300}>
            <Zoom in={selectedLine !== null} timeout={400}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Ligne ${selectedLine?.line_code} sélectionnée`}
                size="small"
                onDelete={() => setSelectedLine(null)}
                sx={{
                  mt: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.2),
                  color: theme.palette.success.light,
                  fontWeight: 600,
                  border: `1px solid ${alpha(theme.palette.success.light, 0.3)}`,
                }}
              />
            </Zoom>
          </Collapse>
        </Box>
      </Fade>

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
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            },
            '& .Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<RouteIcon />} iconPosition="start" label="Lignes" sx={{ minHeight: 48 }} />
          <Tab icon={<LocationOnIcon />} iconPosition="start" label="Arrêts" sx={{ minHeight: 48 }} />
          <Tab icon={<StarIcon />} iconPosition="start" label="Favoris" sx={{ minHeight: 48 }} />
        </Tabs>
      </Box>

      {/* Search */}
      <Fade in timeout={800}>
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
                  <Zoom in timeout={200}>
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Zoom>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: alpha(theme.palette.action.hover, 0.05),
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                },
                '&.Mui-focused': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                },
              },
            }}
          />
        </Box>
      </Fade>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {/* Tab Lignes */}
        {activeTab === 0 && (
          <>
            {isLoading && <LoadingSkeleton />}
            {error && (
              <Fade in timeout={500}>
                <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>
                  Erreur de chargement des lignes.
                </Typography>
              </Fade>
            )}

            {!isLoading && Object.keys(filteredGroupedLines)
              .sort()
              .map((category, categoryIndex) => {
                const categoryColor = getCategoryColor(category);
                const lineCount = filteredGroupedLines[category].length;

                return (
                  <Fade in timeout={300 + categoryIndex * 100} key={category}>
                    <Accordion
                      defaultExpanded
                      sx={{
                        mb: 1,
                        borderRadius: '12px !important',
                        border: `1px solid ${alpha(categoryColor, 0.2)}`,
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                        background: alpha(categoryColor, 0.03),
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          boxShadow: `0 4px 12px ${alpha(categoryColor, 0.15)}`,
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          borderRadius: '12px',
                          transition: 'all 0.3s ease-in-out',
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
                              transition: 'all 0.3s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.1) rotate(5deg)',
                              },
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
                          {filteredGroupedLines[category].map((line: Line, index: number) => {
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
                                  transition: 'all 0.2s ease-in-out',
                                  '&.Mui-selected': {
                                    backgroundColor: alpha(categoryColor, 0.15),
                                    boxShadow: `0 2px 8px ${alpha(categoryColor, 0.2)}`,
                                    transform: 'translateX(4px)',
                                    '&:hover': {
                                      backgroundColor: alpha(categoryColor, 0.2),
                                    },
                                  },
                                  '&:hover': {
                                    transform: 'translateX(2px)',
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
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    isFavoriteLine(lineToDisplay.line_sort_code)
                                      ? removeFavoriteLine(lineToDisplay.line_sort_code)
                                      : addFavoriteLine(lineToDisplay.line_sort_code);
                                  }}
                                  sx={{
                                    color: isFavoriteLine(lineToDisplay.line_sort_code) ? theme.palette.warning.main : alpha(theme.palette.text.secondary, 0.5),
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      color: theme.palette.warning.main,
                                      transform: 'scale(1.1)',
                                    },
                                  }}
                                >
                                  {isFavoriteLine(lineToDisplay.line_sort_code) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  aria-label="invert direction"
                                  onClick={(e) => handleInvertDirection(e, lineToDisplay)}
                                  size="small"
                                  sx={{
                                    color: categoryColor,
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      backgroundColor: alpha(categoryColor, 0.1),
                                      transform: 'rotate(180deg)',
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
                  </Fade>
                );
              })}
          </>
        )}

        {/* Tab Arrêts */}
        {activeTab === 1 && (
          <>
            {isLoadingStops && <LoadingSkeleton />}
            {errorStops && (
              <Fade in timeout={500}>
                <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>
                  Erreur de chargement des arrêts.
                </Typography>
              </Fade>
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
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        transform: 'translateX(4px)',
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
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        isFavoriteStop(stop.id)
                          ? removeFavoriteStop(stop.id)
                          : addFavoriteStop(stop.id);
                      }}
                      sx={{
                        color: isFavoriteStop(stop.id) ? theme.palette.warning.main : alpha(theme.palette.text.secondary, 0.5),
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          color: theme.palette.warning.main,
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      {isFavoriteStop(stop.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </ListItemButton>
                ))}
                {filteredStops.length === 0 && searchTerm && (
                  <Fade in timeout={500}>
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      Aucun arrêt trouvé
                    </Typography>
                  </Fade>
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

        {/* Tab Favoris */}
        {activeTab === 2 && (
          <>
            {favoriteLines.length === 0 && favoriteStops.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StarBorderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  Aucun favori enregistré
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Ajoutez des lignes ou arrêts en cliquant sur l'étoile
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Favorite Lines */}
                {favoriteLines.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600, color: 'text.secondary' }}>
                      Lignes favorites
                    </Typography>
                    <List dense sx={{ px: 1 }}>
                      {lines?.filter(l => favoriteLines.includes(l.line_sort_code)).map(line => {
                        const categoryColor = getCategoryColor(line.category);
                        const isSelected = selectedLine?.line_sort_code === line.line_sort_code;

                        return (
                          <ListItemButton
                            key={line.id}
                            selected={isSelected}
                            onClick={() => handleLineClick(line)}
                            sx={{
                              borderRadius: '8px',
                              mb: 0.5,
                              transition: 'all 0.2s ease-in-out',
                              '&.Mui-selected': {
                                backgroundColor: alpha(categoryColor, 0.15),
                                boxShadow: `0 2px 8px ${alpha(categoryColor, 0.2)}`,
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <Chip
                                label={line.line_code}
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
                              primary={line.line_name}
                              secondary={line.destination_name}
                              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                              secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavoriteLine(line.line_sort_code);
                              }}
                              sx={{ color: theme.palette.warning.main }}
                            >
                              <StarIcon fontSize="small" />
                            </IconButton>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Box>
                )}

                {/* Favorite Stops */}
                {favoriteStops.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600, color: 'text.secondary' }}>
                      Arrêts favoris
                    </Typography>
                    <List dense sx={{ px: 1 }}>
                      {stops?.filter(s => favoriteStops.includes(s.id)).map(stop => (
                        <ListItemButton
                          key={stop.id}
                          onClick={() => handleStopClick(stop)}
                          sx={{
                            borderRadius: '10px',
                            mb: 0.5,
                            transition: 'all 0.2s ease-in-out',
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
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavoriteStop(stop.id);
                            }}
                            sx={{ color: theme.palette.warning.main }}
                          >
                            <StarIcon fontSize="small" />
                          </IconButton>
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default EnhancedSidebar;
