const path = require("path");
const crypto = require("crypto");
const { put, get } = require("@vercel/blob");

async function uploadToBlob(folder, file) {
  const ext = path.extname(file.originalname);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const blob = await put(key, file.buffer, {
    access: "private",
    contentType: file.mimetype,
  });
  return blob.pathname;
}

async function fetchBlobBuffer(pathname) {
  const result = await get(pathname, { access: "private" });
  if (!result || !result.stream) {
    throw new Error("Fichier introuvable sur le stockage.");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

function sendAsDownload(res, buffer, filename) {
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename || "fichier")}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(buffer);
}

module.exports = { uploadToBlob, fetchBlobBuffer, sendAsDownload };
