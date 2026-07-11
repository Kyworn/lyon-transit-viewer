/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_MAPBOX_TOKEN?: string;
  readonly REACT_APP_SPACETIMEDB_URI?: string;
  readonly REACT_APP_SPACETIMEDB_DB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
