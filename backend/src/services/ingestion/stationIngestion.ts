import { grandLyonApi } from '../api/grandLyonApi';
import { pool } from '../../database/pool';

/**
 * Service d'ingestion des stations (métro/tram principalement)
 * Format: WFS GeoJSON de GeoServer
 */
export const ingestStations = async (): Promise<void> => {
  try {
    const features = await grandLyonApi.getStations();

    for (const feature of features) {
      const properties = feature.properties;
      const id = feature.id;
      const { station_api_id, nom, desserte, last_update } = properties;
      const [longitude, latitude] = feature.geometry.coordinates;

      const query = `
        INSERT INTO stations (id, station_api_id, name, service_info, last_update, longitude, latitude, station_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          station_api_id = EXCLUDED.station_api_id,
          name = EXCLUDED.name,
          service_info = EXCLUDED.service_info,
          last_update = EXCLUDED.last_update,
          longitude = EXCLUDED.longitude,
          latitude = EXCLUDED.latitude,
          station_id = EXCLUDED.station_id;
      `;

      const values = [id, station_api_id, nom, desserte, last_update, longitude, latitude, station_api_id];

      await pool.query(query, values);
    }

    console.log(`✓ Successfully ingested ${features.length} stations`);
  } catch (error) {
    console.error('✗ Error ingesting stations:', error);
    throw error;
  }
};
