import { pool } from '../pool';
import { LineIconMapping } from '../../types';

export class LineIconRepository {
  async findAll(): Promise<LineIconMapping[]> {
    const { rows } = await pool.query(
      'SELECT code_ligne, picto_mode, picto_ligne FROM line_icon_mapping'
    );
    return rows;
  }

  async upsert(icon: LineIconMapping): Promise<void> {
    const query = `
      INSERT INTO line_icon_mapping (code_ligne, picto_mode, picto_ligne)
      VALUES ($1, $2, $3)
      ON CONFLICT (code_ligne) DO UPDATE SET
        picto_mode = EXCLUDED.picto_mode,
        picto_ligne = EXCLUDED.picto_ligne;
    `;

    const values = [icon.code_ligne, icon.picto_mode, icon.picto_ligne];
    await pool.query(query, values);
  }
}

export const lineIconRepository = new LineIconRepository();
