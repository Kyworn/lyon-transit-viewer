use serde_json::{json, Value};
use spacetimedb::{procedure, ProcedureContext, Timestamp, TimeDuration, Table};
use std::time::Duration;

use crate::models::{
    config, ingestion_runs, vehicle_positions_current, estimated_vehicle_journeys_current, estimated_calls_current,
    Config, ConfigUpdate, ConfigUpdatePlain, IngestRequest, IngestionRun, JourneyRequest,
    RealtimePayload, StaticPayload,
};
use crate::http_utils::{build_tcl_journeys_url, http_get_tcl_journeys, http_get_bytes};
use crate::ingestion::gtfs::{clear_gtfs_tables, ingest_gtfs_file};

#[procedure]
pub fn set_config(ctx: &mut ProcedureContext, update: ConfigUpdate) {
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
pub fn set_config_plain(ctx: &mut ProcedureContext, update: ConfigUpdatePlain) {
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
pub fn ingest_realtime(ctx: &mut ProcedureContext, req: IngestRequest) {
    crate::ingestion::realtime::ingest_realtime(ctx, req);
}

#[procedure]
pub fn ingest_realtime_payload(ctx: &mut ProcedureContext, payload: RealtimePayload) {
    crate::ingestion::realtime::ingest_realtime_payload(ctx, payload);
}

#[procedure]
pub fn ingest_static(ctx: &mut ProcedureContext, req: IngestRequest) {
    crate::ingestion::static_data::ingest_static(ctx, req);
}

#[procedure]
pub fn ingest_static_payload(ctx: &mut ProcedureContext, payload: StaticPayload) {
    crate::ingestion::static_data::ingest_static_payload(ctx, payload);
}

#[procedure]
pub fn ingest_gtfs(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    let started = ctx.timestamp;
    let config = ctx.with_tx(|tx| tx.db.config().iter().next());
    let gtfs_url = config.and_then(|cfg| cfg.gtfs_zip_url);

    let Some(url_str) = gtfs_url else {
        record_ingestion_run(ctx, "ingest_gtfs", started, ctx.timestamp, "skipped", 0, Some("GTFS URL not set".to_string()));
        return;
    };

    let zip_bytes = match http_get_bytes(ctx, &url_str, None) {
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
pub fn ingest_velov(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    crate::ingestion::mobility::ingest_velov(ctx);
}

#[procedure]
pub fn ingest_autopartage(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    crate::ingestion::mobility::ingest_autopartage(ctx);
}

#[procedure]
pub fn ingest_public_toilets(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    crate::ingestion::mobility::ingest_public_toilets(ctx);
}

#[procedure]
pub fn purge_realtime(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    // 60min retention. Frontend filters at 30min, so this gives a 30min safety
    // margin against races at the boundary.
    let retention = TimeDuration::from_duration(Duration::from_secs(60 * 60));
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

        // Drop calls whose journey no longer exists (orphans from cancelled trips).
        let live_journeys: std::collections::HashSet<String> = tx.db.estimated_vehicle_journeys_current()
            .iter()
            .map(|j| j.dated_vehicle_journey_ref)
            .collect();
        let calls: Vec<_> = tx.db.estimated_calls_current().iter().collect();
        for row in calls {
            if !live_journeys.contains(&row.dated_vehicle_journey_ref) {
                tx.db.estimated_calls_current().call_id().delete(&row.call_id);
            }
        }
    });
}

#[procedure]
pub fn purge_ingestion_runs(ctx: &mut ProcedureContext, req: IngestRequest) {
    let _ = req;
    // Keep 7 days of ingestion history; older runs are deleted.
    let retention = TimeDuration::from_duration(Duration::from_secs(7 * 24 * 60 * 60));
    let cutoff = ctx.timestamp - retention;

    ctx.with_tx(|tx| {
        let runs: Vec<_> = tx.db.ingestion_runs().iter().collect();
        for row in runs {
            if row.started_at < cutoff {
                tx.db.ingestion_runs().id().delete(&row.id);
            }
        }
    });
}

#[procedure]
pub fn calculate_journey(ctx: &mut ProcedureContext, req: JourneyRequest) -> String {
    let primary_url = build_tcl_journeys_url(&req, true);
    match http_get_tcl_journeys(ctx, &primary_url) {
        Ok(body) => normalize_journeys_response(&body),
        Err(err) => {
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

pub fn record_ingestion_run(
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
