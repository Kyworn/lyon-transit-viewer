use spacetimedb::{ProcedureContext, Table};

use crate::models::{
    gtfs_agency, gtfs_calendar, gtfs_calendar_dates, gtfs_routes, gtfs_trips, gtfs_stop_times,
    gtfs_stops, gtfs_shapes, gtfs_transfers, gtfs_feed_info,
    GtfsAgency, GtfsCalendar, GtfsCalendarDate, GtfsRoute, GtfsTrip, GtfsStopTime, GtfsStop,
    GtfsShape, GtfsTransfer, GtfsFeedInfo,
};

pub fn clear_gtfs_tables(tx: &spacetimedb::TxContext) {
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

pub fn ingest_gtfs_file(ctx: &mut ProcedureContext, name: &str, contents: &str) -> u64 {
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
