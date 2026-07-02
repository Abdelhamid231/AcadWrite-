document.addEventListener("DOMContentLoaded", async () => {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  const cta = document.getElementById("hero-cta");
  if (!user || !cta) return;

  if (user.role === "admin") {
    cta.href = "/admin.html";
    cta.textContent = "Administration";
  } else if (user.level === "enseignant") {
    cta.href = "/formations.html";
    cta.textContent = "Voir les cours";
  }
});
