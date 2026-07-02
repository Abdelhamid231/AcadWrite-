const path = require("path");
const crypto = require("crypto");
const supabase = require("./supabaseClient");
const { BUCKET_NAME } = require("./constants");
const userError = require("./appError");

async function uploadToBlob(folder, file) {
  const ext = path.extname(file.originalname);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(key, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    console.error("Erreur upload Supabase Storage:", error);
    throw userError("Echec du televersement du fichier.");
  }
  return key;
}

async function fetchBlobBuffer(key) {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(key);
  if (error || !data) {
    throw userError("Fichier introuvable sur le stockage.");
  }
  return Buffer.from(await data.arrayBuffer());
}

function sendAsDownload(res, buffer, filename) {
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename || "fichier")}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(buffer);
}

async function deleteBlob(key) {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([key]);
  if (error) {
    console.error("Erreur suppression Supabase Storage:", error);
  }
}

module.exports = { uploadToBlob, fetchBlobBuffer, sendAsDownload, deleteBlob };
