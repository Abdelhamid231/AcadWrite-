const express = require("express");
const path = require("path");
const multer = require("multer");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");
const { uploadToBlob, fetchBlobBuffer, sendAsDownload } = require("../lib/blobStorage");
const userError = require("../lib/appError");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".odt", ".txt"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(userError("Type de fichier non autorise (pdf, doc, docx, odt, txt uniquement)."));
  },
});

const VALID_TYPES = ["correction", "traduction", "redaction"];

router.post(
  "/",
  requireAuth,
  upload.single("document"),
  asyncHandler(async (req, res) => {
    const { type, title, description, source_lang, target_lang } = req.body || {};

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Type de demande invalide." });
    }
    if (!title) {
      return res.status(400).json({ error: "Le titre est requis." });
    }
    if (type === "traduction" && (!source_lang || !target_lang)) {
      return res.status(400).json({ error: "Langue source et langue cible sont requises pour une traduction." });
    }

    let filePath = null;
    if (req.file) {
      filePath = await uploadToBlob("documents", req.file);
    }

    const result = await pool.query(
      `INSERT INTO requests (user_id, type, title, description, source_lang, target_lang, file_path, original_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nouveau')
       RETURNING *`,
      [
        req.user.id,
        type,
        title,
        description || null,
        type === "traduction" ? source_lang : null,
        type === "traduction" ? target_lang : null,
        filePath,
        req.file ? req.file.originalname : null,
      ]
    );

    res.json({ request: result.rows[0] });
  })
);

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM requests WHERE user_id = $1 ORDER BY created_at DESC", [
      req.user.id,
    ]);
    res.json({ requests: result.rows });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
    const request = result.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });
    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Acces refuse." });
    }
    const payments = await pool.query("SELECT * FROM payments WHERE request_id = $1 ORDER BY created_at DESC", [
      request.id,
    ]);
    res.json({ request, payments: payments.rows });
  })
);

router.get(
  "/:id/file",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
    const request = result.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });
    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Acces refuse." });
    }
    if (!request.file_path) return res.status(404).json({ error: "Aucun fichier depose." });
    const buffer = await fetchBlobBuffer(request.file_path);
    sendAsDownload(res, buffer, request.original_name);
  })
);

router.get(
  "/:id/result",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
    const request = result.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });
    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Acces refuse." });
    }
    if (!request.result_file_path) return res.status(404).json({ error: "Aucun fichier de resultat." });
    const buffer = await fetchBlobBuffer(request.result_file_path);
    sendAsDownload(res, buffer, request.result_original_name);
  })
);

module.exports = router;
