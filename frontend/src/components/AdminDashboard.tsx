import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  useTheme,
  alpha,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';

interface AdminStats {
  vehicles: { total: number; active: number };
  alerts: { total: number; severe: number; moderate: number; info: number };
  lines: { total: number; [key: string]: number };
  stops: { total: number };
  database: { size: string; bytes: number };
  tables: Array<{ tablename: string; size: string; bytes: number }>;
  lastUpdates: Array<{ type: string; last_update: string }>;
  system: {
    uptime: number;
    memory: { heapUsed: number; heapTotal: number; external: number; rss: number };
    nodeVersion: string;
  };
}

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const theme = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading admin dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Monitoring système et statistiques
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={fetchStats} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {/* System Stats */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6">Système</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Uptime" secondary={formatUptime(stats.system.uptime)} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Node Version" secondary={stats.system.nodeVersion} />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Memory"
                    secondary={`${formatBytes(stats.system.memory.heapUsed)} / ${formatBytes(stats.system.memory.heapTotal)}`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={(stats.system.memory.heapUsed / stats.system.memory.heapTotal) * 100}
                    sx={{ width: 100, ml: 2 }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Database Stats */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                <Typography variant="h6">Base de données</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Taille totale" secondary={stats.database.size} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Lignes" secondary={`${stats.lines.total} lignes`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Arrêts" secondary={`${stats.stops.total} arrêts`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Véhicules actifs" secondary={`${stats.vehicles.active} véhicules`} />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Alerts Stats */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                <Typography variant="h6">Alertes</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText primary="Total" />
                  <Chip label={stats.alerts.total} size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Sévères" />
                  <Chip label={stats.alerts.severe} size="small" color="error" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Modérées" />
                  <Chip label={stats.alerts.moderate} size="small" color="warning" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Info" />
                  <Chip label={stats.alerts.info} size="small" color="info" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Top Tables by Size */}
          <Card sx={{ gridColumn: { lg: 'span 3' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TableChartIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                <Typography variant="h6">Tables par taille</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
                {stats.tables.slice(0, 5).map((table) => (
                  <Card key={table.tablename} variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {table.tablename}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {table.size}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Last Updates */}
          <Card sx={{ gridColumn: { lg: 'span 3' } }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Dernières mises à jour
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                {stats.lastUpdates.map((update) => (
                  <Box key={update.type}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      {update.type}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {update.last_update ? new Date(update.last_update).toLocaleString('fr-FR') : 'N/A'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AdminDashboard;
