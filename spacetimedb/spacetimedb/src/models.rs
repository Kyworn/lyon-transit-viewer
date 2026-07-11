use spacetimedb::{table, Timestamp};

// Private table: holds the base64 TCL API token (email:password). Must NOT be
// client-subscribable — procedures access it server-side regardless of this flag.
#[table(accessor = config)]
pub struct Config {
    #[primary_key]
    pub id: u64,
    pub tcl_api_token: Option<String>,
    pub gtfs_zip_url: Option<String>,
}

#[table(accessor = ingestion_runs, public)]
pub struct IngestionRun {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub job_name: String,
    #[index(btree)]
    pub started_at: Timestamp,
    pub ended_at: Timestamp,
    pub status: String,
    pub rows_upserted: u64,
    pub error: Option<String>,
}

#[table(accessor = vehicle_positions_current, public)]
pub struct VehiclePositionCurrent {
    #[primary_key]
    pub vehicle_ref: String,
    #[index(btree)]
    pub recorded_at_time: Timestamp,
    pub valid_until_time: Option<String>,
    #[index(btree)]
    pub line_ref: Option<String>,
    pub direction_ref: Option<String>,
    pub dated_vehicle_journey_ref: Option<String>,
    pub published_line_name: Option<String>,
    pub direction_name: Option<String>,
    pub operator_ref: Option<String>,
    pub destination_ref: Option<String>,
    pub destination_name: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
    pub bearing: Option<f64>,
    pub delay: Option<String>,
    pub stop_point_ref: Option<String>,
    pub stop_point_name: Option<String>,
    pub aimed_arrival_time: Option<String>,
    pub expected_arrival_time: Option<String>,
    pub aimed_departure_time: Option<String>,
    pub expected_departure_time: Option<String>,
    pub distance_from_stop: Option<i64>,
    pub stop_order: Option<i64>,
    pub velocity: Option<f64>,
    pub occupancy: Option<String>,
}

#[table(accessor = estimated_vehicle_journeys_current, public)]
pub struct EstimatedVehicleJourneyCurrent {
    #[primary_key]
    pub dated_vehicle_journey_ref: String,
    #[index(btree)]
    pub recorded_at_time: Timestamp,
    pub line_ref: Option<String>,
    pub direction_ref: Option<String>,
    pub destination_ref: Option<String>,
    pub line_sort_code: Option<String>,
}

#[table(accessor = estimated_calls_current, public)]
pub struct EstimatedCallCurrent {
    #[primary_key]
    pub call_id: String,
    #[index(btree)]
    pub recorded_at_time: Timestamp,
    #[index(btree)]
    pub dated_vehicle_journey_ref: String,
    pub stop_point_ref: Option<String>,
    pub gtfs_stop_id: Option<String>,
    pub stop_point_name: Option<String>,
    pub aimed_arrival_time: Option<String>,
    pub expected_arrival_time: Option<String>,
    pub aimed_departure_time: Option<String>,
    pub expected_departure_time: Option<String>,
    pub stop_order: Option<i64>,
}

#[table(accessor = alerts, public)]
pub struct Alert {
    #[primary_key]
    pub alert_key: String,
    pub alert_id: Option<i64>,
    pub alert_type: Option<String>,
    pub cause: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub mode: Option<String>,
    pub line_commercial_name: Option<String>,
    pub line_customer_name: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub last_update: Option<String>,
    pub severity_type: Option<String>,
    pub severity_level: Option<i64>,
    pub object_type: Option<String>,
    pub object_list: Option<String>,
}

#[table(accessor = velov_stations, public)]
pub struct VelovStation {
    #[primary_key]
    pub number: i64,
    pub name: String,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub status: Option<String>,
    pub availability: Option<String>,
    pub bike_stands: i64,
    pub available_bike_stands: i64,
    pub available_bikes: i64,
    pub available_electrical_bikes: Option<i64>,
    pub available_mechanical_bikes: Option<i64>,
    pub banking: bool,
    pub bonus: bool,
    pub last_update: Option<String>,
    pub recorded_at: Timestamp,
}

#[table(accessor = autopartage_stations, public)]
pub struct AutopartageStation {
    #[primary_key]
    pub id_station: String,
    pub name: String,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub nb_emplacements: i64,
    pub type_autopartage: Option<String>,
    pub last_update: Option<String>,
    pub recorded_at: Timestamp,
}

#[table(accessor = public_toilets, public)]
pub struct PublicToilet {
    #[primary_key]
    pub id: i64,
    pub address: Option<String>,
    pub commune_insee: Option<String>,
    pub info_location: Option<String>,
    pub provenance: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub recorded_at: Timestamp,
}

#[table(accessor = stations, public)]
pub struct Station {
    #[primary_key]
    pub id: String,
    pub station_api_id: Option<i64>,
    pub station_id: Option<i64>,
    pub name: Option<String>,
    pub service_info: Option<String>,
    pub last_update: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
}

#[table(accessor = lines, public)]
pub struct Line {
    #[primary_key]
    pub id: String,
    pub line_name: Option<String>,
    pub line_code: Option<String>,
    pub trace_type: Option<String>,
    pub trace_name: Option<String>,
    pub direction: Option<String>,
    pub origin_id: Option<String>,
    pub destination_id: Option<String>,
    pub origin_name: Option<String>,
    pub destination_name: Option<String>,
    pub transport_family: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub line_type_code: Option<String>,
    pub line_type_name: Option<String>,
    pub pmr_accessible: Option<bool>,
    pub line_sort_code: Option<String>,
    pub version_name: Option<String>,
    pub last_update: Option<String>,
    pub category: Option<String>,
    pub color: Option<String>,
}

// Line geometry split out of `lines` so the metadata table stays light. The
// full bus trace set is ~500MB; subscribing all of it on first paint is what
// made the app crawl. Clients subscribe rail traces (`is_rail = true`) up
// front and fetch a bus line's trace on-demand by `id`. `is_rail` is a plain
// bool (NOT Option) so it can be filtered in a subscription WHERE clause —
// SpacetimeDB SQL cannot compare Option columns to literals.
#[table(accessor = line_traces, public)]
pub struct LineTrace {
    #[primary_key]
    pub id: String,
    pub trace_code: Option<String>,
    pub is_rail: bool,
}

#[table(accessor = stops, public)]
pub struct Stop {
    #[primary_key]
    pub id: String,
    pub name: Option<String>,
    pub service_info: Option<String>,
    pub pmr_accessible: Option<bool>,
    pub has_elevator: Option<bool>,
    pub has_escalator: Option<bool>,
    pub last_update: Option<String>,
    pub address: Option<String>,
    pub municipality: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub zone: Option<String>,
    pub gtfs_stop_id: Option<String>,
}

#[table(accessor = line_icon_mapping, public)]
pub struct LineIconMapping {
    #[primary_key]
    pub code_ligne: String,
    pub picto_mode: Option<String>,
    pub picto_ligne: Option<String>,
    pub picto_complet: Option<String>,
}

#[table(accessor = pricing_zones, public)]
pub struct PricingZones {
    #[primary_key]
    pub id: u64,
    pub geojson: String,
    pub last_update: Timestamp,
}

#[table(accessor = gtfs_agency, public)]
pub struct GtfsAgency {
    #[primary_key]
    pub agency_id: String,
    pub agency_name: Option<String>,
    pub agency_url: Option<String>,
    pub agency_timezone: Option<String>,
    pub agency_lang: Option<String>,
    pub agency_phone: Option<String>,
    pub agency_fare_url: Option<String>,
    pub agency_email: Option<String>,
}

#[table(accessor = gtfs_calendar, public)]
pub struct GtfsCalendar {
    #[primary_key]
    pub service_id: String,
    pub monday: Option<String>,
    pub tuesday: Option<String>,
    pub wednesday: Option<String>,
    pub thursday: Option<String>,
    pub friday: Option<String>,
    pub saturday: Option<String>,
    pub sunday: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[table(accessor = gtfs_calendar_dates, public)]
pub struct GtfsCalendarDate {
    #[primary_key]
    pub calendar_date_id: String,
    pub service_id: Option<String>,
    pub date: Option<String>,
    pub exception_type: Option<String>,
}

#[table(accessor = gtfs_routes, public)]
pub struct GtfsRoute {
    #[primary_key]
    pub route_id: String,
    pub agency_id: Option<String>,
    pub route_short_name: Option<String>,
    pub route_long_name: Option<String>,
    pub route_desc: Option<String>,
    pub route_type: Option<String>,
    pub route_url: Option<String>,
    pub route_color: Option<String>,
    pub route_text_color: Option<String>,
    pub route_sort_order: Option<String>,
}

#[table(accessor = gtfs_trips, public)]
pub struct GtfsTrip {
    #[primary_key]
    pub trip_id: String,
    pub route_id: Option<String>,
    pub service_id: Option<String>,
    pub trip_headsign: Option<String>,
    pub trip_short_name: Option<String>,
    pub direction_id: Option<String>,
    pub block_id: Option<String>,
    pub shape_id: Option<String>,
    pub wheelchair_accessible: Option<String>,
    pub bikes_allowed: Option<String>,
}

#[table(accessor = gtfs_stop_times, public)]
pub struct GtfsStopTime {
    #[primary_key]
    pub stop_time_id: String,
    pub trip_id: Option<String>,
    pub arrival_time: Option<String>,
    pub departure_time: Option<String>,
    pub stop_id: Option<String>,
    pub stop_sequence: Option<String>,
    pub stop_headsign: Option<String>,
    pub pickup_type: Option<String>,
    pub drop_off_type: Option<String>,
    pub shape_dist_traveled: Option<String>,
    pub timepoint: Option<String>,
}

#[table(accessor = gtfs_stops, public)]
pub struct GtfsStop {
    #[primary_key]
    pub stop_id: String,
    pub stop_code: Option<String>,
    pub stop_name: Option<String>,
    pub stop_desc: Option<String>,
    pub stop_lat: Option<String>,
    pub stop_lon: Option<String>,
    pub zone_id: Option<String>,
    pub stop_url: Option<String>,
    pub location_type: Option<String>,
    pub parent_station: Option<String>,
    pub stop_timezone: Option<String>,
    pub wheelchair_boarding: Option<String>,
    pub level_id: Option<String>,
    pub platform_code: Option<String>,
}

#[table(accessor = gtfs_shapes, public)]
pub struct GtfsShape {
    #[primary_key]
    pub shape_point_id: String,
    pub shape_id: Option<String>,
    pub shape_pt_lat: Option<String>,
    pub shape_pt_lon: Option<String>,
    pub shape_pt_sequence: Option<String>,
    pub shape_dist_traveled: Option<String>,
}

#[table(accessor = gtfs_transfers, public)]
pub struct GtfsTransfer {
    #[primary_key]
    pub transfer_id: String,
    pub from_stop_id: Option<String>,
    pub to_stop_id: Option<String>,
    pub transfer_type: Option<String>,
    pub min_transfer_time: Option<String>,
}

#[table(accessor = gtfs_feed_info, public)]
pub struct GtfsFeedInfo {
    #[primary_key]
    pub feed_id: u64,
    pub feed_publisher_name: Option<String>,
    pub feed_publisher_url: Option<String>,
    pub feed_lang: Option<String>,
    pub feed_start_date: Option<String>,
    pub feed_end_date: Option<String>,
    pub feed_version: Option<String>,
}

#[table(accessor = stop_ref_name_cache, public)]
pub struct StopRefNameCache {
    #[primary_key]
    pub stop_ref: String,
    pub stop_name: Option<String>,
    pub recorded_at: spacetimedb::Timestamp,
}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct ConfigUpdate {
    pub tcl_api_token: Option<String>,
    pub gtfs_zip_url: Option<String>,
}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct ConfigUpdatePlain {
    pub tcl_api_token: String,
    pub gtfs_zip_url: String,
}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct IngestRequest {}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct StaticPayload {
    pub alerts: String,
    pub stations: String,
    pub stops: String,
    pub lines_bus: String,
    pub lines_metro: String,
    pub lines_tram: String,
    pub lines_rhonexpress: String,
    pub pricing_zones: String,
}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct RealtimePayload {
    pub vehicles: String,
    pub timetables: String,
}

#[derive(spacetimedb::SpacetimeType, Clone)]
pub struct JourneyRequest {
    pub from_lat: f64,
    pub from_lng: f64,
    pub to_lat: f64,
    pub to_lng: f64,
    pub datetime: String,
    pub is_arrival_time: bool,
    pub transport_modes: String,
    pub walk: String,
    pub bike: Option<String>,
    pub pmr: bool,
    pub car: bool,
    pub data_freshness: String,
}
