import { grandLyonApi } from '../api/grandLyonApi';
import { lineRepository } from '../../database/repositories';

/**
 * Service d'ingestion des lignes de transport
 * Format: WFS GeoJSON de GeoServer
 */
export const ingestLines = async (
  category: 'bus' | 'metro' | 'tram' | 'rhonexpress'
): Promise<void> => {
  try {
    const features = await grandLyonApi.getLines(category);

    for (const feature of features) {
      const properties = feature.properties;
      const geometry = feature.geometry;
      const id = feature.id;

      const {
        code_ligne,
        nom_trace,
        ligne,
        last_update,
        couleur,
        type_trace,
        sens,
        origine,
        destination,
        nom_origine,
        nom_destination,
        famille_transport,
        date_debut,
        date_fin,
        code_type_ligne,
        nom_type_ligne,
        pmr,
        nom_version,
      } = properties;

      // Convert color from "R G B" format to "rgb(R, G, B)"
      const formattedColor = couleur ? `rgb(${couleur.split(' ').join(', ')})` : null;

      await lineRepository.upsert({
        id,
        line_name: nom_trace,
        trace_code: JSON.stringify(geometry),
        line_code: code_ligne,
        trace_type: type_trace,
        trace_name: nom_trace,
        direction: sens,
        origin_id: origine,
        destination_id: destination,
        origin_name: nom_origine,
        destination_name: nom_destination,
        transport_family: famille_transport,
        start_date: date_debut,
        end_date: date_fin,
        line_type_code: code_type_ligne,
        line_type_name: nom_type_ligne,
        pmr_accessible: pmr,
        line_sort_code: ligne,
        version_name: nom_version,
        last_update,
        category,
        color: formattedColor,
      });
    }

    console.log(`✓ Successfully ingested ${features.length} ${category} lines`);
  } catch (error) {
    console.error(`✗ Error ingesting ${category} lines:`, error);
    throw error;
  }
};

export const ingestAllLines = async (): Promise<void> => {
  const categories: Array<'bus' | 'metro' | 'tram' | 'rhonexpress'> = [
    'bus',
    'metro',
    'tram',
    'rhonexpress',
  ];

  for (const category of categories) {
    await ingestLines(category);
  }
};
