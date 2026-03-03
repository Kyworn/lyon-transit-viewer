import cron from 'node-cron';
import { ingestAlerts } from './alertIngestion';
import { ingestStations } from './stationIngestion';
import { ingestAllLines } from './lineIngestion';
import { ingestStops } from './stopIngestion';
import { ingestEstimatedTimetables } from './timetableIngestion';
import { ingestVehiclePositions } from './vehicleIngestion';
import { ingestLineIcons } from './lineIconIngestion';
import { ingestionLogger } from '../../utils/logger';
import { ingestGtfs } from './gtfsIngestion';
import { purgeRealtimeHistory } from './purgeRealtimeHistory';
import { runIngestionJob, withAdvisoryLock } from './ingestionUtils';

/**
 * Service principal d'ingestion
 * Orchestre tous les services d'ingestion et les planifie avec node-cron
 */

// Run all static data ingestions
const ingestStaticData = async () => {
  ingestionLogger.info('📥 Starting static data ingestion...');
  await Promise.all([
    withAdvisoryLock('ingest_alerts', () => runIngestionJob('ingest_alerts', ingestAlerts)),
    withAdvisoryLock('ingest_stations', () => runIngestionJob('ingest_stations', ingestStations)),
    withAdvisoryLock('ingest_lines', () => runIngestionJob('ingest_lines', ingestAllLines)),
    withAdvisoryLock('ingest_stops', () => runIngestionJob('ingest_stops', ingestStops)),
    withAdvisoryLock('ingest_line_icons', () => runIngestionJob('ingest_line_icons', ingestLineIcons)),
  ]);
  ingestionLogger.info('✓ Static data ingestion completed');
};

// Run all real-time data ingestions
const ingestRealTimeData = async () => {
  await Promise.all([
    withAdvisoryLock('ingest_estimated_timetables', () =>
      runIngestionJob('ingest_estimated_timetables', ingestEstimatedTimetables)
    ),
    withAdvisoryLock('ingest_vehicle_positions', () =>
      runIngestionJob('ingest_vehicle_positions', ingestVehiclePositions)
    ),
  ]);
};

export const startIngestionService = () => {
  ingestionLogger.info('🚀 Starting ingestion service...');

  // Initial run on startup
  ingestStaticData();
  ingestRealTimeData();
  withAdvisoryLock('ingest_gtfs', () => runIngestionJob('ingest_gtfs', ingestGtfs));

  // Schedule static data updates every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('\n⏰ [Cron] Running scheduled static data ingestion...');
    ingestStaticData();
  });

  // Schedule real-time data updates every 5 seconds
  cron.schedule('*/5 * * * * *', () => {
    ingestRealTimeData();
  });

  // Schedule GTFS import daily at 03:00
  cron.schedule('0 3 * * *', () => {
    withAdvisoryLock('ingest_gtfs', () => runIngestionJob('ingest_gtfs', ingestGtfs));
  });

  // Purge real-time history every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    withAdvisoryLock('purge_realtime_history', () =>
      runIngestionJob('purge_realtime_history', () => purgeRealtimeHistory(30))
    );
  });

  console.log('✓ Ingestion service started successfully');
  console.log('  - Static data: Every 15 minutes');
  console.log('  - Real-time data: Every 5 seconds\n');
};

// Export individual ingestion functions for testing or manual use
export {
  ingestAlerts,
  ingestStations,
  ingestAllLines,
  ingestStops,
  ingestEstimatedTimetables,
  ingestVehiclePositions,
  ingestLineIcons,
  ingestGtfs,
  purgeRealtimeHistory,
};
