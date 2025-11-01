/** Constants */
// TODO:L Cahnge the Id to 5 in production accordingly
export const WEBSITE_OWNING_ORG = 5;
/** Service URIs */
export let HOST = 'https://api.jackdesk.com'
export let WEBSOCKET_HOST = 'https://websocket.jackdesk.com'
//export let HOST = 'http://127.0.0.1:8002'
//export let WEBSOCKET_HOST = 'http://localhost:5001'
/** Google client */
export const environment = {
    // Add this at the top
    production: false,
    googleClientId: "556673880157-840ns0acfd66aq42kjjaphg9l6dbqe5h.apps.googleusercontent.com"
};

/** Landing URIs */
export const DEFAULT_INDIVIDUAL_LANDING_APP = "apps/fmanager"
export const DEFAULT_ENTERPRISE_LANDING_APP = "apps"

export const ACTIVE_TIME_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes
export const PLATFORM_NOTIFICATION_POLLING_DURATION = 15 * 60 * 1000; // 15 minutes