import { pool } from '../pool';
import { Stop, NextPassage } from '../../types';

export class StopRepository {
  async findAll(limit?: number, offset?: number): Promise<Stop[]> {
    let query = `SELECT id, name, longitude, latitude, pmr_accessible, service_info,
              has_elevator, has_escalator, address, municipality, zone
       FROM stops
       ORDER BY name`;

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
    return rows;
  }

  async count(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM stops');
    return parseInt(rows[0].count);
  }

  async findById(id: string): Promise<Stop | null> {
    const { rows } = await pool.query(
      `SELECT id, name, service_info, longitude, latitude
       FROM stops WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async upsert(stop: Partial<Stop>): Promise<void> {
    const query = `
      INSERT INTO stops (id, name, service_info, pmr_accessible, has_elevator, has_escalator,
                        last_update, address, municipality, zone, longitude, latitude, gtfs_stop_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        service_info = EXCLUDED.service_info,
        pmr_accessible = EXCLUDED.pmr_accessible,
        has_elevator = EXCLUDED.has_elevator,
        has_escalator = EXCLUDED.has_escalator,
        last_update = EXCLUDED.last_update,
        address = EXCLUDED.address,
        municipality = EXCLUDED.municipality,
        zone = EXCLUDED.zone,
        longitude = EXCLUDED.longitude,
        latitude = EXCLUDED.latitude,
        gtfs_stop_id = EXCLUDED.gtfs_stop_id;
    `;

    const values = [
      stop.id,
      stop.name,
      stop.service_info,
      stop.pmr_accessible,
      stop.has_elevator,
      stop.has_escalator,
      new Date().toISOString(),
      stop.address,
      stop.municipality,
      stop.zone,
      stop.longitude,
      stop.latitude,
      stop.gtfs_stop_id,
    ];

    await pool.query(query, values);
  }

  async getNextPassages(stopId: string): Promise<NextPassage[]> {
    // Get current time and date in Europe/Paris timezone
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentTime = parisTime.toTimeString().slice(0, 8); // HH:MM:SS
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][parisTime.getDay()];
    const currentDate = parisTime.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Single optimized query that combines all data fetching
    const { rows: passages } = await pool.query(
      `WITH stop_info AS (
        SELECT id, name, service_info, gtfs_stop_id
        FROM stops
        WHERE id = $1 AND gtfs_stop_id IS NOT NULL
      ),
      active_services AS (
        SELECT service_id
        FROM gtfs_calendar
        WHERE ${dayOfWeek} = 1
          AND start_date <= $2
          AND end_date >= $2
      )
      SELECT DISTINCT ON (st.arrival_time, r.route_short_name, t.trip_headsign)
        s.name as stop_point_name,
        st.arrival_time as scheduled_arrival_time,
        st.departure_time,
        t.trip_headsign as line_destination,
        t.direction_id,
        r.route_short_name as published_line_name,
        r.route_color,
        r.route_text_color
      FROM stop_info s
      CROSS JOIN gtfs_stop_times st
      JOIN gtfs_trips t ON st.trip_id = t.trip_id
      JOIN gtfs_routes r ON t.route_id = r.route_id
      WHERE st.stop_id = s.gtfs_stop_id
        AND t.service_id IN (SELECT service_id FROM active_services)
        AND st.arrival_time >= $3
      ORDER BY st.arrival_time ASC, r.route_short_name, t.trip_headsign
      LIMIT 10;`,
      [stopId, currentDate, currentTime]
    );

    // Get unique line codes from passages
    const lineCodes = Array.from(new Set(passages.map(p => p.published_line_name)));

    // Fetch latest delay for each line (single query)
    const { rows: delays } = lineCodes.length > 0 ? await pool.query(
      `SELECT DISTINCT ON (l.line_sort_code)
        l.line_sort_code as line_code,
        vp.delay
      FROM vehicle_positions vp
      JOIN lines l ON substring(vp.line_ref from '::(.*?):') = l.line_sort_code
      WHERE l.line_sort_code = ANY($1) AND vp.delay IS NOT NULL
      ORDER BY l.line_sort_code, vp.recorded_at_time DESC;`,
      [lineCodes]
    ) : { rows: [] };

    // Map delays by line
    const delayByLine: Record<string, string> = {};
    delays.forEach((d: any) => {
      delayByLine[d.line_code] = d.delay;
    });

    // Format results with delays
    return passages.map(p => ({
      vehicle_ref: null,
      line_ref: null,
      direction_ref: p.direction_id === 0 ? 'outbound' : 'inbound',
      destination_name: p.line_destination,
      delay: delayByLine[p.published_line_name] || 'PT0S',
      stop_point_name: p.stop_point_name,
      expected_arrival_time: null,
      distance_from_stop: null,
      published_line_name: p.published_line_name,
      line_destination: p.line_destination,
      scheduled_arrival_time: p.scheduled_arrival_time,
      route_color: p.route_color,
      route_text_color: p.route_text_color
    }));
  }
}

export const stopRepository = new StopRepository();
