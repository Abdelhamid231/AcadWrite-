const express = require("express");
const path = require("path");
const multer = require("multer");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");
const { uploadToBlob } = require("../lib/blobStorage");
const userError = require("../lib/appError");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(userError("Type de fichier non autorise (pdf, jpg, png uniquement)."));
  },
});

const VALID_METHODS = ["ccp", "baridimob", "edahabia", "virement", "especes"];

// Le client declare avoir paye un devis, avec un justificatif (capture BaridiMob, recu CCP, etc.)
router.post(
  "/",
  requireAuth,
  upload.single("proof"),
  asyncHandler(async (req, res) => {
    const { request_id, method, reference } = req.body || {};

    const requestResult = await pool.query("SELECT * FROM requests WHERE id = $1", [request_id]);
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ error: "Demande introuvable." });
    if (request.user_id !== req.user.id) return res.status(403).json({ error: "Acces refuse." });
    if (!request.price) return res.status(400).json({ error: "Aucun devis n'a encore ete fixe pour cette demande." });
    if (!VALID_METHODS.includes(method)) return res.status(400).json({ error: "Methode de paiement invalide." });

    let proofPath = null;
    if (req.file) {
      proofPath = await uploadToBlob("payment-proofs", req.file);
    }

    const paymentResult = await pool.query(
      `INSERT INTO payments (request_id, method, reference, proof_path, proof_original_name, status)
       VALUES ($1, $2, $3, $4, $5, 'en_attente')
       RETURNING *`,
      [request.id, method, reference || null, proofPath, req.file ? req.file.originalname : null]
    );

    await pool.query("UPDATE requests SET status = 'paiement_declare', updated_at = NOW() WHERE id = $1", [
      request.id,
    ]);

    res.json({ payment: paymentResult.rows[0] });
  })
);

module.exports = router;
