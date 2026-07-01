const express = require("express");
const path = require("path");
const multer = require("multer");
const mammoth = require("mammoth");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
const MAX_ATTACHMENT_CHARS = 12000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".txt", ".pdf", ".docx"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Fichier non supporte pour l'assistant IA (txt, pdf ou docx uniquement)."));
  },
});

const MODES = {
  chat: "Tu es l'assistant IA d'AcadWrite+, une plateforme algerienne d'aide a la redaction academique, a la methodologie de recherche et a la traduction. Reponds de maniere claire, academique et bienveillante, en francais sauf si on te parle dans une autre langue.",
  reformulation: "Tu reformules le texte fourni par l'utilisateur dans un style academique plus soutenu, sans changer le sens. Renvoie uniquement le texte reformule.",
  resume: "Tu resumes le texte fourni par l'utilisateur de maniere academique, en gardant les idees essentielles et la structure logique. Sois concis.",
  bibliographie: "Tu aides l'utilisateur a generer des references bibliographiques academiques (normes APA par defaut, sauf indication contraire) a partir des informations fournies (auteur, titre, annee, source).",
  titres: "Tu proposes plusieurs titres academiques pertinents et accrocheurs pour le memoire, article ou projet decrit par l'utilisateur. Propose une liste numerotee de 5 titres.",
  concepts: "Tu expliques des concepts methodologiques de recherche academique (problematique, hypothese, objectifs, echantillon, variables, etc.) de facon simple et pedagogique, avec des exemples.",
};

async function extractFileText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".txt") {
    return file.buffer.toString("utf-8");
  }
  if (ext === ".pdf") {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  return "";
}

router.post("/chat", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || "Erreur lors du televersement du fichier." });
    }

    const { mode, history } = req.body || {};
    let { message } = req.body || {};
    message = typeof message === "string" ? message.trim() : "";

    if (!message && !req.file) {
      return res.status(400).json({ error: "Ecrivez un message ou joignez un fichier." });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Cle API OpenRouter non configuree cote serveur." });
    }

    let attachmentNote = "";
    if (req.file) {
      try {
        const text = (await extractFileText(req.file)).trim();
        if (!text) {
          return res.status(400).json({ error: "Impossible d'extraire du texte de ce fichier." });
        }
        const truncated = text.length > MAX_ATTACHMENT_CHARS;
        attachmentNote = `\n\n--- Contenu du fichier joint "${req.file.originalname}" ---\n${text.slice(0, MAX_ATTACHMENT_CHARS)}${truncated ? "\n[texte tronque]" : ""}`;
      } catch (err) {
        console.error("Erreur extraction fichier:", err);
        return res.status(400).json({ error: "Impossible de lire le contenu de ce fichier." });
      }
    }

    const finalMessage = (message || "Analyse le contenu du fichier joint.") + attachmentNote;

    const systemPrompt = MODES[mode] || MODES.chat;
    const messages = [{ role: "system", content: systemPrompt }];

    let parsedHistory = [];
    if (typeof history === "string") {
      try {
        parsedHistory = JSON.parse(history);
      } catch (e) {
        parsedHistory = [];
      }
    } else if (Array.isArray(history)) {
      parsedHistory = history;
    }

    for (const turn of parsedHistory.slice(-10)) {
      if (turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string") {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
    messages.push({ role: "user", content: finalMessage });

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({ model: MODEL, messages, stream: false }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Erreur OpenRouter:", response.status, errText);
        return res.status(502).json({ error: "L'assistant IA est momentanement indisponible." });
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content || "";
      res.json({ reply });
    } catch (err) {
      console.error("Erreur appel OpenRouter:", err);
      res.status(502).json({ error: "L'assistant IA est momentanement indisponible." });
    }
  });
});

module.exports = router;
