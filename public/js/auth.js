function landingPageFor(user) {
  if (user.role === "admin") return "/admin.html";
  if (user.role === "user" && user.level === "enseignant") return "/formations.html";
  return "/dashboard.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const alertBox = document.getElementById("alert-box");

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    const submitBtn = registerForm.querySelector("button[type=submit]");
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert(alertBox);
      setButtonLoading(submitBtn, true, "Creation du compte...");
      const formData = new FormData(registerForm);
      try {
        const data = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            level: formData.get("level"),
          }),
        });
        window.location.href = landingPageFor(data.user);
      } catch (err) {
        showAlert(alertBox, err.message);
        setButtonLoading(submitBtn, false);
      }
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const submitBtn = loginForm.querySelector("button[type=submit]");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert(alertBox);
      setButtonLoading(submitBtn, true, "Connexion...");
      const formData = new FormData(loginForm);
      try {
        const data = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });
        window.location.href = landingPageFor(data.user);
      } catch (err) {
        showAlert(alertBox, err.message);
        setButtonLoading(submitBtn, false);
      }
    });
  }
});
