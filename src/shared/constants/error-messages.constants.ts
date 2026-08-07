const ERROR_MESSAGES = {
  NETWORK: "Network unavailable — check your connection and try again.",
  INTERNAL_SERVER:
    "We're experiencing technical issues. Please try again later.",
  TIMEOUT: "Request timed out. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  DEFAULT: "Something went wrong. Please try again.",
  VALIDATION: "Some inputs appear invalid. Please review and try again.",
  CONTACT_SUPPORT:
    "Something went wrong. Please contact support for assistance.",
  RATE_LIMIT: "Too many requests. Please wait and try again shortly.",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try later.",
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
};

export default ERROR_MESSAGES;
