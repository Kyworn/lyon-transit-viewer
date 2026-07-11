use spacetimedb::{
    http::{Body, Request},
    ProcedureContext,
};
use crate::models::JourneyRequest;

pub fn build_tcl_journeys_url(req: &JourneyRequest, include_all_options: bool) -> String {
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
        if let Some(ref bike) = req.bike {
            params.push(("bike", bike.clone()));
        }
    }

    let query = params
        .into_iter()
        .map(|(k, v)| format!("{}={}", k, urlencoding::encode(&v)))
        .collect::<Vec<_>>()
        .join("&");

    format!("https://carte-interactive.tcl.fr/api/interface/tcl/journeys?{}", query)
}

pub fn http_get_tcl_journeys(ctx: &mut ProcedureContext, url: &str) -> Result<String, String> {
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

pub fn http_get(ctx: &mut ProcedureContext, url: &str, token: Option<&String>) -> Result<String, String> {
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

pub fn http_get_bytes(ctx: &mut ProcedureContext, url: &str, token: Option<&String>) -> Result<Vec<u8>, String> {
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
