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

const token = process.env.TCL_API_TOKEN;
const creds = process.env.TCL_API_CREDENTIALS;
const gtfsUrl = process.env.GTFS_ZIP_URL;

const resolvedToken = token || (creds ? Buffer.from(creds, 'utf8').toString('base64') : null);
if (!resolvedToken) {
  console.error('Missing TCL_API_TOKEN or TCL_API_CREDENTIALS');
  process.exit(1);
}

const ConfigUpdatePlain = t.object('ConfigUpdatePlain', {
  tcl_api_token: t.string(),
  gtfs_zip_url: t.string(),
});

const proceduresSchema = procedures(
  procedureSchema('set_config_plain', { update: ConfigUpdatePlain }, t.unit())
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

const main = async () => {
  const conn = await connect();
  await conn.procedures.setConfigPlain({
    update: {
      tcl_api_token: resolvedToken,
      gtfs_zip_url: gtfsUrl || '',
    },
  });
  console.log('Config updated');
};

main().catch((err) => {
  console.error('set_config failed', err);
  process.exit(1);
});
