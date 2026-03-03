import {
  DbConnectionBuilder,
  DbConnectionImpl,
  procedures,
  procedureSchema,
  reducers,
  schema,
  t,
} from 'spacetimedb';

const uri = process.env.SPACETIMEDB_URI || 'http://127.0.0.1:3000';
const dbName = process.env.SPACETIMEDB_DB || 'lyon-transit';
const token = process.env.TCL_API_TOKEN || '';

const StaticPayload = t.object('StaticPayload', {
  alerts: t.string(),
  stations: t.string(),
  stops: t.string(),
  lines_bus: t.string(),
  lines_metro: t.string(),
  lines_tram: t.string(),
  lines_rhonexpress: t.string(),
  pricing_zones: t.string(),
});

const RealtimePayload = t.object('RealtimePayload', {
  vehicles: t.string(),
  timetables: t.string(),
});

const proceduresSchema = procedures(
  procedureSchema('ingest_static_payload', { payload: StaticPayload }, t.unit()),
  procedureSchema('ingest_realtime_payload', { payload: RealtimePayload }, t.unit())
);

const REMOTE_MODULE = {
  versionInfo: { cliVersion: '2.0.2' },
  tables: schema({}).schemaType.tables,
  reducers: reducers().reducersType.reducers,
  ...proceduresSchema,
};

class DbConnection extends DbConnectionImpl {
  static builder() {
    return new DbConnectionBuilder(REMOTE_MODULE, (config) => new DbConnection(config));
  }
}

const connect = () =>
  new Promise((resolve, reject) => {
    DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(dbName)
      .onConnect((conn) => resolve(conn))
      .onConnectError((_ctx, err) => reject(err))
      .build();
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const intervalMs = {
  realtime: Number(process.env.REALTIME_INTERVAL || 15000),
  static: Number(process.env.STATIC_INTERVAL || 900000),
};

const fetchJson = async (url, useAuth) => {
  console.log(`[${new Date().toISOString()}] fetch ${url}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = useAuth && token ? { Authorization: `Basic ${token}` } : undefined;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    console.log(`[${new Date().toISOString()}] fetched ${url} (${text.length} bytes)`);
    return text;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchStaticPayload = async () => {
  const alerts = await fetchJson(
    'https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclalertetrafic_2/all.json?maxfeatures=-1&start=1',
    true
  );
  const stations = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclstation&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const stops = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclarret&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const lines_bus = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const lines_metro = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const lines_tram = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const lines_rhonexpress = await fetchJson(
    'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171',
    true
  );
  const pricing_zones = await fetchJson(
    'https://carte-interactive.tcl.fr/api/interface/tcl/pois/by-type/pricing-zones',
    false
  );

  return { alerts, stations, stops, lines_bus, lines_metro, lines_tram, lines_rhonexpress, pricing_zones };
};

const fetchRealtimePayload = async () => {
  const vehicles = await fetchJson(
    'https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json',
    true
  );
  const timetables = await fetchJson(
    'https://data.grandlyon.com/siri-lite/2.0/estimated-timetables.json',
    true
  );
  return { vehicles, timetables };
};

const main = async () => {
  const conn = await connect();
  console.log(`SpacetimeDB ingestion worker started for ${dbName} (${uri})`);
  console.log(`Intervals: realtime=${intervalMs.realtime}ms static=${intervalMs.static}ms`);

  const runStatic = async () => {
    try {
      console.log(`[${new Date().toISOString()}] ingest_static_payload start`);
      const payload = await fetchStaticPayload();
      await conn.procedures.ingestStaticPayload({ payload });
      console.log(`[${new Date().toISOString()}] ingest_static_payload done`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ingest_static_payload failed`, err);
    }
  };

  const runRealtime = async () => {
    try {
      console.log(`[${new Date().toISOString()}] ingest_realtime_payload start`);
      const payload = await fetchRealtimePayload();
      await conn.procedures.ingestRealtimePayload({ payload });
      console.log(`[${new Date().toISOString()}] ingest_realtime_payload done`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ingest_realtime_payload failed`, err);
    }
  };

  await runStatic();
  await runRealtime();

  setInterval(runRealtime, intervalMs.realtime);
  setInterval(runStatic, intervalMs.static);

  while (true) {
    await sleep(60000);
  }
};

main().catch((err) => {
  console.error('Ingestion worker failed to start', err);
  process.exit(1);
});
