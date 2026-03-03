import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLines } from '../hooks/useLines';
import { useStops } from '../hooks/useStops';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useSelectionStore } from '../stores/selectionStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { Line } from '../types';
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
  Collapse,
  Button,
  useMediaQuery,
  Skeleton,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import TramIcon from '@mui/icons-material/Tram';
import SubwayIcon from '@mui/icons-material/Subway';
import TrainIcon from '@mui/icons-material/Train';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FilterListIcon from '@mui/icons-material/FilterList';

import DirectionsIcon from '@mui/icons-material/Directions';

interface ModernSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpenRoutePlanner: () => void;
}

const INITIAL_LINES_PER_CATEGORY = 72;
const LOAD_MORE_LINES_STEP = 72;

const ModernSidebar: React.FC<ModernSidebarProps> = ({ open, onClose, onOpenRoutePlanner }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchInput, setSearchInput] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | 'all'>('all');
  const [visibleCountByCategory, setVisibleCountByCategory] = useState<Record<string, number>>({});
  const debouncedSearchInput = useDebouncedValue(searchInput, 250);

  const { data: lines, isLoading: isLoadingLines } = useLines();
  const { data: stops } = useStops(open && debouncedSearchInput.trim().length >= 2);
  const { selectedLine, setSelectedLine, setCenterCoordinates } = useSelectionStore();
  const { favoriteLines, favoriteStops, addFavoriteLine, removeFavoriteLine, isFavoriteLine, addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavoritesStore();

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'metro': return <SubwayIcon fontSize="small" />;
      case 'tram': return <TramIcon fontSize="small" />;
      case 'funicular': return <TrainIcon fontSize="small" />;
      case 'fluvial': return <DirectionsBoatIcon fontSize="small" />;
      default: return <DirectionsBusIcon fontSize="small" />;
    }
  };

  const groupedLines = useMemo(() => {
    if (!lines) return {};
    const unique = lines.reduce((acc: { [key: string]: Line }, line: Line) => {
      if (!acc[line.line_sort_code]) acc[line.line_sort_code] = line;
      return acc;
    }, {});

    return Object.values(unique).reduce((acc: { [key: string]: Line[] }, line: Line) => {
      const category = line.category || 'bus';
      if (!acc[category]) acc[category] = [];
      acc[category].push(line);
      return acc;
    }, {});
  }, [lines]);

  // Sort categories: Metro, Tram, Funi, Bus
  const sortedCategories = ['metro', 'tram', 'funicular', 'fluvial', 'bus'].filter(c => groupedLines[c]);

  useEffect(() => {
    const next: Record<string, number> = {};
    sortedCategories.forEach((category) => {
      next[category] = INITIAL_LINES_PER_CATEGORY;
    });
    setVisibleCountByCategory(next);
  }, [sortedCategories.join('|')]);

  const filteredResults = useMemo(() => {
    if (!debouncedSearchInput) return null;
    const searchLower = debouncedSearchInput.toLowerCase();

    return {
      lines: lines?.filter(l =>
        (l.line_code?.toLowerCase() || '').includes(searchLower) ||
        (l.line_sort_code?.toLowerCase() || '').includes(searchLower) ||
        (l.line_name?.toLowerCase() || '').includes(searchLower) ||
        (l.destination_name?.toLowerCase() || '').includes(searchLower)
      ).slice(0, 10) || [],
      stops: stops?.filter(s =>
        (s.name?.toLowerCase() || '').includes(searchLower)
      ).slice(0, 10) || []
    };
  }, [debouncedSearchInput, lines, stops]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          style={{
            pointerEvents: 'auto', // Re-enable clicks for the panel itself
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              mt: isMobile ? 0 : 2,
              ml: isMobile ? 0 : 2,
              mb: isMobile ? 0 : 2,
              width: isMobile ? '100%' : 'min(430px, 42vw)',
              height: isMobile ? '100%' : 'calc(100% - 48px)', // More spacing
              bgcolor: alpha(theme.palette.background.paper, 0.88),
              backdropFilter: 'blur(22px)',
              borderRadius: isMobile ? 0 : 5,
              border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.primary.light, 0.14)}`,
              boxShadow: isMobile ? 'none' : `0 24px 48px ${alpha('#020617', 0.6)}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header & Search */}
            <Box sx={{ p: { xs: 2, md: 3 }, pb: { xs: 1, md: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                  Transit Control
                  <Typography component="span" color="secondary" variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>.</Typography>
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DirectionsIcon />}
                  onClick={onOpenRoutePlanner}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: { xs: '0.8rem', md: '0.875rem' },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #2563EB 100%)`,
                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.32)}`
                  }}
                >
                  Itinéraire
                </Button>
              </Stack>

              <TextField
                fullWidth
                placeholder="Ligne, arrêt, direction..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchInput('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.default, 0.62),
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    '&.Mui-focused': {
                      bgcolor: alpha(theme.palette.background.default, 0.82),
                      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }
                  }
                }}
              />
            </Box>

            {/* Filter Chips (Only visible when not searching) */}
            {!searchInput && (
              <Box sx={{ px: 3, pb: 2, display: 'flex', gap: 1, overflowX: 'auto', '::-webkit-scrollbar': { display: 'none' } }}>
                <Chip
                  label="Tout"
                  onClick={() => setActiveCategoryFilter('all')}
                  color={activeCategoryFilter === 'all' ? 'primary' : 'default'}
                  sx={{ fontWeight: 600 }}
                />
                {sortedCategories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    icon={getCategoryIcon(cat)}
                    onClick={() => setActiveCategoryFilter(cat)}
                    color={activeCategoryFilter === cat ? 'primary' : 'default'}
                    variant={activeCategoryFilter === cat ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      ...(activeCategoryFilter === cat && {
                        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        borderColor: theme.palette.primary.main,
                        background: alpha(theme.palette.primary.main, 0.2),
                      })
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Content Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>

              {/* Search Results or Line Details */}
              {selectedLine ? (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Card
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      border: `1px solid ${theme.palette.divider}`,
                      overflow: 'visible',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={3} alignItems="center">
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.background.paper, border: `2px solid ${theme.palette.background.paper}` }}>
                              {getCategoryIcon(selectedLine.category || 'bus')}
                            </Avatar>
                          }
                        >
                          <Avatar
                            sx={{
                              bgcolor: selectedLine.color || theme.palette.primary.main,
                              width: 80,
                              height: 80,
                              fontSize: '2rem',
                              fontWeight: 800,
                              boxShadow: `0 8px 24px ${alpha(selectedLine.color || theme.palette.primary.main, 0.4)}`,
                            }}
                          >
                            {selectedLine.line_sort_code}
                          </Avatar>
                        </Badge>

                        <Box textAlign="center">
                          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.5}>
                            DIRECTION
                          </Typography>
                          <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'Space Grotesk', lineHeight: 1.2 }}>
                            {selectedLine.destination_name}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={2} width="100%">
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<SwapHorizIcon />}
                            onClick={() => {
                              // Find reverse line
                              const reverseLine = lines?.find(l =>
                                l.line_sort_code === selectedLine.line_sort_code &&
                                l.destination_name !== selectedLine.destination_name
                              );
                              if (reverseLine) setSelectedLine(reverseLine);
                            }}
                            sx={{
                              borderRadius: 3,
                              py: 1.5,
                              borderColor: alpha(theme.palette.text.primary, 0.2),
                              color: theme.palette.text.primary,
                              '&:hover': {
                                borderColor: theme.palette.text.primary,
                                bgcolor: alpha(theme.palette.text.primary, 0.05)
                              }
                            }}
                          >
                            Inverser
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            startIcon={<ClearIcon />}
                            onClick={() => setSelectedLine(null)}
                            sx={{ borderRadius: 3, py: 1.5, boxShadow: 'none' }}
                          >
                            Fermer
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Typography variant="caption" textAlign="center" color="text.secondary">
                    Sélectionnez un arrêt sur la carte pour voir les horaires.
                  </Typography>
                </Box>
              ) : searchInput ? (
                <Stack spacing={2}>
                  {/* Lines Found */}
                  {filteredResults?.lines.length ? (
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>Lignes</Typography>
                      <Stack spacing={1}>
                        {filteredResults.lines.map(line => (
                          <Card
                            key={line.id}
                            onClick={() => setSelectedLine(line)}
                            sx={{
                              bgcolor: alpha(theme.palette.background.paper, 0.4),
                              border: `1px solid ${theme.palette.divider}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { transform: 'translateX(4px)', borderColor: theme.palette.primary.main }
                            }}
                          >
                            <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: line.color || theme.palette.grey[700],
                                  color: '#fff',
                                  fontWeight: 800,
                                  width: 32, height: 32, fontSize: '0.8rem'
                                }}
                              >
                                {line.line_code}
                              </Avatar>
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography variant="body2" fontWeight={600} noWrap>{line.line_name}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>Vers {line.destination_name}</Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {/* Stops Found */}
                  {filteredResults?.stops.length ? (
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>Arrêts</Typography>
                      <Stack spacing={1}>
                        {filteredResults.stops.map(stop => (
                          <Card
                            key={stop.id}
                            onClick={() => setCenterCoordinates({ lng: stop.longitude, lat: stop.latitude })}
                            sx={{
                              bgcolor: alpha(theme.palette.background.paper, 0.4),
                              border: `1px solid ${theme.palette.divider}`,
                              cursor: 'pointer',
                              '&:hover': { borderColor: theme.palette.info.main }
                            }}
                          >
                            <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <LocationOnIcon color="info" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{stop.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{stop.municipality}</Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              ) : (
                /* Browse Mode */
                <Stack spacing={3}>
                  {isLoadingLines ? (
                    <Box p={2}>
                      <Stack spacing={2}>
                        {[1, 2, 3].map((i) => (
                          <Box key={i}>
                            <Skeleton variant="text" width={100} height={32} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 1 }}>
                              {[1, 2, 3, 4, 5].map((j) => (
                                <Skeleton key={j} variant="rounded" height={60} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }} />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    sortedCategories.map(category => {
                      if (activeCategoryFilter !== 'all' && activeCategoryFilter !== category) return null;

                      const linesInCategory = groupedLines[category] || [];
                      if (linesInCategory.length === 0) return null;

                      return (
                        <Box key={category}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            {getCategoryIcon(category)}
                            <Typography variant="h6" sx={{ fontFamily: 'Space Grotesk', textTransform: 'capitalize' }}>
                              {category}
                            </Typography>
                            <Chip label={linesInCategory.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          </Stack>

                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                            gap: 1
                          }}>
                            {linesInCategory.slice(0, visibleCountByCategory[category] ?? INITIAL_LINES_PER_CATEGORY).map(line => {
                              const isSelected = selectedLine?.line_sort_code === line.line_sort_code;
                              // const uniqueKey = `${line.line_sort_code}-${line.direction}`; // Not needed with groupedLines unique logic

                              return (
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} key={line.id}>
                                  <Box
                                    onClick={() => setSelectedLine(line)}
                                    sx={{
                                      aspectRatio: '1/1',
                                      borderRadius: 3,
                                      bgcolor: isSelected ? line.color : alpha(theme.palette.background.default, 0.5),
                                      border: `2px solid ${isSelected ? '#fff' : (line.color || theme.palette.grey[700])}`,
                                      color: isSelected ? '#fff' : theme.palette.text.primary,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontWeight: 800,
                                      fontSize: '1rem',
                                      boxShadow: isSelected ? `0 8px 16px ${alpha(line.color || '#000', 0.4)}` : 'none',
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {line.line_sort_code}
                                  </Box>
                                </motion.div>
                              );
                            })}
                          </Box>
                          {(visibleCountByCategory[category] ?? INITIAL_LINES_PER_CATEGORY) < linesInCategory.length && (
                            <Button
                              fullWidth
                              size="small"
                              variant="text"
                              onClick={() => setVisibleCountByCategory((prev) => ({
                                ...prev,
                                [category]: Math.min(
                                  (prev[category] ?? INITIAL_LINES_PER_CATEGORY) + LOAD_MORE_LINES_STEP,
                                  linesInCategory.length
                                ),
                              }))}
                              sx={{ mt: 1.5 }}
                            >
                              Afficher plus ({linesInCategory.length - (visibleCountByCategory[category] ?? INITIAL_LINES_PER_CATEGORY)})
                            </Button>
                          )}
                        </Box>
                      );
                    })
                  )}
                </Stack>
              )}
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModernSidebar;
