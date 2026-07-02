async function renderNav() {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  const isStudent = !!user && user.role === "user" && user.level !== "enseignant";

  const links = [
    `<a href="/index.html">Accueil</a>`,
    `<a href="/methodologie.html">Methodologie</a>`,
    `<a href="/formations.html">Formations</a>`,
    `<a href="/assistant.html">Assistant IA</a>`,
  ];

  let rightSide;
  if (user) {
    if (isStudent) {
      links.push(`<a href="/dashboard.html">Tableau de bord</a>`);
    }
    if (user.role === "admin") {
      links.push(`<a href="/admin.html">Administration</a>`);
    }
    rightSide = `
      <span>${user.name}</span>
      <button type="button" class="link-btn" id="logout-btn">Deconnexion</button>
    `;
  } else {
    rightSide = `
      <a href="/login.html">Connexion</a>
      <a href="/register.html"><span class="btn">Inscription</span></a>
    `;
  }

  mount.innerHTML = `
    <a class="logo" href="/index.html">AcadWrite+</a>
    <nav class="main-nav">
      ${links.join("")}
      ${rightSide}
    </nav>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await apiFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/index.html";
    });
  }

  return user;
}

document.addEventListener("DOMContentLoaded", renderNav);
