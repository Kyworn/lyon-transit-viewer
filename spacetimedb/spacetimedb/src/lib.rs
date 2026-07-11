pub mod models;
pub mod serde_types;
pub mod http_utils;
pub mod ingestion;
pub mod procedures;

use spacetimedb::{reducer, ReducerContext, Table};
use crate::models::{config, Config};

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
