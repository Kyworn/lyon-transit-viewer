use std::collections::HashSet;
use std::time::Duration;
use spacetimedb::{ProcedureContext, TimeDuration, Timestamp, Table};

use crate::models::{
    config, vehicle_positions_current, estimated_vehicle_journeys_current, estimated_calls_current,
    stop_ref_name_cache,
    EstimatedCallCurrent, EstimatedVehicleJourneyCurrent, IngestRequest,
    RealtimePayload, VehiclePositionCurrent,
};
use crate::serde_types::{
    SiriEstimatedTimetablesResponse, SiriVehicleActivity, SiriVehicleMonitoringResponse,
    SiriEstimatedVehicleJourney,
};
use crate::http_utils::http_get;
use crate::procedures::record_ingestion_run;

pub fn extract_line_sort_code(line_ref: &str) -> Option<String> {
    if let Some(idx) = line_ref.find("::") {
        let rest = &line_ref[idx + 2..];
        return rest.split(':').next().map(|s| s.to_string());
    }
    None
}

pub fn extract_vehicle_activities(response: SiriVehicleMonitoringResponse) -> Option<Vec<SiriVehicleActivity>> {
    response
        .siri?
        .service_delivery?
        .vehicle_monitoring_delivery
        .and_then(|mut deliveries| deliveries.pop())
        .and_then(|delivery| delivery.vehicle_activity)
}

pub fn extract_estimated_journeys(response: SiriEstimatedTimetablesResponse) -> Option<Vec<SiriEstimatedVehicleJourney>> {
    response
        .siri?
        .service_delivery?
        .estimated_timetable_delivery
        .and_then(|mut deliveries| deliveries.pop())
        .and_then(|delivery| delivery.estimated_journey_version_frame)
        .and_then(|mut frames| frames.pop())
        .and_then(|frame| frame.estimated_vehicle_journey)
}

pub fn map_vehicle_activity(activity: &SiriVehicleActivity, timestamp: Timestamp) -> Option<VehiclePositionCurrent> {
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
        velocity: journey.velocity,
        occupancy: journey.occupancy.clone(),
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

pub fn ingest_timetables_from_body(
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

            if let Some(ref calls) = journey.EstimatedCalls.as_ref().and_then(|c| c.EstimatedCall.as_ref()) {
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

pub fn ingest_realtime(ctx: &mut ProcedureContext, req: IngestRequest) {
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
        "ActIV:Line::T1:SYTRAL",
        "ActIV:Line::T2:SYTRAL",
        "ActIV:Line::T3:SYTRAL",
        "ActIV:Line::T4:SYTRAL",
        "ActIV:Line::T5:SYTRAL",
        "ActIV:Line::T6:SYTRAL",
        "ActIV:Line::T7:SYTRAL",
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
                let stop_point_name_opt = row.stop_point_name.clone();
                let expected_arrival_time_opt = row.expected_arrival_time.clone().or(row.aimed_arrival_time.clone());
                let stop_order_opt = row.stop_order;
                tx.db.vehicle_positions_current().vehicle_ref().insert_or_update(row);

                // Persist SP ref → stop name for cross-namespace ID resolution.
                if let Some(ref stop_ref) = stop_point_ref_opt {
                    tx.db.stop_ref_name_cache()
                        .stop_ref()
                        .insert_or_update(crate::models::StopRefNameCache {
                            stop_ref: stop_ref.clone(),
                            stop_name: stop_point_name_opt.clone(),
                            recorded_at: now,
                        });
                }

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
        for line_ref in active_line_refs.iter().take(256) {
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

pub fn ingest_realtime_payload(ctx: &mut ProcedureContext, payload: RealtimePayload) {
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

                    if let Some(ref calls) = journey.EstimatedCalls.as_ref().and_then(|c| c.EstimatedCall.as_ref()) {
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
