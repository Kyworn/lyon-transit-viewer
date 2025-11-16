import { grandLyonApi } from '../api/grandLyonApi';
import { stopRepository } from '../../database/repositories';

/**
 * Service d'ingestion des arrêts
 * Format: WFS GeoJSON de GeoServer
 */
export const ingestStops = async (): Promise<void> => {
  try {
    const features = await grandLyonApi.getStops();

    for (const feature of features) {
      const properties = feature.properties;
      const id = feature.id;
      const { nom, desserte, pmr, ascenseur, escalier, last_update, adresse, commune, zone } = properties;
      const [longitude, latitude] = feature.geometry.coordinates;

      // Extract GTFS stop ID from feature ID (format: tclarret.123456)
      const gtfsStopId = id.split('.').pop() ?? '';

      await stopRepository.upsert({
        id,
        name: nom,
        service_info: desserte,
        pmr_accessible: pmr,
        has_elevator: ascenseur,
        has_escalator: escalier,
        address: adresse,
        municipality: commune,
        zone,
        longitude,
        latitude,
        gtfs_stop_id: gtfsStopId,
      });
    }

    console.log(`✓ Successfully ingested ${features.length} stops`);
  } catch (error) {
    console.error('✗ Error ingesting stops:', error);
    throw error;
  }
};
