require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { ensureSchema, ensureAdmin } = require("./db");
const asyncHandler = require("./lib/asyncHandler");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const aiRoutes = require("./routes/ai");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");

const app = express();

// Vercel (and most hosts) put the app behind a reverse proxy; trust the
// X-Forwarded-* headers so req.ip / req.secure reflect the real client
// instead of the proxy, which rate limiting relies on.
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  "/api",
  asyncHandler(async (req, res, next) => {
    await ensureSchema();
    next();
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  if (!err) return next();
  console.error(err);
  const isSafeToShow = err.expose === true || err instanceof multer.MulterError;
  const message = isSafeToShow ? err.message : "Une erreur est survenue. Veuillez reessayer.";
  res.status(400).json({ error: message });
});

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  ensureAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD).catch((err) => {
    console.error("Erreur lors de la creation du compte admin:", err);
  });
}

module.exports = app;
