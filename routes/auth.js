const express = require("express");
const { pool } = require("../db");
const supabase = require("../lib/supabaseClient");
const { setAuthCookie, clearAuthCookie, getUserFromReq, publicUser } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

const VALID_LEVELS = ["licence", "master", "doctorat", "enseignant", "libre"];

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, level } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nom, email et mot de passe sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caracteres." });
    }
    const chosenLevel = VALID_LEVELS.includes(level) ? level : "libre";
    const normalizedEmail = email.toLowerCase();

    const existing = await pool.query("SELECT id FROM profiles WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Un compte existe deja avec cet email." });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (error) {
      return res.status(400).json({ error: error.message || "Impossible de creer le compte." });
    }

    const result = await pool.query(
      "INSERT INTO profiles (id, name, email, level, role) VALUES ($1, $2, $3, $4, 'user') RETURNING *",
      [data.user.id, name, normalizedEmail, chosenLevel]
    );

    const user = publicUser(result.rows[0]);
    setAuthCookie(res, user);
    res.json({ user });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe sont requis." });
    }
    const normalizedEmail = email.toLowerCase();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const result = await pool.query("SELECT * FROM profiles WHERE email = $1", [normalizedEmail]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const user = publicUser(row);
    setAuthCookie(res, user);
    res.json({ user });
  })
);

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  res.json({ user: getUserFromReq(req) });
});

module.exports = router;
