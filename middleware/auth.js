const jwt = require("jsonwebtoken");

const COOKIE_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, level: user.level, role: user.role };
}

function setAuthCookie(res, user) {
  const token = jwt.sign(publicUser(user), JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_MS,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function getUserFromReq(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return publicUser(payload);
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: "Vous devez etre connecte." });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getUserFromReq(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Acces reserve a l'administrateur." });
  }
  req.user = user;
  next();
}

module.exports = { setAuthCookie, clearAuthCookie, getUserFromReq, requireAuth, requireAdmin, publicUser };
