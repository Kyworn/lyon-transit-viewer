import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { pool } from '../database/pool';
import { apiLogger } from '../utils/logger';

const router = Router();

// GET /api/admin/stats - Get system statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    apiLogger.info('Fetching admin stats');

    // Database stats
    const [
      vehicleStats,
      alertStats,
      lineStats,
      stopStats,
      dbSize,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM vehicle_positions'),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN severity_type IN ('severe', 'grave') THEN 1 END) as severe,
          COUNT(CASE WHEN severity_type IN ('moderate', 'modéré') THEN 1 END) as moderate
        FROM alerts
      `),
      pool.query('SELECT category, COUNT(*) as count FROM lines GROUP BY category'),
      pool.query('SELECT COUNT(*) as count FROM stops'),
      pool.query(`
        SELECT pg_size_pretty(pg_database_size('lyon_transit')) as size,
               pg_database_size('lyon_transit') as bytes
      `),
    ]);

    // Table sizes
    const tableSizes = await pool.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);

    // Recent ingestion activity (from logs would be better, but we'll use timestamps)
    const lastUpdates = await pool.query(`
      SELECT
        'vehicles' as type,
        MAX(recorded_at_time) as last_update
      FROM vehicle_positions
      UNION ALL
      SELECT
        'alerts' as type,
        MAX(last_update) as last_update
      FROM alerts
      UNION ALL
      SELECT
        'lines' as type,
        MAX(last_update) as last_update
      FROM lines
      UNION ALL
      SELECT
        'stops' as type,
        MAX(last_update) as last_update
      FROM stops
    `);

    const stats = {
      vehicles: {
        total: parseInt(vehicleStats.rows[0].count),
        active: parseInt(vehicleStats.rows[0].count), // Could add logic to check valid_until_time
      },
      alerts: {
        total: parseInt(alertStats.rows[0].total),
        severe: parseInt(alertStats.rows[0].severe),
        moderate: parseInt(alertStats.rows[0].moderate),
        info: parseInt(alertStats.rows[0].total) - parseInt(alertStats.rows[0].severe) - parseInt(alertStats.rows[0].moderate),
      },
      lines: lineStats.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        acc.total = (acc.total || 0) + parseInt(row.count);
        return acc;
      }, {} as any),
      stops: {
        total: parseInt(stopStats.rows[0].count),
      },
      database: {
        size: dbSize.rows[0].size,
        bytes: parseInt(dbSize.rows[0].bytes),
      },
      tables: tableSizes.rows,
      lastUpdates: lastUpdates.rows,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    res.json(stats);
  })
);

// GET /api/admin/health - Detailed health check
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const checks = [];

    // Database check
    try {
      await pool.query('SELECT 1');
      checks.push({ name: 'database', status: 'healthy', latency: 'ok' });
    } catch (error) {
      checks.push({ name: 'database', status: 'unhealthy', error: String(error) });
    }

    // Memory check
    const mem = process.memoryUsage();
    const memStatus = mem.heapUsed / mem.heapTotal < 0.9 ? 'healthy' : 'warning';
    checks.push({
      name: 'memory',
      status: memStatus,
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
    });

    // Overall status
    const allHealthy = checks.every(c => c.status === 'healthy');
    const hasWarning = checks.some(c => c.status === 'warning');

    res.json({
      status: allHealthy ? 'healthy' : (hasWarning ? 'degraded' : 'unhealthy'),
      checks,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
