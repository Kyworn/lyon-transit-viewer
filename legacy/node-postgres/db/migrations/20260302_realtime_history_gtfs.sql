-- Migration: add ingestion tracking, realtime current/history, GTFS tables

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id SERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    rows_upserted INTEGER DEFAULT 0,
    error TEXT
);

CREATE TABLE IF NOT EXISTS vehicle_positions_current (
    vehicle_ref VARCHAR(255) PRIMARY KEY,
    recorded_at_time TIMESTAMP,
    valid_until_time TIMESTAMP,
    line_ref VARCHAR(255),
    direction_ref VARCHAR(255),
    dated_vehicle_journey_ref VARCHAR(255),
    published_line_name VARCHAR(255),
    direction_name VARCHAR(255),
    operator_ref VARCHAR(255),
    destination_ref VARCHAR(255),
    destination_name VARCHAR(255),
    longitude FLOAT,
    latitude FLOAT,
    bearing FLOAT,
    delay VARCHAR(255),
    stop_point_ref VARCHAR(255),
    stop_point_name VARCHAR(255),
    aimed_arrival_time TIMESTAMP,
    expected_arrival_time TIMESTAMP,
    aimed_departure_time TIMESTAMP,
    expected_departure_time TIMESTAMP,
    distance_from_stop INTEGER,
    stop_order INTEGER
);

CREATE TABLE IF NOT EXISTS vehicle_positions_history (
    id SERIAL PRIMARY KEY,
    vehicle_ref VARCHAR(255) NOT NULL,
    recorded_at_time TIMESTAMP,
    valid_until_time TIMESTAMP,
    line_ref VARCHAR(255),
    direction_ref VARCHAR(255),
    dated_vehicle_journey_ref VARCHAR(255),
    published_line_name VARCHAR(255),
    direction_name VARCHAR(255),
    operator_ref VARCHAR(255),
    destination_ref VARCHAR(255),
    destination_name VARCHAR(255),
    longitude FLOAT,
    latitude FLOAT,
    bearing FLOAT,
    delay VARCHAR(255),
    stop_point_ref VARCHAR(255),
    stop_point_name VARCHAR(255),
    aimed_arrival_time TIMESTAMP,
    expected_arrival_time TIMESTAMP,
    aimed_departure_time TIMESTAMP,
    expected_departure_time TIMESTAMP,
    distance_from_stop INTEGER,
    stop_order INTEGER
);

CREATE TABLE IF NOT EXISTS estimated_vehicle_journeys_current (
    id SERIAL PRIMARY KEY,
    recorded_at_time TIMESTAMP,
    line_ref VARCHAR(255),
    direction_ref VARCHAR(255),
    data_frame_ref VARCHAR(255),
    dated_vehicle_journey_ref VARCHAR(255) UNIQUE,
    journey_pattern_ref VARCHAR(255),
    published_line_name VARCHAR(255),
    direction_name VARCHAR(255),
    operator_ref VARCHAR(255),
    destination_ref VARCHAR(255),
    destination_name VARCHAR(255),
    origin_ref VARCHAR(255),
    origin_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS estimated_vehicle_journeys_history (
    id SERIAL PRIMARY KEY,
    recorded_at_time TIMESTAMP,
    line_ref VARCHAR(255),
    direction_ref VARCHAR(255),
    data_frame_ref VARCHAR(255),
    dated_vehicle_journey_ref VARCHAR(255),
    journey_pattern_ref VARCHAR(255),
    published_line_name VARCHAR(255),
    direction_name VARCHAR(255),
    operator_ref VARCHAR(255),
    destination_ref VARCHAR(255),
    destination_name VARCHAR(255),
    origin_ref VARCHAR(255),
    origin_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS estimated_calls_current (
    id SERIAL PRIMARY KEY,
    estimated_vehicle_journey_id INTEGER REFERENCES estimated_vehicle_journeys_current(id) ON DELETE CASCADE,
    stop_point_ref VARCHAR(255),
    gtfs_stop_id INTEGER,
    stop_point_name VARCHAR(255),
    destination_display VARCHAR(255),
    aimed_arrival_time TIMESTAMP,
    expected_arrival_time TIMESTAMP,
    aimed_departure_time TIMESTAMP,
    expected_departure_time TIMESTAMP,
    stop_order INTEGER,
    for_alighting BOOLEAN,
    for_boarding BOOLEAN,
    UNIQUE (estimated_vehicle_journey_id, stop_order)
);

CREATE TABLE IF NOT EXISTS estimated_calls_history (
    id SERIAL PRIMARY KEY,
    estimated_vehicle_journey_id INTEGER,
    stop_point_ref VARCHAR(255),
    gtfs_stop_id INTEGER,
    stop_point_name VARCHAR(255),
    destination_display VARCHAR(255),
    aimed_arrival_time TIMESTAMP,
    expected_arrival_time TIMESTAMP,
    aimed_departure_time TIMESTAMP,
    expected_departure_time TIMESTAMP,
    stop_order INTEGER,
    for_alighting BOOLEAN,
    for_boarding BOOLEAN
);

CREATE TABLE IF NOT EXISTS gtfs_agency (
    agency_id TEXT PRIMARY KEY,
    agency_name TEXT,
    agency_url TEXT,
    agency_timezone TEXT,
    agency_lang TEXT,
    agency_phone TEXT,
    agency_fare_url TEXT,
    agency_email TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_calendar (
    service_id TEXT PRIMARY KEY,
    monday INTEGER,
    tuesday INTEGER,
    wednesday INTEGER,
    thursday INTEGER,
    friday INTEGER,
    saturday INTEGER,
    sunday INTEGER,
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS gtfs_calendar_dates (
    service_id TEXT,
    date DATE,
    exception_type INTEGER
);

CREATE TABLE IF NOT EXISTS gtfs_routes (
    route_id TEXT PRIMARY KEY,
    agency_id TEXT,
    route_short_name TEXT,
    route_long_name TEXT,
    route_desc TEXT,
    route_type INTEGER,
    route_url TEXT,
    route_color TEXT,
    route_text_color TEXT,
    route_sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS gtfs_trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT,
    service_id TEXT,
    trip_headsign TEXT,
    trip_short_name TEXT,
    direction_id INTEGER,
    block_id TEXT,
    shape_id TEXT,
    wheelchair_accessible INTEGER,
    bikes_allowed INTEGER
);

CREATE TABLE IF NOT EXISTS gtfs_stop_times (
    trip_id TEXT,
    arrival_time TEXT,
    departure_time TEXT,
    stop_id TEXT,
    stop_sequence INTEGER,
    stop_headsign TEXT,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled TEXT,
    timepoint INTEGER,
    UNIQUE (trip_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS gtfs_stops (
    stop_id TEXT PRIMARY KEY,
    stop_code TEXT,
    stop_name TEXT,
    stop_desc TEXT,
    stop_lat FLOAT,
    stop_lon FLOAT,
    zone_id TEXT,
    stop_url TEXT,
    location_type INTEGER,
    parent_station TEXT,
    stop_timezone TEXT,
    wheelchair_boarding INTEGER,
    level_id TEXT,
    platform_code TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_shapes (
    shape_id TEXT,
    shape_pt_lat FLOAT,
    shape_pt_lon FLOAT,
    shape_pt_sequence INTEGER,
    shape_dist_traveled TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_transfers (
    from_stop_id TEXT,
    to_stop_id TEXT,
    transfer_type INTEGER,
    min_transfer_time INTEGER
);

CREATE TABLE IF NOT EXISTS gtfs_feed_info (
    feed_publisher_name TEXT,
    feed_publisher_url TEXT,
    feed_lang TEXT,
    feed_start_date DATE,
    feed_end_date DATE,
    feed_version TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_agency_staging AS TABLE gtfs_agency WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_calendar_staging AS TABLE gtfs_calendar WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_calendar_dates_staging AS TABLE gtfs_calendar_dates WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_routes_staging AS TABLE gtfs_routes WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_trips_staging AS TABLE gtfs_trips WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_stop_times_staging AS TABLE gtfs_stop_times WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_stops_staging AS TABLE gtfs_stops WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_shapes_staging AS TABLE gtfs_shapes WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_transfers_staging AS TABLE gtfs_transfers WITH NO DATA;
CREATE TABLE IF NOT EXISTS gtfs_feed_info_staging AS TABLE gtfs_feed_info WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_vehicle_positions_current_line_ref ON vehicle_positions_current (line_ref);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_current_recorded_at ON vehicle_positions_current (recorded_at_time);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_history_recorded_at ON vehicle_positions_history (recorded_at_time);
CREATE INDEX IF NOT EXISTS idx_estimated_calls_current_stop_id ON estimated_calls_current (gtfs_stop_id);
CREATE INDEX IF NOT EXISTS idx_estimated_calls_history_arrival_time ON estimated_calls_history (expected_arrival_time);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop_id_arrival ON gtfs_stop_times (stop_id, arrival_time);
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_service_id ON gtfs_trips (service_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_routes_short_name ON gtfs_routes (route_short_name);
