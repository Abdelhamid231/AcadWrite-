const ADMIN_STATUS_OPTIONS = [
  "nouveau",
  "en_cours",
  "devis_envoye",
  "paiement_declare",
  "paye",
  "termine",
  "annule",
];

const PAYMENT_METHOD_LABELS = {
  ccp: "CCP",
  baridimob: "BaridiMob",
  edahabia: "Edahabia",
  virement: "Virement bancaire",
  especes: "Especes",
};

document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("alert-box");

  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }
  if (!user || user.role !== "admin") {
    window.location.href = "/login.html";
    return;
  }

  const tabs = document.getElementById("admin-tabs");
  const tabRequests = document.getElementById("tab-requests");
  const tabUsers = document.getElementById("tab-users");
  const tabCourses = document.getElementById("tab-courses");

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    tabRequests.classList.toggle("hidden", tab !== "requests");
    tabUsers.classList.toggle("hidden", tab !== "users");
    tabCourses.classList.toggle("hidden", tab !== "courses");
    if (tab === "users") loadUsers();
    if (tab === "courses") loadCourses();
  });

  async function loadRequests() {
    const el = document.getElementById("requests-table");
    try {
      const data = await apiFetch("/api/admin/requests");
      if (!data.requests.length) {
        el.innerHTML = `<p class="muted">Aucune demande pour le moment.</p>`;
        return;
      }
      el.innerHTML = `
        <table>
          <thead><tr><th>Utilisateur</th><th>Type</th><th>Titre</th><th>Statut</th><th>Devis</th><th>Deposee le</th><th></th></tr></thead>
          <tbody>
            ${data.requests
              .map(
                (r) => `
              <tr>
                <td>${r.user_name}<br><span class="small muted">${r.user_email}</span></td>
                <td>${TYPE_LABELS[r.type] || r.type}</td>
                <td>${r.title}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${r.price ? r.price + " DA" : "-"}</td>
                <td>${formatDate(r.created_at)}</td>
                <td><button type="button" class="btn outline manage-btn" data-id="${r.id}">Gerer</button></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
      el.querySelectorAll(".manage-btn").forEach((btn) => {
        btn.addEventListener("click", () => loadRequestDetail(btn.dataset.id));
      });
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function loadRequestDetail(id) {
    const card = document.getElementById("request-detail-card");
    card.classList.remove("hidden");
    card.innerHTML = "Chargement...";
    try {
      const data = await apiFetch(`/api/admin/requests/${id}`);
      const r = data.request;
      const payments = data.payments || [];

      card.innerHTML = `
        <h2>${r.title} ${statusBadge(r.status)}</h2>
        <p><strong>Client :</strong> ${r.user_name} (${r.user_email})</p>
        <p><strong>Type :</strong> ${TYPE_LABELS[r.type] || r.type}
          ${r.type === "traduction" ? ` &mdash; ${r.source_lang} &rarr; ${r.target_lang}` : ""}</p>
        <p><strong>Description :</strong> ${r.description || "-"}</p>
        ${r.file_path ? `<p><a href="/api/requests/${r.id}/file">Telecharger le document depose</a></p>` : `<p class="muted">Aucun fichier depose.</p>`}
        ${r.result_file_path ? `<p><a href="/api/requests/${r.id}/result">Telecharger le fichier de resultat actuel</a></p>` : ""}

        <div id="detail-alert"></div>
        <form class="form wide" id="admin-update-form" enctype="multipart/form-data">
          <div class="row">
            <div class="field">
              <label for="status">Statut</label>
              <select id="status" name="status">
                ${ADMIN_STATUS_OPTIONS.map(
                  (s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${STATUS_LABELS[s] || s}</option>`
                ).join("")}
              </select>
            </div>
            <div class="field">
              <label for="price">Devis (DA)</label>
              <input type="number" step="1" min="0" id="price" name="price" value="${r.price || ""}">
            </div>
          </div>
          <div class="field">
            <label for="admin_note">Remarque pour le client</label>
            <textarea id="admin_note" name="admin_note">${r.admin_note || ""}</textarea>
          </div>
          <div class="field">
            <label for="result">Fichier corrige / traduit (a envoyer au client)</label>
            <input type="file" id="result" name="result">
          </div>
          <button type="submit" class="btn">Enregistrer</button>
        </form>

        <h3 class="mt-1">Paiements declares</h3>
        ${
          payments.length
            ? `<table>
                <thead><tr><th>Methode</th><th>Reference</th><th>Justificatif</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  ${payments
                    .map(
                      (p) => `
                    <tr>
                      <td>${PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                      <td>${p.reference || "-"}</td>
                      <td>${p.proof_path ? `<a href="/api/admin/payments/${p.id}/proof">Voir</a>` : "-"}</td>
                      <td>${p.status}</td>
                      <td>
                        ${
                          p.status === "en_attente"
                            ? `<button type="button" class="btn secondary validate-btn" data-id="${p.id}">Valider</button>
                               <button type="button" class="btn danger refuse-btn" data-id="${p.id}">Refuser</button>`
                            : ""
                        }
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>`
            : `<p class="muted">Aucun paiement declare pour le moment.</p>`
        }
      `;

      const form = document.getElementById("admin-update-form");
      const updateBtn = form.querySelector("button[type=submit]");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const detailAlert = document.getElementById("detail-alert");
        clearAlert(detailAlert);
        setButtonLoading(updateBtn, true, "Enregistrement...");
        const formData = new FormData(form);
        try {
          await apiFetch(`/api/admin/requests/${r.id}`, { method: "PATCH", body: formData });
          showAlert(detailAlert, "Demande mise a jour.", "success");
          loadRequests();
          loadRequestDetail(r.id);
        } catch (err) {
          showAlert(detailAlert, err.message);
          setButtonLoading(updateBtn, false);
        }
      });

      card.querySelectorAll(".validate-btn").forEach((btn) => {
        btn.addEventListener("click", () => updatePayment(btn.dataset.id, "valide", r.id));
      });
      card.querySelectorAll(".refuse-btn").forEach((btn) => {
        btn.addEventListener("click", () => updatePayment(btn.dataset.id, "refuse", r.id));
      });
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function updatePayment(paymentId, status, requestId) {
    try {
      await apiFetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadRequests();
      loadRequestDetail(requestId);
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function loadUsers() {
    const el = document.getElementById("users-table");
    try {
      const data = await apiFetch("/api/admin/users");
      el.innerHTML = `
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Niveau</th><th>Role</th><th>Inscrit le</th></tr></thead>
          <tbody>
            ${data.users
              .map(
                (u) => `
              <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.level}</td>
                <td>${u.role}</td>
                <td>${formatDate(u.created_at)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function loadCourses() {
    const el = document.getElementById("courses-table");
    try {
      const data = await apiFetch("/api/admin/courses");
      if (!data.courses.length) {
        el.innerHTML = `<p class="muted">Aucun cours publie pour le moment.</p>`;
        return;
      }
      el.innerHTML = `
        <table>
          <thead><tr><th>Titre</th><th>Categorie</th><th>Fichier</th><th>Publie le</th><th></th></tr></thead>
          <tbody>
            ${data.courses
              .map(
                (c) => `
              <tr>
                <td>${c.title}</td>
                <td>${c.category || "-"}</td>
                <td><a href="/api/courses/${c.id}/file">${c.original_name}</a></td>
                <td>${formatDate(c.created_at)}</td>
                <td><button type="button" class="btn danger delete-course-btn" data-id="${c.id}">Supprimer</button></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
      el.querySelectorAll(".delete-course-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteCourse(btn.dataset.id));
      });
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  async function deleteCourse(id) {
    if (!window.confirm("Supprimer definitivement ce cours ?")) return;
    try {
      await apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      loadCourses();
    } catch (err) {
      showAlert(alertBox, err.message);
    }
  }

  const courseForm = document.getElementById("course-form");
  const courseSubmitBtn = courseForm.querySelector("button[type=submit]");
  courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const courseAlert = document.getElementById("course-alert");
    clearAlert(courseAlert);
    setButtonLoading(courseSubmitBtn, true, "Publication...");
    const formData = new FormData(courseForm);
    try {
      await apiFetch("/api/admin/courses", { method: "POST", body: formData });
      showAlert(courseAlert, "Cours publie.", "success");
      courseForm.reset();
      loadCourses();
    } catch (err) {
      showAlert(courseAlert, err.message);
    } finally {
      setButtonLoading(courseSubmitBtn, false);
    }
  });

  loadRequests();
});
