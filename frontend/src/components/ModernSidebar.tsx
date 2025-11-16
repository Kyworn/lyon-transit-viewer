import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';
import { useSelectionStore } from '../stores/selectionStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { Line, Stop } from '../types';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { MetroIcon, BusIcon, TramIcon, FunicularIcon, getTransportIcon } from './TransportIcons';

const ModernSidebar: React.FC = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: lines, isLoading } = useLines();
  const { data: stops, isLoading: isLoadingStops } = useStops(false);
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useSelectionStore();
  const { favoriteLines, favoriteStops, addFavoriteLine, removeFavoriteLine, isFavoriteLine, addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavoritesStore();

  const getCategoryIcon = (category: string) => {
    const Icon = getTransportIcon(category);
    return <Icon />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bus': return '#FF6B6B';
      case 'tram': return '#4ECDC4';
      case 'metro': return '#95E1D3';
      default: return theme.palette.grey[500];
    }
  };

  const groupedLines = useMemo(() => {
    if (!lines) return {};

    const unique = lines.reduce((acc: { [key: string]: Line }, line: Line) => {
      if (!acc[line.line_sort_code]) {
        acc[line.line_sort_code] = line;
      }
      return acc;
    }, {});

    return Object.values(unique).reduce((acc: { [key: string]: Line[] }, line: Line) => {
      const category = line.category || 'Autre';
      if (!acc[category]) acc[category] = [];
      acc[category].push(line);
      return acc;
    }, {});
  }, [lines]);

  const filteredLines = useMemo(() => {
    const source = searchTerm ? groupedLines : groupedLines;

    if (!searchTerm) {
      // No search: apply category limits
      const limited: { [key: string]: Line[] } = {};
      Object.entries(source).forEach(([category, categoryLines]) => {
        // Limit bus category to 20 unless expanded
        if (category === 'bus' && !expandedCategories[category]) {
          limited[category] = categoryLines.slice(0, 20);
        } else {
          limited[category] = categoryLines;
        }
      });
      return limited;
    } else {
      // Search mode: show all matching
      const filtered: { [key: string]: Line[] } = {};
      Object.entries(source).forEach(([category, categoryLines]) => {
        const matching = categoryLines.filter(line =>
          line.line_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.line_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (matching.length > 0) filtered[category] = matching;
      });
      return filtered;
    }
  }, [groupedLines, searchTerm, expandedCategories]);

  const filteredStops = useMemo(() => {
    if (!stops || !searchTerm) return [];
    return stops
      .filter(stop =>
        stop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stop.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 20);
  }, [stops, searchTerm]);

  const favoriteLinesList = useMemo(() => {
    if (!lines) return [];
    return lines.filter(l => favoriteLines.includes(l.line_sort_code));
  }, [lines, favoriteLines]);

  const favoriteStopsList = useMemo(() => {
    if (!stops) return [];
    return stops.filter(s => favoriteStops.includes(s.id));
  }, [stops, favoriteStops]);

  const handleLineClick = (line: Line) => {
    setSelectedLine(line);
  };

  const handleInvertDirection = (e: React.MouseEvent, line: Line) => {
    e.stopPropagation();
    if (!lines) return;
    const other = lines.find(l => l.line_sort_code === line.line_sort_code && l.direction !== line.direction);
    if (other) setSelectedLine(other);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Modern Glassmorphism Header */}
      <Box sx={{
        p: 2.5,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(20px)',
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.05)}`,
      }}>
        <Typography variant="h5" sx={{
          fontWeight: 800,
          mb: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Réseau TCL
        </Typography>

        <TextField
          fullWidth
          size="medium"
          placeholder="Rechercher une ligne ou un arrêt..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.primary.main }} />
              </InputAdornment>
            ),
            endAdornment: searchInput && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchInput('')}
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      transform: 'rotate(90deg)',
                    },
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
              '&:hover': {
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                borderColor: alpha(theme.palette.primary.main, 0.3),
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
              '&.Mui-focused': {
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                borderColor: theme.palette.primary.main,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
            },
          }}
        />
      </Box>

      {/* Compact Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 40,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiTab-root': {
            minHeight: 40,
            fontSize: '0.813rem',
            textTransform: 'none',
            fontWeight: 600,
          },
        }}
      >
        <Tab label="Lignes" />
        <Tab label="Arrêts" />
        <Tab label="Favoris" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {/* Lines Tab */}
        {activeTab === 0 && (
          <Stack spacing={1.5}>
            {Object.entries(filteredLines)
              .sort((a, b) => {
                // Custom sort: metro, tram, funicular first, then bus
                const order: { [key: string]: number } = { metro: 1, tram: 2, funicular: 3, bus: 4 };
                return (order[a[0]] || 99) - (order[b[0]] || 99);
              })
              .map(([category, categoryLines]) => {
                const totalInCategory = groupedLines[category]?.length || 0;
                const isLimited = category === 'bus' && !expandedCategories[category] && !searchTerm && totalInCategory > 20;

                return (
                <Box key={category}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1 }}>
                    <Box sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      bgcolor: alpha(getCategoryColor(category), 0.15),
                      color: getCategoryColor(category),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {getCategoryIcon(category)}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                      {category}
                    </Typography>
                    <Chip label={categoryLines.length} size="small" sx={{ height: 18, fontSize: '0.688rem' }} />
                  </Box>

                  <Stack spacing={0.5}>
                    <AnimatePresence>
                    {categoryLines.map((line, idx) => {
                      const isSelected = selectedLine?.line_sort_code === line.line_sort_code;
                      const lineToDisplay = isSelected ? selectedLine! : line;
                      const categoryColor = getCategoryColor(category);

                      return (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: idx * 0.02, duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                        >
                        <Card
                          onClick={() => handleLineClick(lineToDisplay)}
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                            bgcolor: isSelected ? alpha(categoryColor, 0.15) : alpha(theme.palette.background.paper, 0.6),
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${isSelected ? alpha(categoryColor, 0.4) : alpha(theme.palette.divider, 0.1)}`,
                            boxShadow: isSelected ? `0 8px 24px ${alpha(categoryColor, 0.2)}` : 'none',
                            '&:hover': {
                              bgcolor: alpha(categoryColor, 0.12),
                              borderColor: alpha(categoryColor, 0.3),
                              transform: 'translateX(6px) scale(1.02)',
                              boxShadow: `0 12px 32px ${alpha(categoryColor, 0.15)}`,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  background: `linear-gradient(135deg, ${categoryColor} 0%, ${alpha(categoryColor, 0.7)} 100%)`,
                                  fontSize: '0.875rem',
                                  fontWeight: 800,
                                  boxShadow: `0 4px 12px ${alpha(categoryColor, 0.3)}`,
                                  border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                                  position: 'relative',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                                    borderRadius: '50%',
                                  },
                                }}
                              >
                                {lineToDisplay.line_code}
                              </Avatar>

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>
                                  {lineToDisplay.line_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {lineToDisplay.destination_name}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    isFavoriteLine(lineToDisplay.line_sort_code)
                                      ? removeFavoriteLine(lineToDisplay.line_sort_code)
                                      : addFavoriteLine(lineToDisplay.line_sort_code);
                                  }}
                                  sx={{ width: 28, height: 28 }}
                                >
                                  {isFavoriteLine(lineToDisplay.line_sort_code) ? (
                                    <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                                  ) : (
                                    <StarBorderIcon sx={{ fontSize: 16 }} />
                                  )}
                                </IconButton>

                                <IconButton
                                  size="small"
                                  onClick={(e) => handleInvertDirection(e, lineToDisplay)}
                                  sx={{ width: 28, height: 28 }}
                                >
                                  <SwapHorizIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>

                    {/* Show More Button for bus category */}
                    {isLimited && (
                      <Card
                        onClick={() => setExpandedCategories({ ...expandedCategories, [category]: true })}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                          },
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                            Voir {totalInCategory - 20} lignes de plus...
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </Box>
                );
              })}
          </Stack>
        )}

        {/* Stops Tab */}
        {activeTab === 1 && (
          <Stack spacing={0.5}>
            {!searchTerm && (
              <Typography variant="caption" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                Commencez à taper pour rechercher un arrêt
              </Typography>
            )}
            {filteredStops.map(stop => (
              <Card
                key={stop.id}
                onClick={() => setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude })}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.info.main, 0.15) }}>
                      <LocationOnIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>
                        {stop.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {stop.municipality}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        isFavoriteStop(stop.id) ? removeFavoriteStop(stop.id) : addFavoriteStop(stop.id);
                      }}
                      sx={{ width: 28, height: 28 }}
                    >
                      {isFavoriteStop(stop.id) ? (
                        <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                      ) : (
                        <StarBorderIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {/* Favorites Tab */}
        {activeTab === 2 && (
          <Stack spacing={2}>
            {favoriteLinesList.length === 0 && favoriteStopsList.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StarBorderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Aucun favori
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cliquez sur ⭐ pour ajouter
                </Typography>
              </Box>
            ) : (
              <>
                {favoriteLinesList.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 1, mb: 1, display: 'block', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Lignes
                    </Typography>
                    <Stack spacing={0.5}>
                      {favoriteLinesList.map(line => {
                        const categoryColor = getCategoryColor(line.category);
                        return (
                          <Card
                            key={line.id}
                            onClick={() => handleLineClick(line)}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: alpha(categoryColor, 0.08),
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: categoryColor, fontSize: '0.813rem', fontWeight: 700 }}>
                                  {line.line_code}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>
                                    {line.line_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {line.destination_name}
                                  </Typography>
                                </Box>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeFavoriteLine(line.line_sort_code); }} sx={{ width: 28, height: 28 }}>
                                  <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                                </IconButton>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {favoriteStopsList.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 1, mb: 1, display: 'block', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Arrêts
                    </Typography>
                    <Stack spacing={0.5}>
                      {favoriteStopsList.map(stop => (
                        <Card
                          key={stop.id}
                          onClick={() => setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude })}
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.info.main, 0.08),
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.info.main, 0.15) }}>
                                <LocationOnIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }} noWrap>
                                  {stop.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {stop.municipality}
                                </Typography>
                              </Box>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeFavoriteStop(stop.id); }} sx={{ width: 28, height: 28 }}>
                                <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default ModernSidebar;
