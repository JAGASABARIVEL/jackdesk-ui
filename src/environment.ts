/** Constants */
// TODO:L Cahnge the Id to 5 in production accordingly
export const WEBSITE_OWNING_ORG = 5;
/** Service URIs */

export let HOST = 'https://api.jackdesk.com'
//export let PRODUCTIVITY_HOST = 'https://productivity.jackdesk.com'
export let WEBSOCKET_HOST = 'https://websocket.jackdesk.com'
//export let HOST = 'http://127.0.0.1:8001'
export let PRODUCTIVITY_HOST = 'https://api.jackdesk.com'
//export let WEBSOCKET_HOST = 'http://localhost:5001'
/** Google client */
export const environment = {
    // Add this at the top
    production: false,
    googleClientId: "556673880157-840ns0acfd66aq42kjjaphg9l6dbqe5h.apps.googleusercontent.com",
    zohoClientId: '1000.TJXKX3GS78GTVEH52KAWI3E1CC4ZQJ',
    zohoAccountsUrl: 'https://accounts.zoho.in',
    zohoRedirectUri: 'http://localhost:4200/zoho-callback.html', 
};


/** Landing URIs */
export const DEFAULT_INDIVIDUAL_LANDING_APP = "apps/fmanager"
export const DEFAULT_OWNER_ENTERPRISE_LANDING_APP = "/apps/ca-firm/dashboard"
export const DEFAULT_EMPLOYEE_ENTERPRISE_LANDING_APP = "/apps/chat"
export const DEFAULT_EMPLOYEE_ENTERPRISE_DASHBOARD_LANDING_APP = "/apps/"

export const ACTIVE_TIME_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes
export const PLATFORM_NOTIFICATION_POLLING_DURATION = 5 * 60 * 1000; // 5 minutes
export const PLATFORM_NEW_TASK_NOTIFICATION_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes

export const VERSION = "Jackfruit 2.0";

export const RELEASE_NOTES: any = {
  "Jackfruit 1.0": {
    "releasedate": "April 06 2025",
    "features": [
    "Omnichannel messaging with WhatsApp, Messenger, Webchat, Gmail and SMS",
    "Comprehensive ticketing system for customer support",
    "Campaign creation and message scheduling capabilities",
    "Multi-organization support for enterprise clients",
    "Single media attachment support from customer end",
    "Auto assignment based on round robbin alogorithm"
  ]
  } ,
  "Jackfruit 2.0": {
    "releasedate": "January 18 2026",
    "features":[
    "Lightning-fast performance with optimized architecture",
    "Multiple media attachments at once from customers on all channels",
    "Default protection on country code while saving customer's whatsapp and phone contacts",
    "Auto assignment based on customer aware algorithm which includes dedicated spoc assigned to customer, last worked employee, round robbin",
    "Department-based ticket routing and management",
    "CRM Lite - Customer relationship management essentials",
    "Finance Lite - Basic financial tracking and reporting",
    "Employee Management Lite - HR and team management tools",
    "Separate productivity microservice for enhanced scalability",
  ]
  }
};