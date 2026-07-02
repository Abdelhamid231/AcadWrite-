const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non defini.");
}

// createClient() throws synchronously if the URL is missing/invalid, which
// would crash the whole process at require-time. Fall back to a placeholder
// so the server can still boot (e.g. to serve static pages); any real call
// against this client will then fail with a normal, catchable error instead.
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Server-only client using the service role key: bypasses RLS and can manage
// auth users directly. Never expose this key or this client to the browser.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
