import { Router } from 'express';
import { pool } from '../services/ingestion.service';

const router = Router();

// Endpoint to get all stops
router.get('/stops', async (req, res) => {
  try {
    console.log('Fetching stops...');
    const { rows } = await pool.query('SELECT id, name, longitude, latitude, pmr_accessible, service_info, has_elevator, has_escalator, address, municipality, zone FROM stops');
    console.log('Successfully fetched stops:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to get all lines
router.get('/lines', async (req, res) => {
  try {
    console.log('Fetching lines...');
    const { rows } = await pool.query('SELECT id, line_name, trace_code, line_sort_code as line_code, category, color, line_sort_code, destination_name, direction, line_type_name FROM lines');
    console.log('Successfully fetched lines:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching lines:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to get all vehicle positions
router.get('/vehicles', async (req, res) => {
  const { line_sort_code, direction } = req.query;

  try {
    console.log(`Fetching vehicle positions for line: ${line_sort_code || 'all'}, direction: ${direction || 'all'}...`);
    let query = 'SELECT vehicle_ref, longitude, latitude, bearing, delay, published_line_name, destination_name, line_ref, direction_ref, stop_point_name, expected_arrival_time, distance_from_stop FROM vehicle_positions';
    const params = [];
    const whereClauses = [];

    if (line_sort_code) {
      params.push(`%::${line_sort_code}:%`);
      whereClauses.push(`line_ref LIKE $${params.length}`);
    }

    if (direction) {
      const directionRef = direction === 'Aller' ? 'outbound' : 'inbound';
      params.push(directionRef);
      whereClauses.push(`direction_ref = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const { rows } = await pool.query(query, params);
    console.log('Successfully fetched vehicle positions:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicle positions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to get all alerts
router.get('/alerts', async (req, res) => {
  try {
    console.log('Fetching alerts...');
    const { rows } = await pool.query('SELECT title, message, severity_type, line_commercial_name FROM alerts');
    console.log('Successfully fetched alerts:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to get next passages for a stop using GTFS data
router.get('/stops/:stop_id/next-passages', async (req, res) => {
  const { stop_id } = req.params;
  try {
    console.log(`Fetching next passages for stop ID: ${stop_id}...`);

    // Get the stop info
    const { rows: stopRows } = await pool.query(
      `SELECT id, name, service_info FROM stops WHERE id = $1;`,
      [stop_id]
    );

    if (stopRows.length === 0) {
      console.log(`Stop not found: ${stop_id}`);
      return res.json([]);
    }

    const stop = stopRows[0];
    if (!stop.service_info) {
      console.log(`No service_info for stop: ${stop_id}`);
      return res.json([]);
    }

    // Get current time and date
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentDate = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Find active service_ids for today
    const { rows: services } = await pool.query(
      `SELECT service_id FROM gtfs_calendar
       WHERE ${dayOfWeek} = 1
       AND start_date <= $1
       AND end_date >= $1;`,
      [currentDate]
    );

    if (services.length === 0) {
      console.log(`No active services for date: ${currentDate}`);
      return res.json([]);
    }

    const serviceIds = services.map(s => s.service_id);

    // Extract line codes from service_info
    const lineCodes = Array.from(new Set(
      stop.service_info.split(',').map(s => s.split(':')[0])
    ));

    // Get next passages from GTFS
    const { rows: passages } = await pool.query(
      `SELECT
          st.arrival_time,
          st.departure_time,
          t.trip_headsign,
          t.direction_id,
          r.route_short_name,
          r.route_color,
          r.route_text_color
       FROM gtfs_stop_times st
       JOIN gtfs_trips t ON st.trip_id = t.trip_id
       JOIN gtfs_routes r ON t.route_id = r.route_id
       WHERE st.stop_id = $1
         AND t.service_id = ANY($2)
         AND r.route_short_name = ANY($3)
         AND st.arrival_time >= $4
       ORDER BY st.arrival_time ASC
       LIMIT 10;`,
      [stop_id, serviceIds, lineCodes, currentTime]
    );

    // Try to match with real-time vehicles to add delays
    const { rows: vehicles } = await pool.query(
      `SELECT
          vp.delay,
          l.line_sort_code as published_line_name
       FROM vehicle_positions vp
       LEFT JOIN lines l ON substring(vp.line_ref from '::(.*?):') = l.line_sort_code
       WHERE l.line_sort_code = ANY($1);`,
      [lineCodes]
    );

    // Map delays by line
    const delayByLine = {};
    vehicles.forEach(v => {
      if (!delayByLine[v.published_line_name]) {
        delayByLine[v.published_line_name] = v.delay;
      }
    });

    // Format results with real-time delays if available
    const results = passages.map(p => ({
      vehicle_ref: null,
      line_ref: null,
      direction_ref: p.direction_id === 0 ? 'outbound' : 'inbound',
      destination_name: p.trip_headsign,
      delay: delayByLine[p.route_short_name] || 'PT0S',
      stop_point_name: stop.name,
      expected_arrival_time: null,
      distance_from_stop: null,
      published_line_name: p.route_short_name,
      line_destination: p.trip_headsign,
      scheduled_arrival_time: p.arrival_time,
      route_color: p.route_color,
      route_text_color: p.route_text_color
    }));

    console.log(`Found ${results.length} passages for stop ${stop_id}`);
    res.json(results);
  } catch (error) {
    console.error(`Error fetching next passages for stop ID: ${stop_id}:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to get line icon mappings
router.get('/line-icons', async (req, res) => {
  try {
    console.log('Fetching line icon mappings...');
    const { rows } = await pool.query('SELECT code_ligne, picto_mode, picto_ligne FROM line_icon_mapping');
    console.log('Successfully fetched line icon mappings:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching line icon mappings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;