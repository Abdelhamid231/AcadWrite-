const rateLimit = require("express-rate-limit");

const message = { error: "Trop de tentatives. Merci de reessayer dans quelques minutes." };

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

module.exports = { authLimiter, aiLimiter };
