import { pool } from '../pool';
import { Line } from '../../types';
import CacheService from '../../services/cache';

const CACHE_KEY_ALL_LINES = 'lines:all';
const CACHE_TTL = 15 * 60; // 15 minutes

export class LineRepository {
  async findAll(): Promise<Line[]> {
    // Temporarily disable cache
    const { rows } = await pool.query(
      `SELECT id, line_name, trace_code, line_sort_code as line_code, category, color,
              line_sort_code, destination_name, direction, line_type_name
       FROM lines`
    );
    return rows;
  }

  async findByCategory(category: string): Promise<Line[]> {
    const { rows } = await pool.query(
      `SELECT * FROM lines WHERE category = $1`,
      [category]
    );
    return rows;
  }

  async upsert(line: Partial<Line>): Promise<void> {
    const query = `
      INSERT INTO lines (id, line_name, trace_code, line_code, trace_type, trace_name,
                        direction, origin_id, destination_id, origin_name, destination_name,
                        transport_family, start_date, end_date, line_type_code, line_type_name,
                        pmr_accessible, line_sort_code, version_name, last_update, category, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        line_name = EXCLUDED.line_name,
        trace_code = EXCLUDED.trace_code,
        line_code = EXCLUDED.line_code,
        trace_type = EXCLUDED.trace_type,
        trace_name = EXCLUDED.trace_name,
        direction = EXCLUDED.direction,
        origin_id = EXCLUDED.origin_id,
        destination_id = EXCLUDED.destination_id,
        origin_name = EXCLUDED.origin_name,
        destination_name = EXCLUDED.destination_name,
        transport_family = EXCLUDED.transport_family,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        line_type_code = EXCLUDED.line_type_code,
        line_type_name = EXCLUDED.line_type_name,
        pmr_accessible = EXCLUDED.pmr_accessible,
        line_sort_code = EXCLUDED.line_sort_code,
        version_name = EXCLUDED.version_name,
        last_update = EXCLUDED.last_update,
        category = EXCLUDED.category,
        color = EXCLUDED.color;
    `;

    const values = [
      line.id,
      line.line_name,
      line.trace_code,
      line.line_code,
      line.trace_type,
      line.trace_name,
      line.direction,
      line.origin_id,
      line.destination_id,
      line.origin_name,
      line.destination_name,
      line.transport_family,
      line.start_date,
      line.end_date,
      line.line_type_code,
      line.line_type_name,
      line.pmr_accessible,
      line.line_sort_code,
      line.version_name,
      line.last_update,
      line.category,
      line.color,
    ];

    await pool.query(query, values);

    // Invalidate cache when data changes
    await CacheService.del(CACHE_KEY_ALL_LINES);
  }
}

export const lineRepository = new LineRepository();
