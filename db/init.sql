CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER UNIQUE,
    type VARCHAR(255),
    cause VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    mode VARCHAR(255),
    line_commercial_name VARCHAR(255),
    line_customer_name VARCHAR(255),
    title TEXT,
    message TEXT,
    last_update TIMESTAMP,
    severity_type VARCHAR(255),
    severity_level INTEGER,
    object_type VARCHAR(255),
    object_list VARCHAR(255)
);

CREATE TABLE stations (
    id VARCHAR(255) PRIMARY KEY,
    station_api_id BIGINT,
    station_id BIGINT,
    name VARCHAR(255),
    service_info VARCHAR(255),
    last_update TIMESTAMP,
    longitude FLOAT,
    latitude FLOAT
);

CREATE TABLE lines (
    id VARCHAR(255) PRIMARY KEY,
    line_name TEXT,
    trace_code TEXT,
    line_code TEXT,
    trace_type TEXT,
    trace_name TEXT,
    direction TEXT,
    origin_id TEXT,
    destination_id TEXT,
    origin_name TEXT,
    destination_name TEXT,
    transport_family TEXT,
    start_date DATE,
    end_date DATE,
    line_type_code TEXT,
    line_type_name TEXT,
    pmr_accessible BOOLEAN,
    line_sort_code TEXT,
    version_name TEXT,
    last_update TIMESTAMP,
    category TEXT,
    color TEXT
);

CREATE TABLE stops (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    service_info TEXT,
    pmr_accessible BOOLEAN,
    has_elevator BOOLEAN,
    has_escalator BOOLEAN,
    last_update TIMESTAMP,
    address TEXT,
    municipality VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    zone VARCHAR(255),
    gtfs_stop_id VARCHAR(255)
);

CREATE TABLE estimated_vehicle_journeys (
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

CREATE TABLE estimated_calls (
    id SERIAL PRIMARY KEY,
    estimated_vehicle_journey_id INTEGER REFERENCES estimated_vehicle_journeys(id) ON DELETE CASCADE,
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

CREATE TABLE vehicle_positions (
    id SERIAL PRIMARY KEY,
    vehicle_ref VARCHAR(255) UNIQUE,
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

CREATE TABLE line_icon_mapping (
    code_ligne VARCHAR(255) PRIMARY KEY,
    picto_mode VARCHAR(255),
    picto_ligne VARCHAR(255),
    picto_complet VARCHAR(255)
);