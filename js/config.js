// App-wide configuration. Pass/fail thresholds live in state.js instead.

export const APP_TITLE = "Kanji Bertahap";
export const APP_VERSION = "0.9.0"; // map version in development (desain-peta); main stays 0.5.0
export const CONTENT_URL = "data/content.json";
export const CONSENT_URL = "data/consent.json";
export const UI_LABELS_URL = "data/ui.json";
export const ASSETS_URL = "data/assets.json";
export const KANA_URL = "data/kana.json";
export const CHARACTERS_URL = "data/characters.json";

// Remote answer log: a Google Apps Script Web App (README "Pengiriman log").
// Keep disabled until the endpoint has been deployed and tested.
export const LOG_REMOTE_ENABLED = false;
export const LOG_REMOTE_URL = "";
export const LOG_REMOTE_BATCH_SIZE = 50; // rows per request
export const LOG_REMOTE_TIMEOUT_MS = 15000; // Apps Script can take several seconds to wake up
export const LOG_REMOTE_RETRY_MS = 60000; // retry interval while rows are unsent
