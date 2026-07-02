document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("alert-box");
  const profileInfo = document.getElementById("profile-info");
  const requestsCard = document.getElementById("requests-card");
  const requestsList = document.getElementById("requests-list");
  const teacherCard = document.getElementById("teacher-card");

  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  if (user.role === "admin") {
    window.location.href = "/admin.html";
    return;
  }

  const isTeacher = user.level === "enseignant";

  const LEVEL_LABELS = {
    licence: "Licence",
    master: "Master",
    doctorat: "Doctorat",
    enseignant: "Enseignant",
    libre: "Libre",
  };

  profileInfo.innerHTML = `
    <p><strong>Nom :</strong> ${user.name}</p>
    <p><strong>Email :</strong> ${user.email}</p>
    <p><strong>Niveau :</strong> ${LEVEL_LABELS[user.level] || user.level}</p>
  `;

  if (isTeacher) {
    teacherCard.classList.remove("hidden");
    if (window.refreshMotion) window.refreshMotion();
    return;
  }

  requestsCard.classList.remove("hidden");
  if (window.refreshMotion) window.refreshMotion();

  try {
    const data = await apiFetch("/api/requests/mine");
    if (!data.requests.length) {
      requestsList.innerHTML = `<p class="muted">Vous n'avez encore depose aucune demande.</p>`;
      return;
    }
    requestsList.innerHTML = `
      <table>
        <thead>
          <tr><th>Type</th><th>Titre</th><th>Statut</th><th>Devis</th><th>Deposee le</th><th></th></tr>
        </thead>
        <tbody>
          ${data.requests
            .map(
              (r) => `
            <tr>
              <td>${TYPE_LABELS[r.type] || r.type}</td>
              <td>${r.title}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${r.price ? r.price + " DA" : "-"}</td>
              <td>${formatDate(r.created_at)}</td>
              <td><a href="/request.html?id=${r.id}">Voir</a></td>
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
});
