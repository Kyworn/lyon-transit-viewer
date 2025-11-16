import cron from 'node-cron';
import { ingestAlerts } from './alertIngestion';
import { ingestStations } from './stationIngestion';
import { ingestAllLines } from './lineIngestion';
import { ingestStops } from './stopIngestion';
import { ingestEstimatedTimetables } from './timetableIngestion';
import { ingestVehiclePositions } from './vehicleIngestion';
import { ingestLineIcons } from './lineIconIngestion';
import { ingestionLogger } from '../../utils/logger';

/**
 * Service principal d'ingestion
 * Orchestre tous les services d'ingestion et les planifie avec node-cron
 */

// Run all static data ingestions
const ingestStaticData = async () => {
  ingestionLogger.info('📥 Starting static data ingestion...');
  await Promise.all([
    ingestAlerts(),
    ingestStations(),
    ingestAllLines(),
    ingestStops(),
    ingestLineIcons(),
  ]);
  ingestionLogger.info('✓ Static data ingestion completed');
};

// Run all real-time data ingestions
const ingestRealTimeData = async () => {
  await Promise.all([
    ingestEstimatedTimetables(),
    ingestVehiclePositions(),
  ]);
};

export const startIngestionService = () => {
  ingestionLogger.info('🚀 Starting ingestion service...');

  // Initial run on startup
  ingestStaticData();
  ingestRealTimeData();

  // Schedule static data updates every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('\n⏰ [Cron] Running scheduled static data ingestion...');
    ingestStaticData();
  });

  // Schedule real-time data updates every 5 seconds
  cron.schedule('*/5 * * * * *', () => {
    ingestRealTimeData();
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
};
