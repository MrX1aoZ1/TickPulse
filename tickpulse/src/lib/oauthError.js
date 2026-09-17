const OAUTH_ERRORS = {
  auth_failed: 'Social login was cancelled or failed. Please try again.',
  server_error: 'Server error during social login. Please try again later.',
  session_error: 'Could not create a session. Please try again.',
};

export function consumeOAuthError(router, replacePath) {
  const error = new URLSearchParams(window.location.search).get('error');
  if (!error) return undefined;

  const message = OAUTH_ERRORS[error] || decodeURIComponent(error.replace(/\+/g, ' '));
  router.replace(replacePath);
  return message;
}
