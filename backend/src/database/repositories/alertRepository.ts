import { pool } from '../pool';
import { Alert } from '../../types';

export class AlertRepository {
  async findAll(limit?: number, offset?: number): Promise<Alert[]> {
    // Group alerts by title/message and aggregate affected lines
    // This way, one alert that affects multiple lines shows all affected lines
    let query = `
      SELECT
        title,
        message,
        severity_type,
        MAX(severity_level) as severity_level,
        MAX(last_update) as last_update,
        ARRAY_AGG(DISTINCT line_commercial_name ORDER BY line_commercial_name)
          FILTER (WHERE line_commercial_name IS NOT NULL) as affected_lines
      FROM alerts
      WHERE title IS NOT NULL AND message IS NOT NULL
      GROUP BY title, message, severity_type
      ORDER BY severity_level ASC NULLS LAST, last_update DESC
    `;

    const params: any[] = [];
    if (limit !== undefined) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    if (offset !== undefined) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await pool.query(query, params);

    // Transform the result to include line_commercial_name as the first line
    // and add affected_lines for display
    return rows.map(row => ({
      title: row.title,
      message: row.message,
      severity_type: row.severity_type,
      severity_level: row.severity_level,
      line_commercial_name: row.affected_lines?.[0] || null,
      affected_lines: row.affected_lines || [],
      lines_count: row.affected_lines?.length || 0
    }));
  }

  async count(): Promise<number> {
    // Count distinct alerts by title and message since alert_id is often NULL
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT DISTINCT title, message
        FROM alerts
        WHERE title IS NOT NULL AND message IS NOT NULL
      ) AS distinct_alerts
    `);
    return parseInt(rows[0].count);
  }

  async findByLine(lineCode: string): Promise<Alert[]> {
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE line_commercial_name = $1',
      [lineCode]
    );
    return rows;
  }

  async upsert(alert: Partial<Alert>): Promise<void> {
    const query = `
      INSERT INTO alerts (
        alert_id, type, cause, start_time, end_time, mode,
        line_commercial_name, line_customer_name, title, message,
        last_update, severity_type, severity_level, object_type, object_list
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (alert_id) DO UPDATE SET
        type = EXCLUDED.type,
        cause = EXCLUDED.cause,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        mode = EXCLUDED.mode,
        line_commercial_name = EXCLUDED.line_commercial_name,
        line_customer_name = EXCLUDED.line_customer_name,
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        last_update = EXCLUDED.last_update,
        severity_type = EXCLUDED.severity_type,
        severity_level = EXCLUDED.severity_level,
        object_type = EXCLUDED.object_type,
        object_list = EXCLUDED.object_list;
    `;

    const values = [
      alert.alert_id,
      alert.type,
      alert.cause,
      alert.start_time,
      alert.end_time,
      alert.mode,
      alert.line_commercial_name,
      alert.line_customer_name,
      alert.title,
      alert.message,
      alert.last_update,
      alert.severity_type,
      alert.severity_level,
      alert.object_type,
      alert.object_list,
    ];

    await pool.query(query, values);
  }
}

export const alertRepository = new AlertRepository();
