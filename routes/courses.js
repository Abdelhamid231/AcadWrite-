const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../lib/asyncHandler");
const { fetchBlobBuffer, sendAsDownload } = require("../lib/blobStorage");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT id, title, description, category, original_name, created_at FROM courses ORDER BY created_at DESC"
    );
    res.json({ courses: result.rows });
  })
);

router.get(
  "/:id/file",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM courses WHERE id = $1", [req.params.id]);
    const course = result.rows[0];
    if (!course) return res.status(404).json({ error: "Cours introuvable." });
    const buffer = await fetchBlobBuffer(course.file_path);
    sendAsDownload(res, buffer, course.original_name);
  })
);

module.exports = router;
