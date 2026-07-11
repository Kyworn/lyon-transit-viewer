use spacetimedb::{ProcedureContext, Table};

use crate::models::{
    config, alerts, stations, stops, lines, line_icon_mapping, pricing_zones, stop_ref_name_cache,
    Alert, IngestRequest, Line, LineIconMapping, PricingZones, Station, Stop, StaticPayload, StopRefNameCache,
};
use crate::serde_types::{
    AlertsResponse, GeoFeatureCollection, GeoFeatureCollectionAnyGeom, LineProperties,
    StationProperties, StopProperties,
};
use crate::http_utils::http_get;
use crate::procedures::record_ingestion_run;

pub fn ingest_line_icons(ctx: &mut ProcedureContext) {
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

pub fn ingest_lines_from_json(ctx: &mut ProcedureContext, body: &str, category: &str) -> u64 {
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
                if let Some(ref line_code) = feature.properties.ligne {
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

pub fn ingest_static(ctx: &mut ProcedureContext, req: IngestRequest) {
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
    } else {
        errors.push("alerts: fetch error".to_string());
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
    } else {
        errors.push("stations: fetch error".to_string());
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

                    let stop_name = feature.properties.nom.clone();
                    tx.db.stops().id().insert_or_update(Stop {
                        id: feature.id.clone(),
                        name: stop_name.clone(),
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
                        gtfs_stop_id: gtfs_stop_id.clone(),
                    });
                    // Seed SP ref → name cache using assumed mapping: TCL ID == SP number.
                    // Covers stops where TCL gtfs_stop_id matches the SIRI SP namespace.
                    if let Some(ref gid) = gtfs_stop_id {
                        let sp_ref = format!("ActIV:StopArea:SP:{}:SYTRAL", gid);
                        tx.db.stop_ref_name_cache().stop_ref().insert_or_update(StopRefNameCache {
                            stop_ref: sp_ref,
                            stop_name: stop_name.clone(),
                            recorded_at: spacetimedb::Timestamp::UNIX_EPOCH,
                        });
                    }
                    count += 1;
                }
                count
            });
            rows_upserted += count;
        } else {
            errors.push("stops: parse error".to_string());
        }
    } else {
        errors.push("stops: fetch error".to_string());
    }

    if let Ok(body) = lines_bus_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "bus");
    } else {
        errors.push("lines_bus: fetch error".to_string());
    }

    if let Ok(body) = lines_metro_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "metro");
    } else {
        errors.push("lines_metro: fetch error".to_string());
    }

    if let Ok(body) = lines_tram_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "tram");
    } else {
        errors.push("lines_tram: fetch error".to_string());
    }

    if let Ok(body) = lines_rhonexpress_json {
        rows_upserted += ingest_lines_from_json(ctx, &body, "rhonexpress");
    } else {
        errors.push("lines_rhonexpress: fetch error".to_string());
    }

    if let Ok(body) = pricing_zones_json {
        let now = ctx.timestamp;
        let count = ctx.with_tx(|tx| {
            tx.db.pricing_zones().id().insert_or_update(PricingZones {
                id: 1,
                geojson: body.clone(),
                last_update: now,
            });
            1u64
        });
        rows_upserted += count;
    } else {
        errors.push("pricing_zones: fetch error".to_string());
    }

    ingest_line_icons(ctx);

    if errors.is_empty() {
        record_ingestion_run(ctx, "ingest_static", started, ctx.timestamp, "success", rows_upserted, None);
    } else {
        let status = if rows_upserted > 0 { "partial" } else { "error" };
        record_ingestion_run(ctx, "ingest_static", started, ctx.timestamp, status, rows_upserted, Some(errors.join(" | ")));
    }
}

pub fn ingest_static_payload(ctx: &mut ProcedureContext, payload: StaticPayload) {
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
