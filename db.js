const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

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
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'libre',
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
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
    `).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function ensureAdmin(email, password) {
  await ensureSchema();
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length === 0) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, level, role) VALUES ($1, $2, $3, 'enseignant', 'admin')",
      ["Administrateur", email.toLowerCase(), hash]
    );
    console.log(`Compte admin cree : ${email}`);
  }
}

module.exports = { pool, ensureSchema, ensureAdmin };
