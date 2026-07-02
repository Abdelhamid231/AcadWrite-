const express = require("express");
const path = require("path");
const multer = require("multer");
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");
const { uploadToBlob, fetchBlobBuffer, sendAsDownload, deleteBlob } = require("../lib/blobStorage");
const userError = require("../lib/appError");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

const courseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(userError("Type de fichier non autorise (pdf, doc, docx uniquement)."));
  },
});

router.use(requireAdmin);

const VALID_STATUSES = ["nouveau", "en_cours", "devis_envoye", "paiement_declare", "paye", "termine", "annule"];

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT id, name, email, level, role, created_at FROM profiles ORDER BY created_at DESC"
    );
    res.json({ users: result.rows });
  })
);

router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM requests r JOIN profiles u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    );
    res.json({ requests: result.rows });
  })
);

router.get(
  "/requests/:id",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM requests r JOIN profiles u ON u.id = r.user_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const request = result.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });
    const payments = await pool.query("SELECT * FROM payments WHERE request_id = $1 ORDER BY created_at DESC", [
      request.id,
    ]);
    res.json({ request, payments: payments.rows });
  })
);

router.patch(
  "/requests/:id",
  upload.single("result"),
  asyncHandler(async (req, res) => {
    const existing = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
    const request = existing.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });

    const { status, price, admin_note } = req.body || {};
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    let resultFilePath = null;
    if (req.file) {
      resultFilePath = await uploadToBlob("results", req.file);
    }

    const updated = await pool.query(
      `UPDATE requests SET
         status = COALESCE($1, status),
         price = COALESCE($2, price),
         admin_note = COALESCE($3, admin_note),
         result_file_path = COALESCE($4, result_file_path),
         result_original_name = COALESCE($5, result_original_name),
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        status || null,
        price !== undefined && price !== "" ? Number(price) : null,
        admin_note || null,
        resultFilePath,
        req.file ? req.file.originalname : null,
        request.id,
      ]
    );

    res.json({ request: updated.rows[0] });
  })
);

router.get(
  "/payments/:id/proof",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM payments WHERE id = $1", [req.params.id]);
    const payment = result.rows[0];
    if (!payment) return res.status(404).json({ error: "Paiement introuvable." });
    if (!payment.proof_path) return res.status(404).json({ error: "Aucun justificatif." });
    const buffer = await fetchBlobBuffer(payment.proof_path);
    sendAsDownload(res, buffer, payment.proof_original_name);
  })
);

router.patch(
  "/payments/:id",
  asyncHandler(async (req, res) => {
    const existing = await pool.query("SELECT * FROM payments WHERE id = $1", [req.params.id]);
    const payment = existing.rows[0];
    if (!payment) return res.status(404).json({ error: "Paiement introuvable." });

    const { status } = req.body || {};
    if (!["en_attente", "valide", "refuse"].includes(status)) {
      return res.status(400).json({ error: "Statut de paiement invalide." });
    }

    const updated = await pool.query(
      "UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, payment.id]
    );

    if (status === "valide") {
      await pool.query("UPDATE requests SET status = 'paye', updated_at = NOW() WHERE id = $1", [
        payment.request_id,
      ]);
    }

    res.json({ payment: updated.rows[0] });
  })
);

router.get(
  "/courses",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM courses ORDER BY created_at DESC");
    res.json({ courses: result.rows });
  })
);

router.post(
  "/courses",
  courseUpload.single("document"),
  asyncHandler(async (req, res) => {
    const { title, description, category } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Le titre est requis." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Un fichier (pdf, doc ou docx) est requis." });
    }

    const filePath = await uploadToBlob("courses", req.file);

    const result = await pool.query(
      `INSERT INTO courses (title, description, category, file_path, original_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || null, category || null, filePath, req.file.originalname]
    );

    res.json({ course: result.rows[0] });
  })
);

router.patch(
  "/courses/:id",
  courseUpload.single("document"),
  asyncHandler(async (req, res) => {
    const existing = await pool.query("SELECT * FROM courses WHERE id = $1", [req.params.id]);
    const course = existing.rows[0];
    if (!course) return res.status(404).json({ error: "Cours introuvable." });

    const { title, description, category } = req.body || {};

    let filePath = null;
    let originalName = null;
    if (req.file) {
      filePath = await uploadToBlob("courses", req.file);
      originalName = req.file.originalname;
    }

    const updated = await pool.query(
      `UPDATE courses SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         file_path = COALESCE($4, file_path),
         original_name = COALESCE($5, original_name),
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title || null, description || null, category || null, filePath, originalName, course.id]
    );

    if (filePath) {
      await deleteBlob(course.file_path);
    }

    res.json({ course: updated.rows[0] });
  })
);

router.delete(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    const existing = await pool.query("SELECT * FROM courses WHERE id = $1", [req.params.id]);
    const course = existing.rows[0];
    if (!course) return res.status(404).json({ error: "Cours introuvable." });

    await pool.query("DELETE FROM courses WHERE id = $1", [course.id]);
    await deleteBlob(course.file_path);

    res.json({ ok: true });
  })
);

module.exports = router;
