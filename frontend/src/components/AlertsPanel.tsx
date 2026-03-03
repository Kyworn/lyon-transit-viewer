import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  Box,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  MenuItem,
  Modal,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useAlerts } from '../hooks/useAlerts';
import { Alert } from '../types';

interface AlertsPanelProps {
  open: boolean;
  onClose: () => void;
}

type GroupedAlerts = Record<string, Record<string, Alert[]>>;

const getSeverityKey = (severity?: string) => {
  if (severity === 'SIGNIFICANT_DELAYS') return 'Critique';
  if (severity === 'DELAYS') return 'Retards';
  return 'Info';
};

const getSeverityColor = (severityKey: string, theme: any) => {
  if (severityKey === 'Critique') return theme.palette.error.main;
  if (severityKey === 'Retards') return theme.palette.warning.main;
  return theme.palette.info.main;
};

const getTransportType = (lineCode?: string) => {
  if (!lineCode) return 'Autres';
  if (lineCode.startsWith('M')) return 'Métro';
  if (lineCode.startsWith('T')) return 'Tram';
  if (lineCode.startsWith('F')) return 'Funiculaire';
  if (lineCode === 'RX') return 'Rhônexpress';
  return 'Bus';
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { data: alerts, isLoading } = useAlerts();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<Alert | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>('all');

  const grouped = useMemo<GroupedAlerts>(() => {
    const out: GroupedAlerts = {};
    (alerts || []).forEach((alert) => {
      const severity = getSeverityKey(alert.severity_type);
      const line = (alert.affected_lines?.[0] || alert.line_commercial_name || '').trim();
      const transport = getTransportType(line);
      out[severity] ||= {};
      out[severity][transport] ||= [];
      out[severity][transport].push(alert);
    });
    return out;
  }, [alerts]);

  const filtered = useMemo<GroupedAlerts>(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const out: GroupedAlerts = {};
    Object.entries(grouped).forEach(([severity, byTransport]) => {
      Object.entries(byTransport).forEach(([transport, list]) => {
        const keep = list.filter((a) => {
          const affectedLinesText = (a.affected_lines || []).join(' ').toLowerCase();
          const commercialLine = (a.line_commercial_name || '').toLowerCase();
          return (
            a.title?.toLowerCase().includes(q) ||
            a.message?.toLowerCase().includes(q) ||
            transport.toLowerCase().includes(q) ||
            affectedLinesText.includes(q) ||
            commercialLine.includes(q)
          );
        });
        if (keep.length > 0) {
          out[severity] ||= {};
          out[severity][transport] = keep;
        }
      });
    });
    return out;
  }, [grouped, search]);

  const lineOptions = useMemo(() => {
    const lines = new Set<string>();
    (alerts || []).forEach((a) => {
      (a.affected_lines || []).forEach((line) => {
        const code = (line || '').trim().toUpperCase();
        if (code) lines.add(code);
      });
    });
    return Array.from(lines).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [alerts]);

  const lineFiltered = useMemo<GroupedAlerts>(() => {
    if (selectedLine === 'all') return filtered;
    const out: GroupedAlerts = {};
    Object.entries(filtered).forEach(([severity, byTransport]) => {
      Object.entries(byTransport).forEach(([transport, list]) => {
        const keep = list.filter((a) =>
          (a.affected_lines || []).some((line) => line.toUpperCase() === selectedLine)
        );
        if (keep.length > 0) {
          out[severity] ||= {};
          out[severity][transport] = keep;
        }
      });
    });
    return out;
  }, [filtered, selectedLine]);

  const total = useMemo(() => {
    return Object.values(lineFiltered).reduce((acc, transportMap) => {
      return acc + Object.values(transportMap).reduce((sum, list) => sum + list.length, 0);
    }, 0);
  }, [lineFiltered]);

  const isOpen = (id: string) => expanded.includes(id);
  const toggle = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 440 },
            borderLeft: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.94),
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${alpha(theme.palette.primary.light, 0.15)}`,
              background: `linear-gradient(120deg, ${alpha(theme.palette.warning.main, 0.18)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Stack direction="row" spacing={1.1} alignItems="center">
                <NotificationsActiveRoundedIcon color="warning" />
                <Box>
                  <Typography variant="h6" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}>
                    Alertes trafic
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Temps réel SYTRAL
                  </Typography>
                </Box>
              </Stack>
              <IconButton onClick={onClose}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} mb={1.2}>
              <Chip size="small" color="warning" label={`${total} alerte${total > 1 ? 's' : ''}`} />
            </Stack>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher une alerte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" fullWidth sx={{ mt: 1 }}>
              <InputLabel id="alerts-line-filter-label">Ligne</InputLabel>
              <Select
                labelId="alerts-line-filter-label"
                value={selectedLine}
                label="Ligne"
                onChange={(e) => setSelectedLine(e.target.value)}
              >
                <MenuItem value="all">Toutes les lignes</MenuItem>
                {lineOptions.map((line) => (
                  <MenuItem key={line} value={line}>{line}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25 }}>
            {isLoading && <Typography color="text.secondary" sx={{ p: 2 }}>Chargement...</Typography>}
            {!isLoading && total === 0 && (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                Aucune alerte.
              </Typography>
            )}
            {Object.entries(lineFiltered).map(([severity, byTransport]) => {
              const severityId = `sev-${severity}`;
              const severityColor = getSeverityColor(severity, theme);
              const severityCount = Object.values(byTransport).reduce((sum, list) => sum + list.length, 0);

              return (
                <Accordion
                  key={severity}
                  expanded={isOpen(severityId)}
                  onChange={() => toggle(severityId)}
                  sx={{
                    mb: 1,
                    border: `1px solid ${alpha(severityColor, 0.35)}`,
                    bgcolor: alpha(severityColor, 0.08),
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                      {severity === 'Critique' ? (
                        <ErrorOutlineRoundedIcon sx={{ color: severityColor, fontSize: 18 }} />
                      ) : severity === 'Retards' ? (
                        <WarningAmberRoundedIcon sx={{ color: severityColor, fontSize: 18 }} />
                      ) : (
                        <InfoRoundedIcon sx={{ color: severityColor, fontSize: 18 }} />
                      )}
                      <Typography variant="body2" fontWeight={700}>{severity}</Typography>
                      <Chip size="small" label={severityCount} sx={{ ml: 'auto' }} />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0.5 }}>
                    {Object.entries(byTransport).map(([transport, list]) => {
                      const transportId = `${severityId}-${transport}`;
                      return (
                        <Accordion
                          key={transport}
                          expanded={isOpen(transportId)}
                          onChange={() => toggle(transportId)}
                          sx={{
                            mb: 1,
                            border: `1px solid ${alpha(severityColor, 0.25)}`,
                            bgcolor: alpha(theme.palette.background.default, 0.22),
                            '&:before': { display: 'none' },
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <DirectionsBusRoundedIcon sx={{ fontSize: 16 }} />
                              <Typography variant="body2" fontWeight={600}>{transport}</Typography>
                              <Chip size="small" label={list.length} sx={{ ml: 'auto' }} />
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0 }}>
                            <Stack spacing={0.8}>
                              {list.map((alert, index) => (
                                <Box
                                  key={`${alert.title}-${index}`}
                                  onClick={() => setSelected(alert)}
                                  sx={{
                                    p: 1.1,
                                    borderRadius: 1.8,
                                    cursor: 'pointer',
                                    border: `1px solid ${alpha(severityColor, 0.25)}`,
                                    bgcolor: alpha(theme.palette.background.paper, 0.45),
                                    '&:hover': {
                                      borderColor: alpha(severityColor, 0.55),
                                      bgcolor: alpha(severityColor, 0.1),
                                    },
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={700} noWrap>
                                    {alert.title}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {alert.message}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Box>
      </Drawer>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '94%', md: 680 },
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.light, 0.25)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.98),
            p: 2,
            outline: 'none',
          }}
        >
          {selected && (
            <Stack spacing={1.8}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}>
                  {selected.title}
                </Typography>
                <IconButton onClick={() => setSelected(null)} size="small">
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {selected.message}
              </Typography>
              {selected.affected_lines && selected.affected_lines.length > 0 && (
                <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                  {selected.affected_lines.map((line, idx) => (
                    <Chip key={`${line}-${idx}`} label={line} size="small" />
                  ))}
                </Stack>
              )}
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {selected.start_time && (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <AccessTimeRoundedIcon fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Début: {new Date(selected.start_time).toLocaleString('fr-FR')}
                    </Typography>
                  </Stack>
                )}
                {selected.end_time && (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <AccessTimeRoundedIcon fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Fin: {new Date(selected.end_time).toLocaleString('fr-FR')}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default AlertsPanel;
