use serde::Deserialize;
use serde_json::{json, Value};
use spacetimedb::{
    http::{Body, Request},
    procedure, reducer, table, ReducerContext, Table, TimeDuration, Timestamp, ProcedureContext,
};
use std::collections::HashSet;
use std::time::Duration;

#[table(accessor = config, public)]
pub struct Config {
    #[primary_key]
    id: u64,
    tcl_api_token: Option<String>,
    gtfs_zip_url: Option<String>,
}

#[table(accessor = ingestion_runs, public)]
pub struct IngestionRun {
    #[primary_key]
    #[auto_inc]
    id: u64,
    job_name: String,
    started_at: Timestamp,
    ended_at: Timestamp,
    status: String,
    rows_upserted: u64,
    error: Option<String>,
}

#[table(accessor = vehicle_positions_current, public)]
pub struct VehiclePositionCurrent {
    #[primary_key]
    vehicle_ref: String,
    recorded_at_time: Timestamp,
    valid_until_time: Option<String>,
    line_ref: Option<String>,
    direction_ref: Option<String>,
    dated_vehicle_journey_ref: Option<String>,
    published_line_name: Option<String>,
    direction_name: Option<String>,
    operator_ref: Option<String>,
    destination_ref: Option<String>,
    destination_name: Option<String>,
    longitude: Option<f64>,
    latitude: Option<f64>,
    bearing: Option<f64>,
    delay: Option<String>,
    stop_point_ref: Option<String>,
    stop_point_name: Option<String>,
    aimed_arrival_time: Option<String>,
    expected_arrival_time: Option<String>,
    aimed_departure_time: Option<String>,
    expected_departure_time: Option<String>,
    distance_from_stop: Option<i64>,
    stop_order: Option<i64>,
}

#[table(accessor = estimated_vehicle_journeys_current, public)]
pub struct EstimatedVehicleJourneyCurrent {
    #[primary_key]
    dated_vehicle_journey_ref: String,
    recorded_at_time: Timestamp,
    line_ref: Option<String>,
    direction_ref: Option<String>,
    destination_ref: Option<String>,
    line_sort_code: Option<String>,
}

#[table(accessor = estimated_calls_current, public)]
pub struct EstimatedCallCurrent {
    #[primary_key]
    call_id: String,
    recorded_at_time: Timestamp,
    dated_vehicle_journey_ref: String,
    stop_point_ref: Option<String>,
    gtfs_stop_id: Option<String>,
    stop_point_name: Option<String>,
    aimed_arrival_time: Option<String>,
    expected_arrival_time: Option<String>,
    aimed_departure_time: Option<String>,
    expected_departure_time: Option<String>,
    stop_order: Option<i64>,
}

#[table(accessor = alerts, public)]
pub struct Alert {
    #[primary_key]
    alert_key: String,
    alert_id: Option<i64>,
    alert_type: Option<String>,
    cause: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    mode: Option<String>,
    line_commercial_name: Option<String>,
    line_customer_name: Option<String>,
    title: Option<String>,
    message: Option<String>,
    last_update: Option<String>,
    severity_type: Option<String>,
    severity_level: Option<i64>,
    object_type: Option<String>,
    object_list: Option<String>,
}

#[table(accessor = stations, public)]
pub struct Station {
    #[primary_key]
    id: String,
    station_api_id: Option<i64>,
    station_id: Option<i64>,
    name: Option<String>,
    service_info: Option<String>,
    last_update: Option<String>,
    longitude: Option<f64>,
    latitude: Option<f64>,
}

#[table(accessor = lines, public)]
pub struct Line {
    #[primary_key]
    id: String,
    line_name: Option<String>,
    trace_code: Option<String>,
    line_code: Option<String>,
    trace_type: Option<String>,
    trace_name: Option<String>,
    direction: Option<String>,
    origin_id: Option<String>,
    destination_id: Option<String>,
    origin_name: Option<String>,
    destination_name: Option<String>,
    transport_family: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    line_type_code: Option<String>,
    line_type_name: Option<String>,
    pmr_accessible: Option<bool>,
    line_sort_code: Option<String>,
    version_name: Option<String>,
    last_update: Option<String>,
    category: Option<String>,
    color: Option<String>,
}

#[table(accessor = stops, public)]
pub struct Stop {
    #[primary_key]
    id: String,
    name: Option<String>,
    service_info: Option<String>,
    pmr_accessible: Option<bool>,
    has_elevator: Option<bool>,
    has_escalator: Option<bool>,
    last_update: Option<String>,
    address: Option<String>,
    municipality: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
    zone: Option<String>,
    gtfs_stop_id: Option<String>,
}

#[table(accessor = line_icon_mapping, public)]
pub struct LineIconMapping {
    #[primary_key]
    code_ligne: String,
    picto_mode: Option<String>,
    picto_ligne: Option<String>,
    picto_complet: Option<String>,
}

#[table(accessor = pricing_zones, public)]
pub struct PricingZones {
    #[primary_key]
    id: u64,
    geojson: String,
    last_update: Timestamp,
}

#[table(accessor = gtfs_agency, public)]
pub struct GtfsAgency {
    #[primary_key]
    agency_id: String,
    agency_name: Option<String>,
    agency_url: Option<String>,
    agency_timezone: Option<String>,
    agency_lang: Option<String>,
    agency_phone: Option<String>,
    agency_fare_url: Option<String>,
    agency_email: Option<String>,
}

#[table(accessor = gtfs_calendar, public)]
pub struct GtfsCalendar {
    #[primary_key]
    service_id: String,
    monday: Option<String>,
    tuesday: Option<String>,
    wednesday: Option<String>,
    thursday: Option<String>,
    friday: Option<String>,
    saturday: Option<String>,
    sunday: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
}

#[table(accessor = gtfs_calendar_dates, public)]
pub struct GtfsCalendarDate {
    #[primary_key]
    calendar_date_id: String,
    service_id: Option<String>,
    date: Option<String>,
    exception_type: Option<String>,
}

#[table(accessor = gtfs_routes, public)]
pub struct GtfsRoute {
    #[primary_key]
    route_id: String,
    agency_id: Option<String>,
    route_short_name: Option<String>,
    route_long_name: Option<String>,
    route_desc: Option<String>,
    route_type: Option<String>,
    route_url: Option<String>,
    route_color: Option<String>,
    route_text_color: Option<String>,
    route_sort_order: Option<String>,
}

#[table(accessor = gtfs_trips, public)]
pub struct GtfsTrip {
    #[primary_key]
    trip_id: String,
    route_id: Option<String>,
    service_id: Option<String>,
    trip_headsign: Option<String>,
    trip_short_name: Option<String>,
    direction_id: Option<String>,
    block_id: Option<String>,
    shape_id: Option<String>,
    wheelchair_accessible: Option<String>,
    bikes_allowed: Option<String>,
}

#[table(accessor = gtfs_stop_times, public)]
pub struct GtfsStopTime {
    #[primary_key]
    stop_time_id: String,
    trip_id: Option<String>,
    arrival_time: Option<String>,
    departure_time: Option<String>,
    stop_id: Option<String>,
    stop_sequence: Option<String>,
    stop_headsign: Option<String>,
    pickup_type: Option<String>,
    drop_off_type: Option<String>,
    shape_dist_traveled: Option<String>,
    timepoint: Option<String>,
}

#[table(accessor = gtfs_stops, public)]
pub struct GtfsStop {
    #[primary_key]
    stop_id: String,
    stop_code: Option<String>,
    stop_name: Option<String>,
    stop_desc: Option<String>,
    stop_lat: Option<String>,
    stop_lon: Option<String>,
    zone_id: Option<String>,
    stop_url: Option<String>,
    location_type: Option<String>,
    parent_station: Option<String>,
    stop_timezone: Option<String>,
    wheelchair_boarding: Option<String>,
    level_id: Option<String>,
    platform_code: Option<String>,
}

#[table(accessor = gtfs_shapes, public)]
pub struct GtfsShape {
    #[primary_key]
    shape_point_id: String,
    shape_id: Option<String>,
    shape_pt_lat: Option<String>,
    shape_pt_lon: Option<String>,
    shape_pt_sequence: Option<String>,
    shape_dist_traveled: Option<String>,
}

#[table(accessor = gtfs_transfers, public)]
pub struct GtfsTransfer {
    #[primary_key]
    transfer_id: String,
    from_stop_id: Option<String>,
    to_stop_id: Option<String>,
    transfer_type: Option<String>,
    min_transfer_time: Option<String>,
}

#[table(accessor = gtfs_feed_info, public)]
pub struct GtfsFeedInfo {
    #[primary_key]
    feed_id: u64,
    feed_publisher_name: Option<String>,
    feed_publisher_url: Option<String>,
    feed_lang: Option<String>,
    feed_start_date: Option<String>,
    feed_end_date: Option<String>,
    feed_version: Option<String>,
}

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    if ctx.db.config().iter().next().is_none() {
        ctx.db.config().insert(Config {
            id: 1,
            tcl_api_token: None,
            gtfs_zip_url: None,
        });
    }
}

#[derive(spacetimedb::SpacetimeType)]
pub struct ConfigUpdate {
    tcl_api_token: Option<String>,
    gtfs_zip_url: Option<String>,
}

#[derive(spacetimedb::SpacetimeType)]
pub struct ConfigUpdatePlain {
    tcl_api_token: String,
    gtfs_zip_url: String,
}

#[derive(spacetimedb::SpacetimeType)]
pub struct IngestRequest {}

#[derive(spacetimedb::SpacetimeType)]
pub struct StaticPayload {
    alerts: String,
    stations: String,
    stops: String,
    lines_bus: String,
    lines_metro: String,
    lines_tram: String,
    lines_rhonexpress: String,
    pricing_zones: String,
}

#[derive(spacetimedb::SpacetimeType)]
pub struct RealtimePayload {
    vehicles: String,
    timetables: String,
}

#[procedure]
fn set_config(ctx: &mut ProcedureContext, update: ConfigUpdate) {
    let token = update.tcl_api_token.clone();
    let gtfs = update.gtfs_zip_url.clone();
    ctx.with_tx(|tx| {
        let existing = tx.db.config().iter().next();
        if let Some(mut cfg) = existing {
            let old = Config {
                id: cfg.id,
                tcl_api_token: cfg.tcl_api_token.clone(),
                gtfs_zip_url: cfg.gtfs_zip_url.clone(),
            };
            if token.is_some() {
                cfg.tcl_api_token = token.clone();
            }
            if gtfs.is_some() {
                cfg.gtfs_zip_url = gtfs.clone();
            }
            tx.db.config().delete(old);
            tx.db.config().insert(cfg);
        } else {
            tx.db.config().insert(Config {
                id: 1,
                tcl_api_token: token.clone(),
                gtfs_zip_url: gtfs.clone(),
            });
        }
    });
}

#[procedure]
fn set_config_plain(ctx: &mut ProcedureContext, update: ConfigUpdatePlain) {
    let token = if update.tcl_api_token.trim().is_empty() {
        None
    } else {
        Some(update.tcl_api_token.clone())
    };
    let gtfs = if update.gtfs_zip_url.trim().is_empty() {
        None
    } else {
        Some(update.gtfs_zip_url.clone())
    };
    ctx.with_tx(|tx| {
        let existing = tx.db.config().iter().next();
        if let Some(mut cfg) = existing {
            let old = Config {
                id: cfg.id,
                tcl_api_token: cfg.tcl_api_token.clone(),
                gtfs_zip_url: cfg.gtfs_zip_url.clone(),
            };
            if token.is_some() {
                cfg.tcl_api_token = token.clone();
            }
            if gtfs.is_some() {
                cfg.gtfs_zip_url = gtfs.clone();
            }
            tx.db.config().delete(old);
            tx.db.config().insert(cfg);
        } else {
            tx.db.config().insert(Config {
                id: 1,
                tcl_api_token: token.clone(),
                gtfs_zip_url: gtfs.clone(),
            });
        }
    });
}

#[procedure]
fn ingest_realtime(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    let started = ctx.timestamp;
    let config = ctx.with_tx(|tx| tx.db.config().iter().next());
    let token = config.as_ref().and_then(|cfg| cfg.tcl_api_token.as_ref());
    let mut errors: Vec<String> = Vec::new();
    let mut rows_upserted = 0u64;
    let now = ctx.timestamp;

    let vehicles_json = match http_get(ctx, "https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json", token) {
        Ok(body) => body,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_realtime", started, ctx.timestamp, "error", 0, Some(err));
            return;
        }
    };

    let activities = match serde_json::from_str::<SiriVehicleMonitoringResponse>(&vehicles_json)
        .ok()
        .and_then(extract_vehicle_activities)
    {
        Some(a) => a,
        None => {
            record_ingestion_run(
                ctx,
                "ingest_realtime",
                started,
                ctx.timestamp,
                "error",
                0,
                Some("vehicles: empty activities".to_string()),
            );
            return;
        }
    };

    let mut active_line_refs: Vec<String> = activities
        .iter()
        .filter_map(|a| {
            a.monitored_vehicle_journey
                .line_ref
                .as_ref()
                .and_then(|v| v.value.clone())
        })
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    // Metro/funicular lines are often missing from vehicle-monitoring but present in estimated timetables.
    // Always query them explicitly so stop departures stay populated on A/B/C/D/F1/F2.
    for fixed_ref in [
        "ActIV:Line::A:SYTRAL",
        "ActIV:Line::B:SYTRAL",
        "ActIV:Line::C:SYTRAL",
        "ActIV:Line::D:SYTRAL",
        "ActIV:Line::F1:SYTRAL",
        "ActIV:Line::F2:SYTRAL",
    ] {
        if !active_line_refs.iter().any(|v| v == fixed_ref) {
            active_line_refs.push(fixed_ref.to_string());
        }
    }
    active_line_refs.sort();

    let count = ctx.with_tx(|tx| {
        let mut count = 0u64;
        let mut seen_refs: HashSet<String> = HashSet::new();
        let stale_cutoff = now - TimeDuration::from_duration(Duration::from_secs(90));
        for activity in &activities {
            if let Some(row) = map_vehicle_activity(activity, now) {
                seen_refs.insert(row.vehicle_ref.clone());
                let journey_ref_opt = row.dated_vehicle_journey_ref.clone();
                let line_ref_opt = row.line_ref.clone();
                let direction_ref_opt = row.direction_ref.clone();
                let destination_ref_opt = row.destination_ref.clone();
                let stop_point_ref_opt = row.stop_point_ref.clone();
                let expected_arrival_time_opt = row.expected_arrival_time.clone().or(row.aimed_arrival_time.clone());
                let stop_order_opt = row.stop_order;
                tx.db.vehicle_positions_current().vehicle_ref().insert_or_update(row);

                // Fallback realtime projection for stop departures.
                // If timetable pulls fail, we still expose immediate departures from monitored calls.
                if let Some(journey_ref) = journey_ref_opt {
                    let line_sort_code = line_ref_opt.as_ref().and_then(|line| extract_line_sort_code(line));
                    tx.db.estimated_vehicle_journeys_current()
                        .dated_vehicle_journey_ref()
                        .insert_or_update(EstimatedVehicleJourneyCurrent {
                            dated_vehicle_journey_ref: journey_ref.clone(),
                            recorded_at_time: now,
                            line_ref: line_ref_opt.clone(),
                            direction_ref: direction_ref_opt.clone(),
                            destination_ref: destination_ref_opt.clone(),
                            line_sort_code,
                        });

                    if let Some(stop_point_ref) = stop_point_ref_opt {
                        let gtfs_stop_id = stop_point_ref.split(':').nth(3).map(|s| s.to_string());
                        let call_id = format!("{}:monitored", journey_ref);
                        tx.db.estimated_calls_current()
                            .call_id()
                            .insert_or_update(EstimatedCallCurrent {
                                call_id,
                                recorded_at_time: now,
                                dated_vehicle_journey_ref: journey_ref,
                                stop_point_ref: Some(stop_point_ref),
                                gtfs_stop_id,
                                stop_point_name: None,
                                aimed_arrival_time: None,
                                expected_arrival_time: expected_arrival_time_opt,
                                aimed_departure_time: None,
                                expected_departure_time: None,
                                stop_order: stop_order_opt.map(|v| v as i64),
                            });
                    }
                }
                count += 1;
            }
        }
        // Clear vehicles no longer present in feed (after a grace period).
        let existing: Vec<_> = tx.db.vehicle_positions_current().iter().collect();
        for row in existing {
            if row.recorded_at_time < stale_cutoff && !seen_refs.contains(&row.vehicle_ref) {
                tx.db.vehicle_positions_current().vehicle_ref().delete(&row.vehicle_ref);
            }
        }
        count
    });
    rows_upserted += count;

    if active_line_refs.is_empty() {
        match http_get(ctx, "https://data.grandlyon.com/siri-lite/2.0/estimated-timetables.json", token) {
            Ok(body) => match ingest_timetables_from_body(ctx, &body, now) {
                Ok(count) => rows_upserted += count,
                Err(err) => errors.push(format!("timetables:all: {}", err)),
            },
            Err(err) => errors.push(format!("timetables:all: {}", err)),
        }
    } else {
        // The full endpoint response can be too large for the embedded HTTP client.
        // Pull per active line to keep each response bounded.
        for line_ref in active_line_refs.iter().take(128) {
            let url = format!(
                "https://data.grandlyon.com/siri-lite/2.0/estimated-timetables.json?LineRef={}",
                urlencoding::encode(line_ref)
            );
            match http_get(ctx, &url, token) {
                Ok(body) => match ingest_timetables_from_body(ctx, &body, now) {
                    Ok(count) => rows_upserted += count,
                    Err(err) => errors.push(format!("timetables:{}: {}", line_ref, err)),
                },
                Err(err) => errors.push(format!("timetables:{}: {}", line_ref, err)),
            }
        }
    }

    if errors.is_empty() {
        record_ingestion_run(ctx, "ingest_realtime", started, ctx.timestamp, "success", rows_upserted, None);
    } else {
        record_ingestion_run(ctx, "ingest_realtime", started, ctx.timestamp, "partial", rows_upserted, Some(errors.join(" | ")));
    }
}

#[procedure]
fn ingest_realtime_payload(ctx: &mut ProcedureContext, payload: RealtimePayload) {
    let started = ctx.timestamp;
    let mut rows_upserted = 0u64;
    let mut errors: Vec<String> = Vec::new();
    let now = ctx.timestamp;

    if payload.vehicles.trim().is_empty() {
        errors.push("vehicles: empty payload".to_string());
    } else if let Ok(response) = serde_json::from_str::<SiriVehicleMonitoringResponse>(&payload.vehicles) {
        if let Some(activities) = extract_vehicle_activities(response) {
            let count = ctx.with_tx(|tx| {
                let mut count = 0u64;
                let mut seen_refs: HashSet<String> = HashSet::new();
                let stale_cutoff = now - TimeDuration::from_duration(Duration::from_secs(90));
                for activity in &activities {
                    if let Some(row) = map_vehicle_activity(activity, now) {
                        seen_refs.insert(row.vehicle_ref.clone());
                        tx.db.vehicle_positions_current().vehicle_ref().insert_or_update(row);
                        count += 1;
                    }
                }
                // Clear vehicles no longer present in feed (after a grace period).
                let existing: Vec<_> = tx.db.vehicle_positions_current().iter().collect();
                for row in existing {
                    if row.recorded_at_time < stale_cutoff && !seen_refs.contains(&row.vehicle_ref) {
                        tx.db.vehicle_positions_current().vehicle_ref().delete(&row.vehicle_ref);
                    }
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("vehicles: empty activities".to_string());
        }
    } else {
        errors.push("vehicles: parse error".to_string());
    }

    if payload.timetables.trim().is_empty() {
        errors.push("timetables: empty payload".to_string());
    } else if let Ok(response) = serde_json::from_str::<SiriEstimatedTimetablesResponse>(&payload.timetables) {
        if let Some(journeys) = extract_estimated_journeys(response) {
            let count = ctx.with_tx(|tx| {
                let mut count = 0u64;
                for journey in &journeys {
                    let journey_ref = journey
                        .DatedVehicleJourneyRef
                        .as_ref()
                        .and_then(|v| v.value.clone())
                        .or_else(|| journey.FramedVehicleJourneyRef.as_ref().and_then(|v| v.dated_vehicle_journey_ref.clone()));
                    if journey_ref.is_none() {
                        continue;
                    }
                    let journey_ref = journey_ref.unwrap();

                    let line_ref = journey.LineRef.as_ref().and_then(|v| v.value.clone());
                    let line_sort_code = line_ref.as_ref().and_then(|line| extract_line_sort_code(line));

                    tx.db.estimated_vehicle_journeys_current()
                        .dated_vehicle_journey_ref()
                        .insert_or_update(EstimatedVehicleJourneyCurrent {
                            dated_vehicle_journey_ref: journey_ref.clone(),
                            recorded_at_time: now,
                            line_ref: line_ref.clone(),
                            direction_ref: journey.DirectionRef.as_ref().and_then(|v| v.value.clone()),
                            destination_ref: journey.DestinationRef.as_ref().and_then(|v| v.value.clone()),
                            line_sort_code,
                        });

                    if let Some(calls) = journey.EstimatedCalls.as_ref().and_then(|c| c.EstimatedCall.as_ref()) {
                        for call in calls.iter() {
                            let stop_point_ref = call.StopPointRef.as_ref().and_then(|v| v.value.clone());
                            let stop_order = call.Order;
                            let call_id = format!("{}:{}", journey_ref, stop_order.unwrap_or(0));
                            let gtfs_stop_id = stop_point_ref.as_ref().and_then(|v| v.split(':').nth(3).map(|s| s.to_string()));

                            tx.db.estimated_calls_current()
                                .call_id()
                                .insert_or_update(EstimatedCallCurrent {
                                    call_id,
                                    recorded_at_time: now,
                                    dated_vehicle_journey_ref: journey_ref.clone(),
                                    stop_point_ref,
                                    gtfs_stop_id,
                                    stop_point_name: None,
                                    aimed_arrival_time: call.AimedArrivalTime.clone(),
                                    expected_arrival_time: call.ExpectedArrivalTime.clone().or(call.AimedArrivalTime.clone()),
                                    aimed_departure_time: call.AimedDepartureTime.clone(),
                                    expected_departure_time: call.ExpectedDepartureTime.clone(),
                                    stop_order: call.Order.map(|v| v as i64),
                                });
                            count += 1;
                        }
                    }
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("timetables: empty journeys".to_string());
        }
    } else {
        errors.push("timetables: parse error".to_string());
    }

    if errors.is_empty() {
        record_ingestion_run(ctx, "ingest_realtime_payload", started, ctx.timestamp, "success", rows_upserted, None);
    } else {
        let status = if rows_upserted > 0 { "partial" } else { "error" };
        record_ingestion_run(ctx, "ingest_realtime_payload", started, ctx.timestamp, status, rows_upserted, Some(errors.join(" | ")));
    }
}

#[procedure]
fn ingest_static(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    let started = ctx.timestamp;
    let config = ctx.with_tx(|tx| tx.db.config().iter().next());
    let token = config.as_ref().and_then(|cfg| cfg.tcl_api_token.as_ref());

    let mut errors: Vec<String> = Vec::new();

    let alerts_json = http_get(
        ctx,
        "https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclalertetrafic_2/all.json?maxfeatures=-1&start=1",
        token,
    );
    let stations_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclstation&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );
    let stops_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclarret&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );

    let lines_bus_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );
    let lines_metro_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );
    let lines_tram_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );
    let lines_rhonexpress_json = http_get(
        ctx,
        "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
        token,
    );
    let pricing_zones_json = http_get(
        ctx,
        "https://carte-interactive.tcl.fr/api/interface/tcl/pois/by-type/pricing-zones",
        None,
    );

    let mut rows_upserted = 0u64;

    if let Ok(body) = alerts_json {
        if let Ok(alerts) = serde_json::from_str::<AlertsResponse>(&body) {
            let count = ctx.with_tx(|tx| {
                let mut count = 0u64;
                for alert in &alerts.values {
                    let key = alert
                        .n
                        .map(|id| id.to_string())
                        .or_else(|| {
                            let title = alert.titre.clone().unwrap_or_default();
                            let message = alert.message.clone().unwrap_or_default();
                            if title.is_empty() && message.is_empty() {
                                None
                            } else {
                                Some(format!("{}:{}", title, message))
                            }
                        })
                        .unwrap_or_else(|| "unknown".to_string());

                    tx.db.alerts().alert_key().insert_or_update(Alert {
                        alert_key: key,
                        alert_id: alert.n,
                        alert_type: alert.alert_type.clone(),
                        cause: alert.cause.clone(),
                        start_time: alert.debut.clone(),
                        end_time: alert.fin.clone(),
                        mode: alert.mode.clone(),
                        line_commercial_name: alert.ligne_com.clone(),
                        line_customer_name: alert.ligne_cli.clone(),
                        title: alert.titre.clone(),
                        message: alert.message.clone(),
                        last_update: alert.last_update_fme.clone(),
                        severity_type: alert.typeseverite.clone(),
                        severity_level: alert.niveauseverite,
                        object_type: alert.typeobjet.clone(),
                        object_list: alert.listeobjet.clone(),
                    });
                    count += 1;
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("alerts: parse error".to_string());
        }
    } else if let Err(err) = alerts_json {
        errors.push(format!("alerts: {}", err));
    }

    if let Ok(body) = stations_json {
        if let Ok(collection) = serde_json::from_str::<GeoFeatureCollection<StationProperties>>(&body) {
            let count = ctx.with_tx(|tx| {
                let mut count = 0u64;
                for feature in &collection.features {
                    let coords = &feature.geometry.coordinates;
                    let longitude = coords.get(0).copied();
                    let latitude = coords.get(1).copied();
                    tx.db.stations().id().insert_or_update(Station {
                        id: feature.id.clone(),
                        station_api_id: feature.properties.station_api_id,
                        station_id: feature.properties.station_api_id,
                        name: feature.properties.nom.clone(),
                        service_info: feature.properties.desserte.clone(),
                        last_update: feature.properties.last_update.clone(),
                        longitude,
                        latitude,
                    });
                    count += 1;
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("stations: parse error".to_string());
        }
    } else if let Err(err) = stations_json {
        errors.push(format!("stations: {}", err));
    }

    if let Ok(body) = stops_json {
        if let Ok(collection) = serde_json::from_str::<GeoFeatureCollection<StopProperties>>(&body) {
            let count = ctx.with_tx(|tx| {
                let mut count = 0u64;
                for feature in &collection.features {
                    let coords = &feature.geometry.coordinates;
                    let longitude = coords.get(0).copied();
                    let latitude = coords.get(1).copied();
                    let gtfs_stop_id = feature.id.split('.').last().map(|s| s.to_string());

                    tx.db.stops().id().insert_or_update(Stop {
                        id: feature.id.clone(),
                        name: feature.properties.nom.clone(),
                        service_info: feature.properties.desserte.clone(),
                        pmr_accessible: feature.properties.pmr,
                        has_elevator: feature.properties.ascenseur,
                        has_escalator: feature.properties.escalier,
                        last_update: feature.properties.last_update.clone(),
                        address: feature.properties.adresse.clone(),
                        municipality: feature.properties.commune.clone(),
                        latitude,
                        longitude,
                        zone: feature.properties.zone.clone(),
                        gtfs_stop_id,
                    });
                    count += 1;
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("stops: parse error".to_string());
        }
    } else if let Err(err) = stops_json {
        errors.push(format!("stops: {}", err));
    }

    if let Ok(body) = lines_bus_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "bus");
    } else if let Err(err) = lines_bus_json {
        errors.push(format!("lines_bus: {}", err));
    }
    if let Ok(body) = lines_metro_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "metro");
    } else if let Err(err) = lines_metro_json {
        errors.push(format!("lines_metro: {}", err));
    }
    if let Ok(body) = lines_tram_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "tram");
    } else if let Err(err) = lines_tram_json {
        errors.push(format!("lines_tram: {}", err));
    }
    if let Ok(body) = lines_rhonexpress_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "rhonexpress");
    } else if let Err(err) = lines_rhonexpress_json {
        errors.push(format!("lines_rhonexpress: {}", err));
    }

    if let Ok(body) = pricing_zones_json {
        let body_clone = body.clone();
        let now = ctx.timestamp;
        let count = ctx.with_tx(|tx| {
            tx.db.pricing_zones().id().insert_or_update(PricingZones {
                id: 1,
                geojson: body_clone.clone(),
                last_update: now,
            });
            1u64
        });
        rows_upserted += count;
    } else if let Err(err) = pricing_zones_json {
        errors.push(format!("pricing_zones: {}", err));
    }

    ingest_line_icons(ctx);

    if errors.is_empty() {
        record_ingestion_run(ctx, "ingest_static", started, ctx.timestamp, "success", rows_upserted, None);
    } else {
        let status = if rows_upserted > 0 { "partial" } else { "error" };
        record_ingestion_run(ctx, "ingest_static", started, ctx.timestamp, status, rows_upserted, Some(errors.join(" | ")));
    }
}

#[procedure]
fn ingest_static_payload(ctx: &mut ProcedureContext, payload: StaticPayload) {
    let started = ctx.timestamp;
    let mut rows_upserted = 0u64;
    let mut errors: Vec<String> = Vec::new();

    if payload.alerts.trim().is_empty() {
        errors.push("alerts: empty payload".to_string());
    } else if let Ok(alerts) = serde_json::from_str::<AlertsResponse>(&payload.alerts) {
        let count = ctx.with_tx(|tx| {
            let mut count = 0u64;
            for alert in &alerts.values {
                let key = alert
                    .n
                    .map(|id| id.to_string())
                    .or_else(|| {
                        let title = alert.titre.clone().unwrap_or_default();
                        let message = alert.message.clone().unwrap_or_default();
                        if title.is_empty() && message.is_empty() {
                            None
                        } else {
                            Some(format!("{}:{}", title, message))
                        }
                    })
                    .unwrap_or_else(|| "unknown".to_string());

                tx.db.alerts().alert_key().insert_or_update(Alert {
                    alert_key: key,
                    alert_id: alert.n,
                    alert_type: alert.alert_type.clone(),
                    cause: alert.cause.clone(),
                    start_time: alert.debut.clone(),
                    end_time: alert.fin.clone(),
                    mode: alert.mode.clone(),
                    line_commercial_name: alert.ligne_com.clone(),
                    line_customer_name: alert.ligne_cli.clone(),
                    title: alert.titre.clone(),
                    message: alert.message.clone(),
                    last_update: alert.last_update_fme.clone(),
                    severity_type: alert.typeseverite.clone(),
                    severity_level: alert.niveauseverite,
                    object_type: alert.typeobjet.clone(),
                    object_list: alert.listeobjet.clone(),
                });
                count += 1;
            }
            count
        });
        rows_upserted += count;
    } else {
        errors.push("alerts: parse error".to_string());
    }

    if payload.stations.trim().is_empty() {
        errors.push("stations: empty payload".to_string());
    } else if let Ok(collection) = serde_json::from_str::<GeoFeatureCollection<StationProperties>>(&payload.stations) {
        let count = ctx.with_tx(|tx| {
            let mut count = 0u64;
            for feature in &collection.features {
                let coords = &feature.geometry.coordinates;
                let longitude = coords.get(0).copied();
                let latitude = coords.get(1).copied();
                tx.db.stations().id().insert_or_update(Station {
                    id: feature.id.clone(),
                    station_api_id: feature.properties.station_api_id,
                    station_id: feature.properties.station_api_id,
                    name: feature.properties.nom.clone(),
                    service_info: feature.properties.desserte.clone(),
                    last_update: feature.properties.last_update.clone(),
                    longitude,
                    latitude,
                });
                count += 1;
            }
            count
        });
        rows_upserted += count;
    } else {
        errors.push("stations: parse error".to_string());
    }

    if payload.stops.trim().is_empty() {
        errors.push("stops: empty payload".to_string());
    } else if let Ok(collection) = serde_json::from_str::<GeoFeatureCollection<StopProperties>>(&payload.stops) {
        let count = ctx.with_tx(|tx| {
            let mut count = 0u64;
            for feature in &collection.features {
                let coords = &feature.geometry.coordinates;
                let longitude = coords.get(0).copied();
                let latitude = coords.get(1).copied();
                let gtfs_stop_id = feature.id.split('.').last().map(|s| s.to_string());

                tx.db.stops().id().insert_or_update(Stop {
                    id: feature.id.clone(),
                    name: feature.properties.nom.clone(),
                    service_info: feature.properties.desserte.clone(),
                    pmr_accessible: feature.properties.pmr,
                    has_elevator: feature.properties.ascenseur,
                    has_escalator: feature.properties.escalier,
                    last_update: feature.properties.last_update.clone(),
                    address: feature.properties.adresse.clone(),
                    municipality: feature.properties.commune.clone(),
                    latitude,
                    longitude,
                    zone: feature.properties.zone.clone(),
                    gtfs_stop_id,
                });
                count += 1;
            }
            count
        });
        rows_upserted += count;
    } else {
        errors.push("stops: parse error".to_string());
    }

    if payload.lines_bus.trim().is_empty() {
        errors.push("lines_bus: empty payload".to_string());
    } else {
        rows_upserted += ingest_lines_from_json(ctx, &payload.lines_bus, "bus");
    }
    if payload.lines_metro.trim().is_empty() {
        errors.push("lines_metro: empty payload".to_string());
    } else {
        rows_upserted += ingest_lines_from_json(ctx, &payload.lines_metro, "metro");
    }
    if payload.lines_tram.trim().is_empty() {
        errors.push("lines_tram: empty payload".to_string());
    } else {
        rows_upserted += ingest_lines_from_json(ctx, &payload.lines_tram, "tram");
    }
    if payload.lines_rhonexpress.trim().is_empty() {
        errors.push("lines_rhonexpress: empty payload".to_string());
    } else {
        rows_upserted += ingest_lines_from_json(ctx, &payload.lines_rhonexpress, "rhonexpress");
    }

    if payload.pricing_zones.trim().is_empty() {
        errors.push("pricing_zones: empty payload".to_string());
    } else {
        let now = ctx.timestamp;
        let body_clone = payload.pricing_zones.clone();
        let count = ctx.with_tx(|tx| {
            tx.db.pricing_zones().id().insert_or_update(PricingZones {
                id: 1,
                geojson: body_clone.clone(),
                last_update: now,
            });
            1u64
        });
        rows_upserted += count;
    }

    ingest_line_icons(ctx);

    if errors.is_empty() {
        record_ingestion_run(ctx, "ingest_static_payload", started, ctx.timestamp, "success", rows_upserted, None);
    } else {
        let status = if rows_upserted > 0 { "partial" } else { "error" };
        record_ingestion_run(ctx, "ingest_static_payload", started, ctx.timestamp, status, rows_upserted, Some(errors.join(" | ")));
    }
}

#[procedure]
fn ingest_gtfs(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    let started = ctx.timestamp;
    let config = ctx.with_tx(|tx| tx.db.config().iter().next());
    let gtfs_url = config.and_then(|cfg| cfg.gtfs_zip_url);

    let Some(url) = gtfs_url else {
        record_ingestion_run(ctx, "ingest_gtfs", started, ctx.timestamp, "skipped", 0, Some("GTFS URL not set".to_string()));
        return;
    };

    let zip_bytes = match http_get_bytes(ctx, &url, None) {
        Ok(bytes) => bytes,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_gtfs", started, ctx.timestamp, "error", 0, Some(err));
            return;
        }
    };

    let mut rows_upserted = 0u64;
    if let Ok(mut archive) = zip::ZipArchive::new(std::io::Cursor::new(zip_bytes)) {
        ctx.with_tx(|tx| {
            clear_gtfs_tables(tx);
        });

        for i in 0..archive.len() {
            if let Ok(mut file) = archive.by_index(i) {
                let name = file.name().to_string();
                if !name.ends_with(".txt") {
                    continue;
                }
                let mut contents = String::new();
                if std::io::Read::read_to_string(&mut file, &mut contents).is_ok() {
                    rows_upserted += ingest_gtfs_file(ctx, &name, &contents);
                }
            }
        }
    }

    record_ingestion_run(ctx, "ingest_gtfs", started, ctx.timestamp, "success", rows_upserted, None);
}

#[procedure]
fn purge_realtime(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    let retention = TimeDuration::from_duration(Duration::from_secs(30 * 60));
    let cutoff = ctx.timestamp - retention;

    ctx.with_tx(|tx| {
        let vehicles: Vec<_> = tx.db.vehicle_positions_current().iter().collect();
        for row in vehicles {
            if row.recorded_at_time < cutoff {
                tx.db.vehicle_positions_current().vehicle_ref().delete(&row.vehicle_ref);
            }
        }

        let journeys: Vec<_> = tx.db.estimated_vehicle_journeys_current().iter().collect();
        for row in journeys {
            if row.recorded_at_time < cutoff {
                tx.db.estimated_vehicle_journeys_current()
                    .dated_vehicle_journey_ref()
                    .delete(&row.dated_vehicle_journey_ref);
            }
        }

        let calls: Vec<_> = tx.db.estimated_calls_current().iter().collect();
        for row in calls {
            if row.recorded_at_time < cutoff {
                tx.db.estimated_calls_current().call_id().delete(&row.call_id);
            }
        }
    });
}

#[derive(spacetimedb::SpacetimeType)]
pub struct JourneyRequest {
    from_lat: f64,
    from_lng: f64,
    to_lat: f64,
    to_lng: f64,
    datetime: String,
    is_arrival_time: bool,
    transport_modes: String,
    walk: String,
    bike: Option<String>,
    pmr: bool,
    car: bool,
    data_freshness: String,
}

#[procedure]
fn calculate_journey(ctx: &mut ProcedureContext, req: JourneyRequest) -> String {
    let primary_url = build_tcl_journeys_url(&req, true);
    match http_get_tcl_journeys(ctx, &primary_url) {
        Ok(body) => normalize_journeys_response(&body),
        Err(err) => {
            // TCL endpoint can intermittently return HTTP 500 with full payload.
            // Retry once with a simplified payload to keep UX stable.
            if err.contains("HTTP 500") {
                let fallback_url = build_tcl_journeys_url(&req, false);
                match http_get_tcl_journeys(ctx, &fallback_url) {
                    Ok(body) => normalize_journeys_response(&body),
                    Err(fallback_err) => json!({ "ok": false, "err": fallback_err }).to_string(),
                }
            } else {
                json!({ "ok": false, "err": err }).to_string()
            }
        }
    }
}

fn build_tcl_journeys_url(req: &JourneyRequest, include_all_options: bool) -> String {
    let mut params = Vec::new();
    params.push(("from", format!("{{\"lat\":{},\"lng\":{}}}", req.from_lat, req.from_lng)));
    params.push(("to", format!("{{\"lat\":{},\"lng\":{}}}", req.to_lat, req.to_lng)));
    params.push(("datetime", req.datetime.clone()));
    params.push(("fromType", "address".to_string()));
    params.push(("toType", "address".to_string()));
    params.push(("isArrivalTime", if req.is_arrival_time { "1" } else { "0" }.to_string()));
    params.push(("transportModes", req.transport_modes.clone()));
    params.push(("walk", req.walk.clone()));
    params.push(("pmr", if req.pmr { "1" } else { "0" }.to_string()));
    params.push(("language", "fr".to_string()));
    params.push(("algorithm", "FASTEST".to_string()));

    // Fallback mode avoids options known to trigger occasional upstream 500.
    let car_flag = if include_all_options && req.car { "1" } else { "0" };
    let freshness = if include_all_options { req.data_freshness.clone() } else { "0".to_string() };
    params.push(("car", car_flag.to_string()));
    params.push(("dataFreshness", freshness));

    if include_all_options {
        if let Some(bike) = req.bike.clone() {
            params.push(("bike", bike));
        }
    }

    let query = params
        .into_iter()
        .map(|(k, v)| format!("{}={}", k, urlencoding::encode(&v)))
        .collect::<Vec<_>>()
        .join("&");

    format!("https://carte-interactive.tcl.fr/api/interface/tcl/journeys?{}", query)
}

fn http_get_tcl_journeys(ctx: &mut ProcedureContext, url: &str) -> Result<String, String> {
    let request = Request::builder()
        .method("GET")
        .uri(url)
        .header("User-Agent", "lyon-transit-viewer/1.0 (+spacetimedb)")
        .header("Accept", "*/*")
        .header("x-cache-options", "default")
        .header("x-csrf", "1")
        .body(Body::empty())
        .map_err(|e| e.to_string())?;
    let response = ctx.http.send(request).map_err(|e| e.to_string())?;
    let (parts, body) = response.into_parts();
    if !parts.status.is_success() {
        return Err(format!("HTTP {}", parts.status));
    }
    Ok(body.into_string_lossy())
}

fn normalize_journeys_response(body: &str) -> String {
    let parsed: Result<Value, _> = serde_json::from_str(body);
    let value = match parsed {
        Ok(v) => v,
        Err(err) => {
            return json!({
                "ok": false,
                "err": format!("invalid journeys JSON: {}", err),
            })
            .to_string()
        }
    };

    if let Some(data) = value.get("data") {
        return json!({ "ok": true, "data": data }).to_string();
    }
    if value.get("journeys").is_some() {
        return json!({ "ok": true, "data": value }).to_string();
    }

    json!({
        "ok": false,
        "err": "journeys payload missing",
        "data": value
    })
    .to_string()
}

fn http_get(ctx: &mut ProcedureContext, url: &str, token: Option<&String>) -> Result<String, String> {
    let mut builder = Request::builder()
        .method("GET")
        .uri(url)
        .header("User-Agent", "lyon-transit-viewer/1.0 (+spacetimedb)")
        .header("Accept", "application/json,text/plain,*/*");
    if let Some(token) = token {
        builder = builder.header("Authorization", format!("Basic {}", token));
    }
    let request = builder.body(Body::empty()).map_err(|e| e.to_string())?;
    let response = ctx.http.send(request).map_err(|e| e.to_string())?;
    let (parts, body) = response.into_parts();
    if !parts.status.is_success() {
        return Err(format!("HTTP {}", parts.status));
    }
    Ok(body.into_string_lossy())
}

fn http_get_bytes(ctx: &mut ProcedureContext, url: &str, token: Option<&String>) -> Result<Vec<u8>, String> {
    let mut builder = Request::builder().method("GET").uri(url);
    if let Some(token) = token {
        builder = builder.header("Authorization", format!("Basic {}", token));
    }
    let request = builder.body(Body::empty()).map_err(|e| e.to_string())?;
    let response = ctx.http.send(request).map_err(|e| e.to_string())?;
    let (parts, body) = response.into_parts();
    if !parts.status.is_success() {
        return Err(format!("HTTP {}", parts.status));
    }
    Ok(body.into_bytes().to_vec())
}

fn record_ingestion_run(
    ctx: &mut ProcedureContext,
    job_name: &str,
    started_at: Timestamp,
    ended_at: Timestamp,
    status: &str,
    rows_upserted: u64,
    error: Option<String>,
) {
    let error_clone = error.clone();
    ctx.with_tx(|tx| {
        tx.db.ingestion_runs().insert(IngestionRun {
            id: 0,
            job_name: job_name.to_string(),
            started_at,
            ended_at,
            status: status.to_string(),
            rows_upserted,
            error: error_clone.clone(),
        });
    });
}

fn ingest_line_icons(ctx: &mut ProcedureContext) {
    let csv_content = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../backend/Liste_pictogrammes_lignes.csv"));
    ctx.with_tx(|tx| {
        for (idx, line) in csv_content.lines().enumerate() {
            if idx == 0 || line.trim().is_empty() {
                continue;
            }
            let parts: Vec<&str> = line.split(';').collect();
            if parts.len() < 3 {
                continue;
            }
            let code_ligne = parts[0].trim().to_string();
            let picto_mode = parts[1].trim().to_string();
            let picto_ligne = parts[2].trim().replace(".svg", ".png");

            tx.db.line_icon_mapping().code_ligne().insert_or_update(LineIconMapping {
                code_ligne,
                picto_mode: Some(picto_mode),
                picto_ligne: Some(picto_ligne),
                picto_complet: None,
            });
        }
    });
}

fn ingest_lines_from_json(ctx: &mut ProcedureContext, body: &str, category: &str) -> u64 {
    if let Ok(collection) = serde_json::from_str::<GeoFeatureCollectionAnyGeom<LineProperties>>(body) {
        let count = ctx.with_tx(|tx| {
            let mut count = 0u64;
            for feature in &collection.features {
                let geometry_json = serde_json::to_string(&feature.geometry).ok();
                let color = feature
                    .properties
                    .couleur
                    .as_ref()
                    .map(|c| format!("rgb({})", c.split(' ').collect::<Vec<_>>().join(", ")));

                let mut final_category = category.to_string();
                if let Some(line_code) = feature.properties.ligne.as_ref() {
                    if line_code.starts_with('F') {
                        final_category = "funicular".to_string();
                    }
                }

                tx.db.lines().id().insert_or_update(Line {
                    id: feature.id.clone(),
                    line_name: feature.properties.nom_trace.clone(),
                    trace_code: geometry_json,
                    line_code: feature.properties.code_ligne.clone(),
                    trace_type: feature.properties.type_trace.clone(),
                    trace_name: feature.properties.nom_trace.clone(),
                    direction: feature.properties.sens.clone(),
                    origin_id: feature.properties.origine.clone(),
                    destination_id: feature.properties.destination.clone(),
                    origin_name: feature.properties.nom_origine.clone(),
                    destination_name: feature.properties.nom_destination.clone(),
                    transport_family: feature.properties.famille_transport.clone(),
                    start_date: feature.properties.date_debut.clone(),
                    end_date: feature.properties.date_fin.clone(),
                    line_type_code: feature.properties.code_type_ligne.clone(),
                    line_type_name: feature.properties.nom_type_ligne.clone(),
                    pmr_accessible: feature.properties.pmr,
                    line_sort_code: feature.properties.ligne.clone(),
                    version_name: feature.properties.nom_version.clone(),
                    last_update: feature.properties.last_update.clone(),
                    category: Some(final_category),
                    color,
                });
                count += 1;
            }
            count
        });
        return count;
    }
    0
}

fn extract_line_sort_code(line_ref: &str) -> Option<String> {
    if let Some(idx) = line_ref.find("::") {
        let rest = &line_ref[idx + 2..];
        return rest.split(':').next().map(|s| s.to_string());
    }
    None
}

fn clear_gtfs_tables(tx: &spacetimedb::TxContext) {
    for row in tx.db.gtfs_agency().iter() {
        tx.db.gtfs_agency().agency_id().delete(&row.agency_id);
    }
    for row in tx.db.gtfs_calendar().iter() {
        tx.db.gtfs_calendar().service_id().delete(&row.service_id);
    }
    for row in tx.db.gtfs_calendar_dates().iter() {
        tx.db.gtfs_calendar_dates().calendar_date_id().delete(&row.calendar_date_id);
    }
    for row in tx.db.gtfs_routes().iter() {
        tx.db.gtfs_routes().route_id().delete(&row.route_id);
    }
    for row in tx.db.gtfs_trips().iter() {
        tx.db.gtfs_trips().trip_id().delete(&row.trip_id);
    }
    for row in tx.db.gtfs_stop_times().iter() {
        tx.db.gtfs_stop_times().stop_time_id().delete(&row.stop_time_id);
    }
    for row in tx.db.gtfs_stops().iter() {
        tx.db.gtfs_stops().stop_id().delete(&row.stop_id);
    }
    for row in tx.db.gtfs_shapes().iter() {
        tx.db.gtfs_shapes().shape_point_id().delete(&row.shape_point_id);
    }
    for row in tx.db.gtfs_transfers().iter() {
        tx.db.gtfs_transfers().transfer_id().delete(&row.transfer_id);
    }
    for row in tx.db.gtfs_feed_info().iter() {
        tx.db.gtfs_feed_info().feed_id().delete(&row.feed_id);
    }
}

fn ingest_gtfs_file(ctx: &mut ProcedureContext, name: &str, contents: &str) -> u64 {
    let mut reader = csv::ReaderBuilder::new().has_headers(true).from_reader(contents.as_bytes());
    let headers = reader.headers().map(|h| h.clone()).unwrap_or_default();
    let records: Vec<csv::StringRecord> = reader.records().filter_map(Result::ok).collect();

    let count = ctx.with_tx(|tx| {
        let mut count = 0u64;
        for record in &records {
            match name {
                "agency.txt" => {
                    let agency_id = get_field(&headers, &record, "agency_id").unwrap_or_default();
                    if agency_id.is_empty() {
                        continue;
                    }
                    tx.db.gtfs_agency().agency_id().insert_or_update(GtfsAgency {
                        agency_id,
                        agency_name: get_field(&headers, &record, "agency_name"),
                        agency_url: get_field(&headers, &record, "agency_url"),
                        agency_timezone: get_field(&headers, &record, "agency_timezone"),
                        agency_lang: get_field(&headers, &record, "agency_lang"),
                        agency_phone: get_field(&headers, &record, "agency_phone"),
                        agency_fare_url: get_field(&headers, &record, "agency_fare_url"),
                        agency_email: get_field(&headers, &record, "agency_email"),
                    });
                    count += 1;
                }
                "calendar.txt" => {
                    let service_id = get_field(&headers, &record, "service_id").unwrap_or_default();
                    if service_id.is_empty() {
                        continue;
                    }
                    tx.db.gtfs_calendar().service_id().insert_or_update(GtfsCalendar {
                        service_id,
                        monday: get_field(&headers, &record, "monday"),
                        tuesday: get_field(&headers, &record, "tuesday"),
                        wednesday: get_field(&headers, &record, "wednesday"),
                        thursday: get_field(&headers, &record, "thursday"),
                        friday: get_field(&headers, &record, "friday"),
                        saturday: get_field(&headers, &record, "saturday"),
                        sunday: get_field(&headers, &record, "sunday"),
                        start_date: get_field(&headers, &record, "start_date"),
                        end_date: get_field(&headers, &record, "end_date"),
                    });
                    count += 1;
                }
                "calendar_dates.txt" => {
                    let service_id = get_field(&headers, &record, "service_id").unwrap_or_default();
                    let date = get_field(&headers, &record, "date").unwrap_or_default();
                    if service_id.is_empty() || date.is_empty() {
                        continue;
                    }
                    let calendar_date_id = format!("{}:{}", service_id, date);
                    tx.db.gtfs_calendar_dates().calendar_date_id().insert_or_update(GtfsCalendarDate {
                        calendar_date_id,
                        service_id: Some(service_id),
                        date: Some(date),
                        exception_type: get_field(&headers, &record, "exception_type"),
                    });
                    count += 1;
                }
                "routes.txt" => {
                    let route_id = get_field(&headers, &record, "route_id").unwrap_or_default();
                    if route_id.is_empty() {
                        continue;
                    }
                    tx.db.gtfs_routes().route_id().insert_or_update(GtfsRoute {
                        route_id,
                        agency_id: get_field(&headers, &record, "agency_id"),
                        route_short_name: get_field(&headers, &record, "route_short_name"),
                        route_long_name: get_field(&headers, &record, "route_long_name"),
                        route_desc: get_field(&headers, &record, "route_desc"),
                        route_type: get_field(&headers, &record, "route_type"),
                        route_url: get_field(&headers, &record, "route_url"),
                        route_color: get_field(&headers, &record, "route_color"),
                        route_text_color: get_field(&headers, &record, "route_text_color"),
                        route_sort_order: get_field(&headers, &record, "route_sort_order"),
                    });
                    count += 1;
                }
                "trips.txt" => {
                    let trip_id = get_field(&headers, &record, "trip_id").unwrap_or_default();
                    if trip_id.is_empty() {
                        continue;
                    }
                    tx.db.gtfs_trips().trip_id().insert_or_update(GtfsTrip {
                        trip_id,
                        route_id: get_field(&headers, &record, "route_id"),
                        service_id: get_field(&headers, &record, "service_id"),
                        trip_headsign: get_field(&headers, &record, "trip_headsign"),
                        trip_short_name: get_field(&headers, &record, "trip_short_name"),
                        direction_id: get_field(&headers, &record, "direction_id"),
                        block_id: get_field(&headers, &record, "block_id"),
                        shape_id: get_field(&headers, &record, "shape_id"),
                        wheelchair_accessible: get_field(&headers, &record, "wheelchair_accessible"),
                        bikes_allowed: get_field(&headers, &record, "bikes_allowed"),
                    });
                    count += 1;
                }
                "stop_times.txt" => {
                    let trip_id = get_field(&headers, &record, "trip_id").unwrap_or_default();
                    let stop_sequence = get_field(&headers, &record, "stop_sequence").unwrap_or_default();
                    if trip_id.is_empty() || stop_sequence.is_empty() {
                        continue;
                    }
                    let stop_time_id = format!("{}:{}", trip_id, stop_sequence);
                    tx.db.gtfs_stop_times().stop_time_id().insert_or_update(GtfsStopTime {
                        stop_time_id,
                        trip_id: Some(trip_id),
                        arrival_time: get_field(&headers, &record, "arrival_time"),
                        departure_time: get_field(&headers, &record, "departure_time"),
                        stop_id: get_field(&headers, &record, "stop_id"),
                        stop_sequence: Some(stop_sequence),
                        stop_headsign: get_field(&headers, &record, "stop_headsign"),
                        pickup_type: get_field(&headers, &record, "pickup_type"),
                        drop_off_type: get_field(&headers, &record, "drop_off_type"),
                        shape_dist_traveled: get_field(&headers, &record, "shape_dist_traveled"),
                        timepoint: get_field(&headers, &record, "timepoint"),
                    });
                    count += 1;
                }
                "stops.txt" => {
                    let stop_id = get_field(&headers, &record, "stop_id").unwrap_or_default();
                    if stop_id.is_empty() {
                        continue;
                    }
                    tx.db.gtfs_stops().stop_id().insert_or_update(GtfsStop {
                        stop_id,
                        stop_code: get_field(&headers, &record, "stop_code"),
                        stop_name: get_field(&headers, &record, "stop_name"),
                        stop_desc: get_field(&headers, &record, "stop_desc"),
                        stop_lat: get_field(&headers, &record, "stop_lat"),
                        stop_lon: get_field(&headers, &record, "stop_lon"),
                        zone_id: get_field(&headers, &record, "zone_id"),
                        stop_url: get_field(&headers, &record, "stop_url"),
                        location_type: get_field(&headers, &record, "location_type"),
                        parent_station: get_field(&headers, &record, "parent_station"),
                        stop_timezone: get_field(&headers, &record, "stop_timezone"),
                        wheelchair_boarding: get_field(&headers, &record, "wheelchair_boarding"),
                        level_id: get_field(&headers, &record, "level_id"),
                        platform_code: get_field(&headers, &record, "platform_code"),
                    });
                    count += 1;
                }
                "shapes.txt" => {
                    let shape_id = get_field(&headers, &record, "shape_id").unwrap_or_default();
                    let sequence = get_field(&headers, &record, "shape_pt_sequence").unwrap_or_default();
                    if shape_id.is_empty() || sequence.is_empty() {
                        continue;
                    }
                    let shape_point_id = format!("{}:{}", shape_id, sequence);
                    tx.db.gtfs_shapes().shape_point_id().insert_or_update(GtfsShape {
                        shape_point_id,
                        shape_id: Some(shape_id),
                        shape_pt_lat: get_field(&headers, &record, "shape_pt_lat"),
                        shape_pt_lon: get_field(&headers, &record, "shape_pt_lon"),
                        shape_pt_sequence: Some(sequence),
                        shape_dist_traveled: get_field(&headers, &record, "shape_dist_traveled"),
                    });
                    count += 1;
                }
                "transfers.txt" => {
                    let from_stop_id = get_field(&headers, &record, "from_stop_id").unwrap_or_default();
                    let to_stop_id = get_field(&headers, &record, "to_stop_id").unwrap_or_default();
                    if from_stop_id.is_empty() || to_stop_id.is_empty() {
                        continue;
                    }
                    let transfer_id = format!("{}:{}", from_stop_id, to_stop_id);
                    tx.db.gtfs_transfers().transfer_id().insert_or_update(GtfsTransfer {
                        transfer_id,
                        from_stop_id: Some(from_stop_id),
                        to_stop_id: Some(to_stop_id),
                        transfer_type: get_field(&headers, &record, "transfer_type"),
                        min_transfer_time: get_field(&headers, &record, "min_transfer_time"),
                    });
                    count += 1;
                }
                "feed_info.txt" => {
                    tx.db.gtfs_feed_info().feed_id().insert_or_update(GtfsFeedInfo {
                        feed_id: 0,
                        feed_publisher_name: get_field(&headers, &record, "feed_publisher_name"),
                        feed_publisher_url: get_field(&headers, &record, "feed_publisher_url"),
                        feed_lang: get_field(&headers, &record, "feed_lang"),
                        feed_start_date: get_field(&headers, &record, "feed_start_date"),
                        feed_end_date: get_field(&headers, &record, "feed_end_date"),
                        feed_version: get_field(&headers, &record, "feed_version"),
                    });
                    count += 1;
                }
                _ => {}
            }
        }
        count
    });

    count
}

fn get_field(headers: &csv::StringRecord, record: &csv::StringRecord, key: &str) -> Option<String> {
    headers
        .iter()
        .position(|h| h == key)
        .and_then(|idx| record.get(idx))
        .map(|v| v.to_string())
}

#[derive(Deserialize)]
struct AlertsResponse {
    values: Vec<AlertRecord>,
}

#[derive(Deserialize)]
struct AlertRecord {
    #[serde(rename = "n")]
    n: Option<i64>,
    #[serde(rename = "type")]
    alert_type: Option<String>,
    cause: Option<String>,
    debut: Option<String>,
    fin: Option<String>,
    mode: Option<String>,
    ligne_com: Option<String>,
    ligne_cli: Option<String>,
    titre: Option<String>,
    message: Option<String>,
    last_update_fme: Option<String>,
    niveauseverite: Option<i64>,
    typeseverite: Option<String>,
    typeobjet: Option<String>,
    listeobjet: Option<String>,
}

#[derive(Deserialize)]
struct GeoFeatureCollection<T> {
    features: Vec<GeoFeature<T>>,
}

#[derive(Deserialize)]
struct GeoFeature<T> {
    id: String,
    properties: T,
    geometry: GeoGeometry,
}

#[derive(Deserialize)]
struct GeoFeatureCollectionAnyGeom<T> {
    features: Vec<GeoFeatureAnyGeom<T>>,
}

#[derive(Deserialize)]
struct GeoFeatureAnyGeom<T> {
    id: String,
    properties: T,
    geometry: serde_json::Value,
}

#[derive(Deserialize, serde::Serialize)]
struct GeoGeometry {
    coordinates: Vec<f64>,
}

#[derive(Deserialize)]
struct StationProperties {
    station_api_id: Option<i64>,
    nom: Option<String>,
    desserte: Option<String>,
    last_update: Option<String>,
}

#[derive(Deserialize)]
struct StopProperties {
    nom: Option<String>,
    desserte: Option<String>,
    pmr: Option<bool>,
    ascenseur: Option<bool>,
    escalier: Option<bool>,
    last_update: Option<String>,
    adresse: Option<String>,
    commune: Option<String>,
    zone: Option<String>,
}

#[derive(Deserialize)]
struct LineProperties {
    code_ligne: Option<String>,
    nom_trace: Option<String>,
    ligne: Option<String>,
    last_update: Option<String>,
    couleur: Option<String>,
    type_trace: Option<String>,
    sens: Option<String>,
    origine: Option<String>,
    destination: Option<String>,
    nom_origine: Option<String>,
    nom_destination: Option<String>,
    famille_transport: Option<String>,
    date_debut: Option<String>,
    date_fin: Option<String>,
    code_type_ligne: Option<String>,
    nom_type_ligne: Option<String>,
    pmr: Option<bool>,
    nom_version: Option<String>,
}

#[derive(Deserialize)]
struct SiriVehicleMonitoringResponse {
    #[serde(rename = "Siri")]
    siri: Option<SiriService>,
}

#[derive(Deserialize)]
struct SiriEstimatedTimetablesResponse {
    #[serde(rename = "Siri")]
    siri: Option<SiriService>,
}

#[derive(Deserialize)]
struct SiriService {
    #[serde(rename = "ServiceDelivery")]
    service_delivery: Option<SiriServiceDelivery>,
}

#[derive(Deserialize)]
struct SiriServiceDelivery {
    #[serde(rename = "VehicleMonitoringDelivery")]
    vehicle_monitoring_delivery: Option<Vec<SiriVehicleMonitoringDelivery>>,
    #[serde(rename = "EstimatedTimetableDelivery")]
    estimated_timetable_delivery: Option<Vec<SiriEstimatedTimetableDelivery>>,
}

#[derive(Deserialize)]
struct SiriVehicleMonitoringDelivery {
    #[serde(rename = "VehicleActivity")]
    vehicle_activity: Option<Vec<SiriVehicleActivity>>,
}

#[derive(Deserialize)]
struct SiriEstimatedTimetableDelivery {
    #[serde(rename = "EstimatedJourneyVersionFrame")]
    estimated_journey_version_frame: Option<Vec<SiriEstimatedJourneyFrame>>,
}

#[derive(Deserialize)]
struct SiriEstimatedJourneyFrame {
    #[serde(rename = "EstimatedVehicleJourney")]
    estimated_vehicle_journey: Option<Vec<SiriEstimatedVehicleJourney>>,
}

#[derive(Deserialize)]
struct SiriValue {
    value: Option<String>,
}

#[derive(Deserialize)]
struct SiriVehicleActivity {
    #[serde(rename = "RecordedAtTime")]
    recorded_at_time: Option<String>,
    #[serde(rename = "ValidUntilTime")]
    valid_until_time: Option<String>,
    #[serde(rename = "MonitoredVehicleJourney")]
    monitored_vehicle_journey: SiriMonitoredVehicleJourney,
}

#[derive(Deserialize)]
struct SiriMonitoredVehicleJourney {
    #[serde(rename = "LineRef")]
    line_ref: Option<SiriValue>,
    #[serde(rename = "DirectionRef")]
    direction_ref: Option<SiriValue>,
    #[serde(rename = "FramedVehicleJourneyRef")]
    framed_vehicle_journey_ref: Option<SiriFramedVehicleJourneyRef>,
    #[serde(rename = "PublishedLineName")]
    published_line_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "DirectionName")]
    direction_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "OperatorRef")]
    operator_ref: Option<SiriValue>,
    #[serde(rename = "DestinationRef")]
    destination_ref: Option<SiriValue>,
    #[serde(rename = "DestinationName")]
    destination_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "VehicleLocation")]
    vehicle_location: Option<SiriVehicleLocation>,
    #[serde(rename = "Bearing")]
    bearing: Option<f64>,
    #[serde(rename = "Delay")]
    delay: Option<String>,
    #[serde(rename = "VehicleRef")]
    vehicle_ref: Option<SiriValue>,
    #[serde(rename = "MonitoredCall")]
    monitored_call: Option<SiriMonitoredCall>,
}

#[derive(Deserialize)]
struct SiriFramedVehicleJourneyRef {
    #[serde(rename = "DatedVehicleJourneyRef")]
    dated_vehicle_journey_ref: Option<String>,
}

#[derive(Deserialize)]
struct SiriVehicleLocation {
    #[serde(rename = "Longitude")]
    longitude: Option<f64>,
    #[serde(rename = "Latitude")]
    latitude: Option<f64>,
}

#[derive(Deserialize)]
struct SiriMonitoredCall {
    #[serde(rename = "StopPointRef")]
    stop_point_ref: Option<SiriValue>,
    #[serde(rename = "StopPointName")]
    stop_point_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "AimedArrivalTime")]
    aimed_arrival_time: Option<String>,
    #[serde(rename = "ExpectedArrivalTime")]
    expected_arrival_time: Option<String>,
    #[serde(rename = "AimedDepartureTime")]
    aimed_departure_time: Option<String>,
    #[serde(rename = "ExpectedDepartureTime")]
    expected_departure_time: Option<String>,
    #[serde(rename = "DistanceFromStop")]
    distance_from_stop: Option<i64>,
    #[serde(rename = "Order")]
    order: Option<i64>,
}

#[derive(Deserialize)]
struct SiriEstimatedVehicleJourney {
    #[serde(rename = "LineRef")]
    LineRef: Option<SiriValue>,
    #[serde(rename = "DirectionRef")]
    DirectionRef: Option<SiriValue>,
    #[serde(rename = "DatedVehicleJourneyRef")]
    DatedVehicleJourneyRef: Option<SiriValue>,
    #[serde(rename = "FramedVehicleJourneyRef")]
    FramedVehicleJourneyRef: Option<SiriFramedVehicleJourneyRef>,
    #[serde(rename = "DestinationRef")]
    DestinationRef: Option<SiriValue>,
    #[serde(rename = "EstimatedCalls")]
    EstimatedCalls: Option<SiriEstimatedCalls>,
}

#[derive(Deserialize)]
struct SiriEstimatedCalls {
    #[serde(rename = "EstimatedCall")]
    EstimatedCall: Option<Vec<SiriEstimatedCall>>,
}

#[derive(Deserialize)]
struct SiriEstimatedCall {
    #[serde(rename = "StopPointRef")]
    StopPointRef: Option<SiriValue>,
    #[serde(rename = "Order")]
    Order: Option<i64>,
    #[serde(rename = "AimedArrivalTime")]
    AimedArrivalTime: Option<String>,
    #[serde(rename = "ExpectedArrivalTime")]
    ExpectedArrivalTime: Option<String>,
    #[serde(rename = "AimedDepartureTime")]
    AimedDepartureTime: Option<String>,
    #[serde(rename = "ExpectedDepartureTime")]
    ExpectedDepartureTime: Option<String>,
}

fn extract_vehicle_activities(response: SiriVehicleMonitoringResponse) -> Option<Vec<SiriVehicleActivity>> {
    response
        .siri?
        .service_delivery?
        .vehicle_monitoring_delivery
        .and_then(|mut deliveries| deliveries.pop())
        .and_then(|delivery| delivery.vehicle_activity)
}

fn extract_estimated_journeys(response: SiriEstimatedTimetablesResponse) -> Option<Vec<SiriEstimatedVehicleJourney>> {
    response
        .siri?
        .service_delivery?
        .estimated_timetable_delivery
        .and_then(|mut deliveries| deliveries.pop())
        .and_then(|delivery| delivery.estimated_journey_version_frame)
        .and_then(|mut frames| frames.pop())
        .and_then(|frame| frame.estimated_vehicle_journey)
}

fn ingest_timetables_from_body(
    ctx: &mut ProcedureContext,
    body: &str,
    now: Timestamp,
) -> Result<u64, String> {
    let response = serde_json::from_str::<SiriEstimatedTimetablesResponse>(body)
        .map_err(|_| "invalid JSON".to_string())?;
    let journeys = extract_estimated_journeys(response).ok_or_else(|| "empty journeys".to_string())?;

    let count = ctx.with_tx(|tx| {
        let mut count = 0u64;
        for journey in &journeys {
            let journey_ref = journey
                .DatedVehicleJourneyRef
                .as_ref()
                .and_then(|v| v.value.clone())
                .or_else(|| journey.FramedVehicleJourneyRef.as_ref().and_then(|v| v.dated_vehicle_journey_ref.clone()));
            if journey_ref.is_none() {
                continue;
            }
            let journey_ref = journey_ref.unwrap();

            let line_ref = journey.LineRef.as_ref().and_then(|v| v.value.clone());
            let line_sort_code = line_ref.as_ref().and_then(|line| extract_line_sort_code(line));

            tx.db.estimated_vehicle_journeys_current()
                .dated_vehicle_journey_ref()
                .insert_or_update(EstimatedVehicleJourneyCurrent {
                    dated_vehicle_journey_ref: journey_ref.clone(),
                    recorded_at_time: now,
                    line_ref: line_ref.clone(),
                    direction_ref: journey.DirectionRef.as_ref().and_then(|v| v.value.clone()),
                    destination_ref: journey.DestinationRef.as_ref().and_then(|v| v.value.clone()),
                    line_sort_code,
                });

            if let Some(calls) = journey.EstimatedCalls.as_ref().and_then(|c| c.EstimatedCall.as_ref()) {
                for call in calls.iter() {
                    let stop_point_ref = call.StopPointRef.as_ref().and_then(|v| v.value.clone());
                    let stop_order = call.Order;
                    let call_id = format!("{}:{}", journey_ref, stop_order.unwrap_or(0));
                    let gtfs_stop_id = stop_point_ref.as_ref().and_then(|v| v.split(':').nth(3).map(|s| s.to_string()));

                    tx.db.estimated_calls_current()
                        .call_id()
                        .insert_or_update(EstimatedCallCurrent {
                            call_id,
                            recorded_at_time: now,
                            dated_vehicle_journey_ref: journey_ref.clone(),
                            stop_point_ref,
                            gtfs_stop_id,
                            stop_point_name: None,
                            aimed_arrival_time: call.AimedArrivalTime.clone(),
                            expected_arrival_time: call.ExpectedArrivalTime.clone().or(call.AimedArrivalTime.clone()),
                            aimed_departure_time: call.AimedDepartureTime.clone(),
                            expected_departure_time: call.ExpectedDepartureTime.clone(),
                            stop_order: call.Order.map(|v| v as i64),
                        });
                    count += 1;
                }
            }
        }
        count
    });

    Ok(count)
}

fn map_vehicle_activity(activity: &SiriVehicleActivity, timestamp: Timestamp) -> Option<VehiclePositionCurrent> {
    let vehicle_ref = activity.monitored_vehicle_journey.vehicle_ref.as_ref()?.value.clone()?;
    let journey = &activity.monitored_vehicle_journey;

    Some(VehiclePositionCurrent {
        vehicle_ref,
        recorded_at_time: timestamp,
        valid_until_time: activity.valid_until_time.clone(),
        line_ref: journey.line_ref.as_ref().and_then(|v| v.value.clone()),
        direction_ref: journey.direction_ref.as_ref().and_then(|v| v.value.clone()),
        dated_vehicle_journey_ref: journey
            .framed_vehicle_journey_ref
            .as_ref()
            .and_then(|v| v.dated_vehicle_journey_ref.clone()),
        published_line_name: journey
            .published_line_name
            .as_ref()
            .and_then(|v| v.get(0))
            .and_then(|v| v.value.clone()),
        direction_name: journey
            .direction_name
            .as_ref()
            .and_then(|v| v.get(0))
            .and_then(|v| v.value.clone()),
        operator_ref: journey.operator_ref.as_ref().and_then(|v| v.value.clone()),
        destination_ref: journey.destination_ref.as_ref().and_then(|v| v.value.clone()),
        destination_name: journey
            .destination_name
            .as_ref()
            .and_then(|v| v.get(0))
            .and_then(|v| v.value.clone()),
        longitude: journey.vehicle_location.as_ref().and_then(|v| v.longitude),
        latitude: journey.vehicle_location.as_ref().and_then(|v| v.latitude),
        bearing: journey.bearing,
        delay: journey.delay.clone(),
        stop_point_ref: journey.monitored_call.as_ref().and_then(|v| v.stop_point_ref.as_ref()).and_then(|v| v.value.clone()),
        stop_point_name: journey.monitored_call.as_ref().and_then(|v| v.stop_point_name.as_ref()).and_then(|v| v.get(0)).and_then(|v| v.value.clone()),
        aimed_arrival_time: journey.monitored_call.as_ref().and_then(|v| v.aimed_arrival_time.clone()),
        expected_arrival_time: journey.monitored_call.as_ref().and_then(|v| v.expected_arrival_time.clone()),
        aimed_departure_time: journey.monitored_call.as_ref().and_then(|v| v.aimed_departure_time.clone()),
        expected_departure_time: journey.monitored_call.as_ref().and_then(|v| v.expected_departure_time.clone()),
        distance_from_stop: journey.monitored_call.as_ref().and_then(|v| v.distance_from_stop),
        stop_order: journey.monitored_call.as_ref().and_then(|v| v.order),
    })
}
