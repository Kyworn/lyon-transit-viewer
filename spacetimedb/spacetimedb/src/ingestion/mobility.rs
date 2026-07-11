use serde::Deserialize;
use spacetimedb::{ProcedureContext, Table};

use crate::http_utils::http_get;
use crate::models::{autopartage_stations, public_toilets, velov_stations, AutopartageStation, PublicToilet, VelovStation};
use crate::procedures::record_ingestion_run;

const VELOV_URL: &str = "https://download.data.grandlyon.com/ws/rdata/jcd_jcdecaux.jcdvelov/all.json";
const AUTOPARTAGE_URL: &str =
    "https://download.data.grandlyon.com/ws/rdata/pvo_patrimoine_voirie.pvostationautopartage/all.json";
const TOILETS_URL: &str = "https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=adr_voie_lieu.adrtoilettepublique_latest&outputFormat=application/json;%20subtype=geojson&SRSNAME=EPSG:4171";

#[derive(Deserialize)]
struct GrandlyonEnvelope<T> {
    values: Vec<T>,
}

#[derive(Deserialize, Clone)]
struct VelovStandsInner {
    bikes: Option<i64>,
    #[serde(rename = "electricalBikes")]
    electrical_bikes: Option<i64>,
    #[serde(rename = "mechanicalBikes")]
    mechanical_bikes: Option<i64>,
}

#[derive(Deserialize, Clone)]
struct VelovStands {
    availabilities: Option<VelovStandsInner>,
}

#[derive(Deserialize, Clone)]
struct VelovRow {
    number: i64,
    name: String,
    address: Option<String>,
    commune: Option<String>,
    lat: f64,
    lng: f64,
    status: Option<String>,
    availability: Option<String>,
    bike_stands: Option<i64>,
    available_bike_stands: Option<i64>,
    available_bikes: Option<i64>,
    banking: Option<bool>,
    bonus: Option<bool>,
    last_update: Option<String>,
    main_stands: Option<VelovStands>,
}

#[derive(Deserialize, Clone)]
struct GeoJsonFC<T> {
    features: Vec<GeoJsonFeature<T>>,
}

#[derive(Deserialize, Clone)]
struct GeoJsonFeature<T> {
    geometry: Option<GeoJsonPoint>,
    properties: T,
}

#[derive(Deserialize, Clone)]
struct GeoJsonPoint {
    coordinates: Vec<f64>,
}

#[derive(Deserialize, Clone)]
struct ToiletProps {
    gid: i64,
    adresse: Option<String>,
    codinsee: Option<String>,
    infoloc: Option<String>,
    provenance: Option<String>,
}

#[derive(Deserialize, Clone)]
struct AutopartageRow {
    idstation: String,
    nom: String,
    adresse: Option<String>,
    commune: Option<String>,
    lat: f64,
    lon: f64,
    nbemplacements: Option<i64>,
    typeautopartage: Option<String>,
    last_update: Option<String>,
}

pub fn ingest_velov(ctx: &mut ProcedureContext) {
    let started = ctx.timestamp;
    let body = match http_get(ctx, VELOV_URL, None) {
        Ok(b) => b,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_velov", started, ctx.timestamp, "error", 0, Some(err));
            return;
        }
    };

    let parsed: GrandlyonEnvelope<VelovRow> = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(err) => {
            record_ingestion_run(
                ctx,
                "ingest_velov",
                started,
                ctx.timestamp,
                "error",
                0,
                Some(format!("parse: {}", err)),
            );
            return;
        }
    };

    let now = ctx.timestamp;
    let values = parsed.values;
    let rows = ctx.with_tx(|tx| {
        let mut count = 0u64;
        for row in values.iter().cloned() {
            let (electrical, mechanical) = row
                .main_stands
                .as_ref()
                .and_then(|s| s.availabilities.as_ref())
                .map(|a| (a.electrical_bikes, a.mechanical_bikes))
                .unwrap_or((None, None));

            tx.db.velov_stations().number().insert_or_update(VelovStation {
                number: row.number,
                name: row.name,
                address: row.address,
                commune: row.commune,
                latitude: row.lat,
                longitude: row.lng,
                status: row.status,
                availability: row.availability,
                bike_stands: row.bike_stands.unwrap_or(0),
                available_bike_stands: row.available_bike_stands.unwrap_or(0),
                available_bikes: row.available_bikes.unwrap_or(0),
                available_electrical_bikes: electrical,
                available_mechanical_bikes: mechanical,
                banking: row.banking.unwrap_or(false),
                bonus: row.bonus.unwrap_or(false),
                last_update: row.last_update,
                recorded_at: now,
            });
            count += 1;
        }
        count
    });

    record_ingestion_run(ctx, "ingest_velov", started, ctx.timestamp, "success", rows, None);
}

pub fn ingest_autopartage(ctx: &mut ProcedureContext) {
    let started = ctx.timestamp;
    let body = match http_get(ctx, AUTOPARTAGE_URL, None) {
        Ok(b) => b,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_autopartage", started, ctx.timestamp, "error", 0, Some(err));
            return;
        }
    };

    let parsed: GrandlyonEnvelope<AutopartageRow> = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(err) => {
            record_ingestion_run(
                ctx,
                "ingest_autopartage",
                started,
                ctx.timestamp,
                "error",
                0,
                Some(format!("parse: {}", err)),
            );
            return;
        }
    };

    let now = ctx.timestamp;
    let values = parsed.values;
    let rows = ctx.with_tx(|tx| {
        let mut count = 0u64;
        for row in values.iter().cloned() {
            tx.db
                .autopartage_stations()
                .id_station()
                .insert_or_update(AutopartageStation {
                    id_station: row.idstation,
                    name: row.nom,
                    address: row.adresse,
                    commune: row.commune,
                    latitude: row.lat,
                    longitude: row.lon,
                    nb_emplacements: row.nbemplacements.unwrap_or(0),
                    type_autopartage: row.typeautopartage,
                    last_update: row.last_update,
                    recorded_at: now,
                });
            count += 1;
        }
        count
    });

    record_ingestion_run(
        ctx,
        "ingest_autopartage",
        started,
        ctx.timestamp,
        "success",
        rows,
        None,
    );
}

pub fn ingest_public_toilets(ctx: &mut ProcedureContext) {
    let started = ctx.timestamp;
    let body = match http_get(ctx, TOILETS_URL, None) {
        Ok(b) => b,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_public_toilets", started, ctx.timestamp, "error", 0, Some(err));
            return;
        }
    };

    let parsed: GeoJsonFC<ToiletProps> = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(err) => {
            record_ingestion_run(ctx, "ingest_public_toilets", started, ctx.timestamp, "error", 0, Some(format!("parse: {}", err)));
            return;
        }
    };

    let now = ctx.timestamp;
    let features = parsed.features;
    let rows = ctx.with_tx(|tx| {
        let mut count = 0u64;
        for f in features.iter().cloned() {
            let geom = match f.geometry { Some(g) => g, None => continue };
            if geom.coordinates.len() < 2 { continue; }
            let lng = geom.coordinates[0];
            let lat = geom.coordinates[1];
            tx.db.public_toilets().id().insert_or_update(PublicToilet {
                id: f.properties.gid,
                address: f.properties.adresse,
                commune_insee: f.properties.codinsee,
                info_location: f.properties.infoloc,
                provenance: f.properties.provenance,
                latitude: lat,
                longitude: lng,
                recorded_at: now,
            });
            count += 1;
        }
        count
    });

    record_ingestion_run(ctx, "ingest_public_toilets", started, ctx.timestamp, "success", rows, None);
}
