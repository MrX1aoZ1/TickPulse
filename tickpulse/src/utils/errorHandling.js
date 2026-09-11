/**
 * Error handling utilities for TickPulse application
 */

// Map backend error codes to user-friendly messages
export const errorMessages = {
  // Auth errors
  'auth/invalid-credentials': 'Invalid email or password',
  'auth/user-not-found': 'No account found with this email',
  'auth/email-already-in-use': 'This email is already registered',
  'auth/weak-password': 'Password is too weak',
  
  // Task errors
  'tasks/not-found': 'The requested task could not be found',
  'tasks/invalid-data': 'Invalid task data provided',
  
  // Generic errors
  'network-error': 'Network connection error. Please check your internet connection',
  'server-error': 'Server error. Please try again later',
  'unknown-error': 'An unexpected error occurred'
};

/**
 * Format error for display based on API response or error object.
 * @param {Error|Object} error - Error object or API error response containing a code or status.
 * @returns {String} User-friendly error message.
 */
export const formatErrorMessage = (error) => {
  // If it's an API error with a recognized code
  if (error && error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }
  
  // If it's a network error (often related to fetch failures)
  if (error && error.message && error.message.toLowerCase().includes('fetch')) { // Made case-insensitive
    return errorMessages['network-error'];
  }
  
  // If it's a server error (HTTP status 5xx)
  if (error && error.status && error.status >= 500) {
    return errorMessages['server-error'];
  }
  
  // Use the error message if available, otherwise use a generic unknown error message
  return (error && error.message) || errorMessages['unknown-error'];
};

/**
 * Log errors to console with additional context.
 * In a production environment, this could be extended to send errors to a tracking service.
 * @param {String} context - A string describing where the error occurred (e.g., component name, function name).
 * @param {Error} error - The error object.
 */
export const logError = (context, error) => {
  console.error(`[${context}] Error:`, error);
  
  // In production, you could send this to an error tracking service
  // like Sentry, LogRocket, etc. instead of just logging to console.
  // Example: Sentry.captureException(error, { extra: { context } });
};