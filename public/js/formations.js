document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("alert-box");
  const listEl = document.getElementById("courses-list");

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  try {
    const data = await apiFetch("/api/courses");
    if (!data.courses.length) {
      listEl.innerHTML = `<p class="muted">Aucun cours disponible pour le moment.</p>`;
      return;
    }

    listEl.innerHTML = `
      <div class="grid">
        ${data.courses
          .map(
            (c) => `
          <div class="card module-card">
            <h3>${c.title}</h3>
            ${c.category ? `<span class="badge">${c.category}</span>` : ""}
            <p class="small muted">${c.description ? c.description : ""}</p>
            <p class="small muted">${formatDate(c.created_at)}</p>
            <button type="button" class="btn secondary download-btn" data-id="${c.id}">Telecharger</button>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    listEl.querySelectorAll(".download-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!user) {
          window.location.href = "/login.html";
          return;
        }
        window.location.href = `/api/courses/${btn.dataset.id}/file`;
      });
    });

    if (window.refreshMotion) window.refreshMotion();
  } catch (err) {
    showAlert(alertBox, err.message);
  }
});
