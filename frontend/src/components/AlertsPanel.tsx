import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
  IconButton,
  Collapse,
  Drawer,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Modal,
  Backdrop,
  Fade,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RouteIcon from '@mui/icons-material/Route';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import { useAlerts } from '../hooks/useAlerts';
import { Alert } from '../types';

interface AlertsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface GroupedAlerts {
  [line: string]: Alert[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: alerts, isLoading } = useAlerts();

  // Helper: Détecte le type de transport depuis le code de ligne
  const getTransportType = (lineCode: string): string => {
    if (!lineCode) return 'Autre';
    if (lineCode.startsWith('T')) return 'Tram';
    if (lineCode.startsWith('M')) return 'Métro';
    if (lineCode.startsWith('F')) return 'Funiculaire';
    if (lineCode === 'RX') return 'Rhônexpress';
    if (lineCode.startsWith('C') || /^\d/.test(lineCode)) return 'Bus';
    return 'Autre';
  };

  // Helper: Obtient le label de sévérité
  const getSeverityLabel = (severityType?: string): string => {
    switch (severityType) {
      case 'SIGNIFICANT_DELAYS':
        return '🔴 Perturbations importantes';
      case 'DELAYS':
        return '🟠 Retards';
      case 'OTHER_EFFECT':
        return '🔵 Informations';
      default:
        return '⚪ Non classé';
    }
  };

  // Regrouper les alertes par sévérité, puis par type de transport
  const groupedAlerts = useMemo(() => {
    if (!alerts) return {};

    const grouped: { [severity: string]: GroupedAlerts } = {};

    alerts.forEach((alert: Alert) => {
      const severityLabel = getSeverityLabel(alert.severity_type);

      // Détecter le type de transport depuis la première ligne affectée
      const firstLine = alert.affected_lines?.[0] || alert.line_commercial_name || '';
      const transportType = getTransportType(firstLine);

      if (!grouped[severityLabel]) {
        grouped[severityLabel] = {};
      }

      if (!grouped[severityLabel][transportType]) {
        grouped[severityLabel][transportType] = [];
      }

      grouped[severityLabel][transportType].push(alert);
    });

    return grouped;
  }, [alerts]);

  // Filtrer les alertes par recherche
  const filteredGroupedAlerts = useMemo(() => {
    if (!searchTerm) return groupedAlerts;

    const filtered: { [severity: string]: GroupedAlerts } = {};

    Object.entries(groupedAlerts).forEach(([severity, transportGroups]) => {
      const filteredTransportGroups: GroupedAlerts = {};

      Object.entries(transportGroups).forEach(([transport, alerts]) => {
        const matchingAlerts = alerts.filter((alert: Alert) =>
          alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transport.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (matchingAlerts.length > 0) {
          filteredTransportGroups[transport] = matchingAlerts;
        }
      });

      if (Object.keys(filteredTransportGroups).length > 0) {
        filtered[severity] = filteredTransportGroups;
      }
    });

    return filtered;
  }, [groupedAlerts, searchTerm]);

  const totalAlerts = useMemo(() => {
    return Object.values(filteredGroupedAlerts).reduce((sum, transportGroups) =>
      sum + Object.values(transportGroups).reduce((subSum, alerts) => subSum + alerts.length, 0),
    0);
  }, [filteredGroupedAlerts]);

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
      case 'grave':
        return theme.palette.error.main;
      case 'moderate':
      case 'modéré':
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
      case 'grave':
        return <ErrorOutlineIcon sx={{ fontSize: 18 }} />;
      case 'moderate':
      case 'modéré':
        return <WarningAmberIcon sx={{ fontSize: 18 }} />;
      default:
        return <InfoOutlinedIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getMostSevereSeverity = (alerts: Alert[]) => {
    const hasSevere = alerts.some(a => a.severity_type?.toLowerCase() === 'severe' || a.severity_type?.toLowerCase() === 'grave');
    const hasModerate = alerts.some(a => a.severity_type?.toLowerCase() === 'moderate' || a.severity_type?.toLowerCase() === 'modéré');

    if (hasSevere) return 'severe';
    if (hasModerate) return 'moderate';
    return 'info';
  };

  const toggleLineExpanded = (line: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(line)) {
      newExpanded.delete(line);
    } else {
      newExpanded.add(line);
    }
    setExpandedLines(newExpanded);
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedAlert(null), 300); // Delay to allow animation
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450 },
          bgcolor: alpha(theme.palette.background.default, 0.95),
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
        >
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.dark, 0.95)} 0%, ${alpha(theme.palette.warning.main, 0.95)} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.3)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: alpha(theme.palette.common.white, 0.2),
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                }}
              >
                <NotificationsActiveIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                  Alertes Trafic
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                  En temps réel
                </Typography>
              </Box>
            </Box>
            <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={onClose}
                sx={{
                  color: 'white',
                  backgroundColor: alpha(theme.palette.common.white, 0.15),
                  backdropFilter: 'blur(10px)',
                  border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.25),
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </motion.div>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ position: 'relative' }}>
            <motion.div
              initial={{ scale: 0, x: -20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            >
            <Chip
              label={`${totalAlerts} alerte${totalAlerts > 1 ? 's' : ''}`}
              sx={{
                backgroundColor: alpha(theme.palette.common.white, 0.25),
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                px: 1,
                py: 2.5,
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.35),
                  transform: 'translateY(-2px)',
                },
              }}
            />
            </motion.div>
            <motion.div
              initial={{ scale: 0, x: -20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            >
            <Chip
              label={`${Object.keys(filteredGroupedAlerts).length} ligne${Object.keys(filteredGroupedAlerts).length > 1 ? 's' : ''} touchée${Object.keys(filteredGroupedAlerts).length > 1 ? 's' : ''}`}
              sx={{
                backgroundColor: alpha(theme.palette.common.white, 0.25),
                backdropFilter: 'blur(10px)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                px: 1,
                py: 2.5,
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.35),
                  transform: 'translateY(-2px)',
                },
              }}
            />
            </motion.div>
          </Stack>
        </Box>
        </motion.div>

        <Divider />

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
        >
        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            size="medium"
            placeholder="Rechercher une alerte ou ligne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                backdropFilter: 'blur(10px)',
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                '& fieldset': {
                  border: 'none',
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.background.paper, 0.9),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                },
                '&.Mui-focused': {
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
              },
            }}
          />
        </Box>
        </motion.div>

        {/* Grouped Alerts List */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
          {isLoading && (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              Chargement des alertes...
            </Typography>
          )}

          {!isLoading && totalAlerts === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <InfoOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                {searchTerm ? 'Aucune alerte trouvée' : 'Aucune alerte actuellement'}
              </Typography>
            </Box>
          )}

          <AnimatePresence>
          {!isLoading && Object.entries(filteredGroupedAlerts)
            .map(([severityLabel, transportGroups], severityIdx) => {
              // Compter le total d'alertes pour ce niveau de sévérité
              const totalAlertsInSeverity = Object.values(transportGroups).reduce((sum, alerts) => sum + alerts.length, 0);
              const isSeverityExpanded = expandedLines.has(severityLabel);

              // Déterminer la couleur basée sur le type de sévérité
              let severityColor = theme.palette.info.main;
              if (severityLabel.includes('Perturbations importantes')) severityColor = theme.palette.error.main;
              else if (severityLabel.includes('Retards')) severityColor = theme.palette.warning.main;

              return (
                <motion.div
                  key={severityLabel}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ delay: severityIdx * 0.05, duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                >
                  {/* Accordion de Sévérité */}
                  <Accordion
                    expanded={isSeverityExpanded}
                    onChange={() => toggleLineExpanded(severityLabel)}
                    sx={{
                      mb: 2,
                      borderRadius: '18px !important',
                      border: `3px solid ${alpha(severityColor, 0.4)}`,
                      background: `linear-gradient(135deg, ${alpha(severityColor, 0.12)} 0%, ${alpha(severityColor, 0.05)} 100%)`,
                      backdropFilter: 'blur(10px)',
                      '&:before': { display: 'none' },
                      boxShadow: `0 6px 24px ${alpha(severityColor, 0.15)}`,
                      transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                      '&:hover': {
                        borderColor: alpha(severityColor, 0.6),
                        boxShadow: `0 10px 32px ${alpha(severityColor, 0.25)}`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 28 }} />}
                      sx={{
                        borderRadius: '16px',
                        py: 1.5,
                        transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                        '&:hover': {
                          backgroundColor: alpha(severityColor, 0.15),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${alpha(severityColor, 0.3)} 0%, ${alpha(severityColor, 0.2)} 100%)`,
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: severityColor,
                            border: `2px solid ${alpha(severityColor, 0.4)}`,
                            boxShadow: `0 4px 16px ${alpha(severityColor, 0.2)}`,
                            fontSize: 32,
                          }}
                        >
                          {severityLabel.substring(0, 2)}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              color: theme.palette.text.primary,
                              letterSpacing: '-0.5px',
                              fontSize: '1.1rem',
                            }}
                          >
                            {severityLabel}
                          </Typography>
                          <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.8), fontSize: '0.75rem' }}>
                            {totalAlertsInSeverity} alerte{totalAlertsInSeverity > 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        <Chip
                          size="medium"
                          label={totalAlertsInSeverity}
                          sx={{
                            background: `linear-gradient(135deg, ${severityColor} 0%, ${alpha(severityColor, 0.8)} 100%)`,
                            color: 'white',
                            fontWeight: 800,
                            minWidth: 42,
                            height: 32,
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            boxShadow: `0 4px 12px ${alpha(severityColor, 0.4)}`,
                          }}
                        />
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ p: 2, pt: 0 }}>
                      {/* Accordions de Type de Transport */}
                      {Object.entries(transportGroups).map(([transportType, transportAlerts], transportIdx) => {
                        const isTransportExpanded = expandedLines.has(`${severityLabel}-${transportType}`);

                        return (
                          <Accordion
                            key={transportType}
                            expanded={isTransportExpanded}
                            onChange={() => toggleLineExpanded(`${severityLabel}-${transportType}`)}
                            sx={{
                              mb: 1.5,
                              borderRadius: '14px !important',
                              border: `2px solid ${alpha(severityColor, 0.25)}`,
                              background: `linear-gradient(135deg, ${alpha(severityColor, 0.06)} 0%, ${alpha(severityColor, 0.02)} 100%)`,
                              backdropFilter: 'blur(10px)',
                              '&:before': { display: 'none' },
                              boxShadow: `0 3px 12px ${alpha(severityColor, 0.08)}`,
                              transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                              '&:hover': {
                                borderColor: alpha(severityColor, 0.4),
                                boxShadow: `0 6px 20px ${alpha(severityColor, 0.15)}`,
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              sx={{
                                borderRadius: '12px',
                                transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                                '&:hover': {
                                  backgroundColor: alpha(severityColor, 0.1),
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                                <Box
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '11px',
                                    background: `linear-gradient(135deg, ${alpha(severityColor, 0.2)} 0%, ${alpha(severityColor, 0.12)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: severityColor,
                                    border: `2px solid ${alpha(severityColor, 0.25)}`,
                                    boxShadow: `0 3px 10px ${alpha(severityColor, 0.12)}`,
                                  }}
                                >
                                  <RouteIcon sx={{ fontSize: 22 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 700,
                                      color: theme.palette.text.primary,
                                      letterSpacing: '-0.3px',
                                      fontSize: '0.95rem',
                                    }}
                                    noWrap
                                  >
                                    {transportType}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.8), fontSize: '0.7rem' }}>
                                    {transportAlerts.length} alerte{transportAlerts.length > 1 ? 's' : ''}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  label={transportAlerts.length}
                                  sx={{
                                    background: `linear-gradient(135deg, ${severityColor} 0%, ${alpha(severityColor, 0.8)} 100%)`,
                                    color: 'white',
                                    fontWeight: 700,
                                    minWidth: 32,
                                    height: 26,
                                    borderRadius: '9px',
                                    fontSize: '0.8rem',
                                    boxShadow: `0 3px 10px ${alpha(severityColor, 0.25)}`,
                                  }}
                                />
                              </Box>
                            </AccordionSummary>

                            <AccordionDetails sx={{ p: 0 }}>
                              <Divider />
                              <List dense sx={{ py: 1.5, px: 1 }}>
                                <AnimatePresence>
                                {transportAlerts.map((alert, index) => {
                        const alertSeverityColor = getSeverityColor(alert.severity_type);

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: index * 0.05, duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                          >
                          <ListItemButton
                            onClick={() => handleAlertClick(alert)}
                            sx={{
                              borderRadius: '12px',
                              mb: 1,
                              px: 2,
                              py: 1.5,
                              border: `2px solid ${alpha(alertSeverityColor, 0.25)}`,
                              background: `linear-gradient(135deg, ${alpha(alertSeverityColor, 0.08)} 0%, ${alpha(alertSeverityColor, 0.03)} 100%)`,
                              backdropFilter: 'blur(10px)',
                              transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                              boxShadow: `0 2px 8px ${alpha(alertSeverityColor, 0.08)}`,
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: alpha(alertSeverityColor, 0.15),
                                borderColor: alpha(alertSeverityColor, 0.4),
                                transform: 'translateX(4px)',
                                boxShadow: `0 4px 16px ${alpha(alertSeverityColor, 0.15)}`,
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '8px',
                                  background: `linear-gradient(135deg, ${alpha(alertSeverityColor, 0.2)} 0%, ${alpha(alertSeverityColor, 0.1)} 100%)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: alertSeverityColor,
                                }}
                              >
                                {getSeverityIcon(alert.severity_type)}
                              </Box>
                            </ListItemIcon>
                            <ListItemText
                              primary={alert.title}
                              secondary={
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      color: alpha(theme.palette.text.secondary, 0.9),
                                      fontSize: '0.8rem',
                                      mb: alert.affected_lines?.length ? 0.5 : 0,
                                    }}
                                  >
                                    {alert.message}
                                  </Typography>
                                  {alert.affected_lines && alert.affected_lines.length > 0 && (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                      {alert.affected_lines.slice(0, 5).map((line, idx) => (
                                        <Chip
                                          key={idx}
                                          label={line}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            backgroundColor: alpha(alertSeverityColor, 0.15),
                                            color: alertSeverityColor,
                                            border: `1px solid ${alpha(alertSeverityColor, 0.3)}`,
                                          }}
                                        />
                                      ))}
                                      {alert.affected_lines.length > 5 && (
                                        <Chip
                                          label={`+${alert.affected_lines.length - 5}`}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            backgroundColor: alpha(alertSeverityColor, 0.2),
                                            color: alertSeverityColor,
                                          }}
                                        />
                                      )}
                                    </Stack>
                                  )}
                                </Box>
                              }
                              primaryTypographyProps={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                noWrap: true,
                                sx: { mb: 0.5 },
                              }}
                            />
                                          </ListItemButton>
                                          </motion.div>
                                        );
                                      })}
                                      </AnimatePresence>
                                    </List>
                                  </AccordionDetails>
                                </Accordion>
                              );
                            })}
                          </AccordionDetails>
                        </Accordion>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
        </Box>
      </Box>

      {/* Modal de détails de l'alerte */}
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: {
              backdropFilter: 'blur(8px)',
              backgroundColor: alpha(theme.palette.common.black, 0.7),
            },
          },
        }}
      >
        <Fade in={modalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '95%', sm: '85%', md: 700 },
              maxHeight: '90vh',
              overflowY: 'auto',
              bgcolor: 'background.paper',
              borderRadius: '24px',
              boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.3)}`,
              border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              outline: 'none',
            }}
          >
            {selectedAlert && (
              <>
                {/* Header de la modal */}
                <Box
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: `linear-gradient(135deg, ${alpha(getSeverityColor(selectedAlert.severity_type), 0.15)} 0%, ${alpha(getSeverityColor(selectedAlert.severity_type), 0.08)} 100%)`,
                    backdropFilter: 'blur(20px)',
                    p: 3,
                    borderBottom: `2px solid ${alpha(getSeverityColor(selectedAlert.severity_type), 0.2)}`,
                    borderRadius: '24px 24px 0 0',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, pr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${alpha(getSeverityColor(selectedAlert.severity_type), 0.3)} 0%, ${alpha(getSeverityColor(selectedAlert.severity_type), 0.2)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getSeverityColor(selectedAlert.severity_type),
                            boxShadow: `0 4px 12px ${alpha(getSeverityColor(selectedAlert.severity_type), 0.2)}`,
                          }}
                        >
                          {getSeverityIcon(selectedAlert.severity_type)}
                        </Box>
                        <Chip
                          label={getSeverityLabel(selectedAlert.severity_type)}
                          size="small"
                          sx={{
                            background: `linear-gradient(135deg, ${getSeverityColor(selectedAlert.severity_type)} 0%, ${alpha(getSeverityColor(selectedAlert.severity_type), 0.8)} 100%)`,
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            px: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.5 }}>
                        {selectedAlert.title}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={handleModalClose}
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: alpha(theme.palette.common.black, 0.08),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.common.black, 0.15),
                          transform: 'rotate(90deg)',
                        },
                        transition: 'all 0.3s',
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Contenu de la modal */}
                <Box sx={{ p: 3 }}>
                  {/* Message complet */}
                  <Card
                    sx={{
                      mb: 2.5,
                      borderRadius: '16px',
                      border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                      background: alpha(theme.palette.background.default, 0.5),
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          lineHeight: 1.7,
                          color: theme.palette.text.primary,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {selectedAlert.message}
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Lignes affectées */}
                  {selectedAlert.affected_lines && selectedAlert.affected_lines.length > 0 && (
                    <Box sx={{ mb: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <DirectionsBusIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Lignes affectées ({selectedAlert.affected_lines.length})
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedAlert.affected_lines.map((line, idx) => (
                          <Chip
                            key={idx}
                            label={line}
                            sx={{
                              height: 32,
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              backgroundColor: alpha(getSeverityColor(selectedAlert.severity_type), 0.15),
                              color: getSeverityColor(selectedAlert.severity_type),
                              border: `2px solid ${alpha(getSeverityColor(selectedAlert.severity_type), 0.3)}`,
                              '&:hover': {
                                backgroundColor: alpha(getSeverityColor(selectedAlert.severity_type), 0.25),
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Informations temporelles */}
                  <Stack spacing={1.5}>
                    {selectedAlert.start_time && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Début
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {new Date(selectedAlert.start_time).toLocaleString('fr-FR', {
                              dateStyle: 'long',
                              timeStyle: 'short',
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {selectedAlert.end_time && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Fin prévue
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {new Date(selectedAlert.end_time).toLocaleString('fr-FR', {
                              dateStyle: 'long',
                              timeStyle: 'short',
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>
    </Drawer>
  );
};

export default AlertsPanel;
