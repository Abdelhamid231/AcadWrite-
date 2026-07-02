document.addEventListener("DOMContentLoaded", async () => {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  const isTeacher = !!user && user.role === "user" && user.level === "enseignant";
  if (isTeacher) {
    const cta = document.getElementById("hero-cta");
    if (cta) {
      cta.href = "/formations.html";
      cta.textContent = "Voir les cours";
    }
  }
});
