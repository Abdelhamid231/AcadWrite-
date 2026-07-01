async function apiFetch(url, options = {}) {
  const opts = { credentials: "include", ...options };
  const res = await fetch(url, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.error) || "Une erreur est survenue.";
    throw new Error(message);
  }
  return data;
}

async function getCurrentUser() {
  const data = await apiFetch("/api/auth/me");
  return data.user;
}

function showAlert(container, message, type = "error") {
  container.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

function clearAlert(container) {
  container.innerHTML = "";
}

function setButtonLoading(button, isLoading, loadingLabel = "Chargement...") {
  if (!button) return;
  if (isLoading) {
    if (button.dataset.originalHtml === undefined) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span>${loadingLabel}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml !== undefined) {
      button.innerHTML = button.dataset.originalHtml;
    }
  }
}

const STATUS_LABELS = {
  nouveau: "Nouvelle",
  en_cours: "En cours",
  devis_envoye: "Devis envoye",
  paiement_declare: "Paiement declare",
  paye: "Payee",
  termine: "Terminee",
  annule: "Annulee",
};

const TYPE_LABELS = {
  correction: "Correction / relecture",
  traduction: "Traduction",
  redaction: "Aide a la redaction",
};

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge ${status}">${label}</span>`;
}

function formatDate(str) {
  if (!str) return "-";
  const d = new Date(str.replace(" ", "T") + "Z");
  return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
