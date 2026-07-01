require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { ensureSchema, ensureAdmin } = require("./db");
const asyncHandler = require("./lib/asyncHandler");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const aiRoutes = require("./routes/ai");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Une erreur est survenue." });
  }
  next();
});

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  ensureAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD).catch((err) => {
    console.error("Erreur lors de la creation du compte admin:", err);
  });
}

module.exports = app;
