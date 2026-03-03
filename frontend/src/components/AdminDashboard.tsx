import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  useTheme,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSpacetime } from '../spacetime/useSpacetime';
type IngestionRunRow = {
  startedAt: { microsSinceUnixEpoch: bigint };
};

interface AdminStats {
  vehicles: number;
  alerts: number;
  lines: number;
  stops: number;
  ingestionRuns: number;
  lastIngestion?: string;
}

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const theme = useTheme();
  const { conn, connected } = useSpacetime();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (!conn || !connected) return;
    const vehicles = conn.db.vehicle_positions_current.count();
    const alerts = conn.db.alerts.count();
    const lines = conn.db.lines.count();
    const stops = conn.db.stops.count();
    const ingestionRuns = conn.db.ingestion_runs.count();

    const runs = Array.from(conn.db.ingestion_runs.iter() as Iterable<IngestionRunRow>);
    const last = runs
      .sort((a, b) => Number(b.startedAt.microsSinceUnixEpoch) - Number(a.startedAt.microsSinceUnixEpoch))[0];

    setStats({
      vehicles: Number(vehicles),
      alerts: Number(alerts),
      lines: Number(lines),
      stops: Number(stops),
      ingestionRuns: Number(ingestionRuns),
      lastIngestion: last ? new Date(Number(last.startedAt.microsSinceUnixEpoch) / 1000).toISOString() : undefined,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!conn || !connected) return;
    refresh();

    const update = () => refresh();
    conn.db.vehicle_positions_current.onInsert(update);
    conn.db.vehicle_positions_current.onDelete(update);
    conn.db.alerts.onInsert(update);
    conn.db.alerts.onDelete(update);
    conn.db.lines.onInsert(update);
    conn.db.lines.onDelete(update);
    conn.db.stops.onInsert(update);
    conn.db.stops.onDelete(update);
    conn.db.ingestion_runs.onInsert(update);

    return () => {
      conn.db.vehicle_positions_current.removeOnInsert(update);
      conn.db.vehicle_positions_current.removeOnDelete(update);
      conn.db.alerts.removeOnInsert(update);
      conn.db.alerts.removeOnDelete(update);
      conn.db.lines.removeOnInsert(update);
      conn.db.lines.removeOnDelete(update);
      conn.db.stops.removeOnInsert(update);
      conn.db.stops.removeOnDelete(update);
      conn.db.ingestion_runs.removeOnInsert(update);
    };
  }, [conn, connected]);

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading admin dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SpacetimeDB monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={refresh} disabled={!connected}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6">Ingestion</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Runs" />
                  <Chip label={stats.ingestionRuns} size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Last" secondary={stats.lastIngestion || 'N/A'} />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                <Typography variant="h6">Réseau</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Lignes" />
                  <Chip label={stats.lines} size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Arrêts" />
                  <Chip label={stats.stops} size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                <Typography variant="h6">Temps réel</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Véhicules" />
                  <Chip label={stats.vehicles} size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Alertes" />
                  <Chip label={stats.alerts} size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AdminDashboard;
