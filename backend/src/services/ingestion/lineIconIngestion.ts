import fs from 'fs';
import { lineIconRepository } from '../../database/repositories';

/**
 * Service d'ingestion des mappings d'icônes de lignes
 * Format: Fichier CSV local
 */
export const ingestLineIcons = async (): Promise<void> => {
  try {
    const csvFilePath = './Liste_pictogrammes_lignes.csv';
    const csvContent = await fs.promises.readFile(csvFilePath, 'utf8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

    let count = 0;

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const [code_ligne, picto_mode, picto_ligne_raw] = lines[i].split(';');

      // Replace .svg extension with .png
      const picto_ligne = picto_ligne_raw.replace(/\.svg$/, '.png');

      await lineIconRepository.upsert({
        code_ligne,
        picto_mode,
        picto_ligne,
      });

      count++;
    }

    console.log(`✓ Successfully ingested ${count} line icon mappings`);
  } catch (error) {
    console.error('✗ Error ingesting line icon mappings:', error);
    throw error;
  }
};
