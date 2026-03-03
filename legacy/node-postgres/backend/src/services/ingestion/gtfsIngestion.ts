import fs from 'fs';
import path from 'path';
import { pool } from '../../database/pool';
import { ingestionLogger } from '../../utils/logger';

const GTFS_DIR = path.resolve(process.cwd(), 'gtfs');

type GtfsTableConfig = {
  file: string;
  table: string;
  columns: string[];
};

const GTFS_TABLES: GtfsTableConfig[] = [
  {
    file: 'agency.txt',
    table: 'gtfs_agency',
    columns: [
      'agency_id',
      'agency_name',
      'agency_url',
      'agency_timezone',
      'agency_lang',
      'agency_phone',
      'agency_fare_url',
      'agency_email',
    ],
  },
  {
    file: 'calendar.txt',
    table: 'gtfs_calendar',
    columns: [
      'service_id',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
      'start_date',
      'end_date',
    ],
  },
  {
    file: 'calendar_dates.txt',
    table: 'gtfs_calendar_dates',
    columns: ['service_id', 'date', 'exception_type'],
  },
  {
    file: 'routes.txt',
    table: 'gtfs_routes',
    columns: [
      'route_id',
      'agency_id',
      'route_short_name',
      'route_long_name',
      'route_desc',
      'route_type',
      'route_url',
      'route_color',
      'route_text_color',
      'route_sort_order',
    ],
  },
  {
    file: 'trips.txt',
    table: 'gtfs_trips',
    columns: [
      'route_id',
      'service_id',
      'trip_id',
      'trip_headsign',
      'trip_short_name',
      'direction_id',
      'block_id',
      'shape_id',
      'wheelchair_accessible',
      'bikes_allowed',
    ],
  },
  {
    file: 'stop_times.txt',
    table: 'gtfs_stop_times',
    columns: [
      'trip_id',
      'arrival_time',
      'departure_time',
      'stop_id',
      'stop_sequence',
      'stop_headsign',
      'pickup_type',
      'drop_off_type',
      'shape_dist_traveled',
      'timepoint',
    ],
  },
  {
    file: 'stops.txt',
    table: 'gtfs_stops',
    columns: [
      'stop_id',
      'stop_code',
      'stop_name',
      'stop_desc',
      'stop_lat',
      'stop_lon',
      'zone_id',
      'stop_url',
      'location_type',
      'parent_station',
      'stop_timezone',
      'wheelchair_boarding',
      'level_id',
      'platform_code',
    ],
  },
  {
    file: 'shapes.txt',
    table: 'gtfs_shapes',
    columns: [
      'shape_id',
      'shape_pt_lat',
      'shape_pt_lon',
      'shape_pt_sequence',
      'shape_dist_traveled',
    ],
  },
  {
    file: 'transfers.txt',
    table: 'gtfs_transfers',
    columns: ['from_stop_id', 'to_stop_id', 'transfer_type', 'min_transfer_time'],
  },
  {
    file: 'feed_info.txt',
    table: 'gtfs_feed_info',
    columns: [
      'feed_publisher_name',
      'feed_publisher_url',
      'feed_lang',
      'feed_start_date',
      'feed_end_date',
      'feed_version',
    ],
  },
];

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const loadCsvFile = async (filePath: string): Promise<{ header: string[]; rows: string[][] }> => {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { header: [], rows: [] };
  }

  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { header, rows };
};

const insertBatch = async (
  table: string,
  columns: string[],
  rows: string[][]
): Promise<number> => {
  if (rows.length === 0 || columns.length === 0) {
    return 0;
  }

  const values: Array<string | null> = [];
  const placeholders: string[] = [];

  rows.forEach((row, rowIndex) => {
    const offset = rowIndex * columns.length;
    const rowPlaceholders = columns.map((_, colIndex) => `$${offset + colIndex + 1}`);
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
    row.forEach((value) => values.push(value === '' ? null : value));
  });

  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
  await pool.query(query, values);
  return rows.length;
};

export const ingestGtfs = async (): Promise<number> => {
  const missingFiles: string[] = [];
  for (const { file } of GTFS_TABLES) {
    const filePath = path.join(GTFS_DIR, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    ingestionLogger.info(`GTFS ingestion skipped. Missing files: ${missingFiles.join(', ')}`);
    return 0;
  }

  let totalInserted = 0;

  for (const { file, table, columns } of GTFS_TABLES) {
    const filePath = path.join(GTFS_DIR, file);
    const { header, rows } = await loadCsvFile(filePath);

    if (header.length === 0) {
      ingestionLogger.info(`GTFS file ${file} is empty, skipping.`);
      continue;
    }

    const headerIndex: Record<string, number> = {};
    header.forEach((col, idx) => {
      headerIndex[col] = idx;
    });

    const insertColumns = columns.filter((col) => headerIndex[col] !== undefined);
    if (insertColumns.length === 0) {
      ingestionLogger.info(`GTFS file ${file} has no usable columns, skipping.`);
      continue;
    }

    await pool.query(`TRUNCATE ${table}_staging`);

    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) =>
        insertColumns.map((col) => row[headerIndex[col]] ?? '')
      );
      totalInserted += await insertBatch(`${table}_staging`, insertColumns, batch);
    }
  }

  await pool.query('BEGIN');
  try {
    for (const { table, columns } of GTFS_TABLES) {
      await pool.query(`TRUNCATE ${table}`);
      await pool.query(
        `INSERT INTO ${table} (${columns.join(', ')}) SELECT ${columns.join(', ')} FROM ${table}_staging;`
      );
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  ingestionLogger.info(`GTFS ingestion completed. Rows inserted: ${totalInserted}`);
  return totalInserted;
};
