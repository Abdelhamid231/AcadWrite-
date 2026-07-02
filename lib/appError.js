// Error whose message is safe to send directly to the client (validation
// messages, file-type/size errors). Anything else caught by the global
// error handler gets a generic message instead, to avoid leaking internal
// details (DB/Supabase errors, stack traces, etc.).
function userError(message) {
  const err = new Error(message);
  err.expose = true;
  return err;
}

module.exports = userError;
