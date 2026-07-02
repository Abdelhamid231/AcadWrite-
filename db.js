const { Pool } = require("pg");
const supabase = require("./lib/supabaseClient");
const { BUCKET_NAME } = require("./lib/constants");

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("Aucune chaine de connexion Postgres definie (POSTGRES_URL ou DATABASE_URL).");
}
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          level TEXT NOT NULL DEFAULT 'libre',
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS requests (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES profiles(id),
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          source_lang TEXT,
          target_lang TEXT,
          file_path TEXT,
          original_name TEXT,
          result_file_path TEXT,
          result_original_name TEXT,
          status TEXT NOT NULL DEFAULT 'nouveau',
          price NUMERIC,
          admin_note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          request_id INTEGER NOT NULL REFERENCES requests(id),
          method TEXT NOT NULL,
          reference TEXT,
          proof_path TEXT,
          proof_original_name TEXT,
          status TEXT NOT NULL DEFAULT 'en_attente',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: false });
      if (error && !/already exists/i.test(error.message || "")) {
        throw error;
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function ensureAdmin(email, password) {
  await ensureSchema();
  const normalizedEmail = email.toLowerCase();
  const existing = await pool.query("SELECT id FROM profiles WHERE email = $1", [normalizedEmail]);
  if (existing.rows.length === 0) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    await pool.query(
      "INSERT INTO profiles (id, name, email, level, role) VALUES ($1, $2, $3, 'enseignant', 'admin')",
      [data.user.id, "Administrateur", normalizedEmail]
    );
    console.log(`Compte admin cree : ${email}`);
  }
}

module.exports = { pool, ensureSchema, ensureAdmin };
