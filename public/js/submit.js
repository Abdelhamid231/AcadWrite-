document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("alert-box");

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

  const typeSelect = document.getElementById("type");
  const langFields = document.getElementById("lang-fields");
  function toggleLangFields() {
    langFields.classList.toggle("hidden", typeSelect.value !== "traduction");
  }
  typeSelect.addEventListener("change", toggleLangFields);
  toggleLangFields();

  const form = document.getElementById("submit-form");
  const submitBtn = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(alertBox);
    setButtonLoading(submitBtn, true, "Envoi en cours...");
    const formData = new FormData(form);
    try {
      const data = await apiFetch("/api/requests", { method: "POST", body: formData });
      window.location.href = `/request.html?id=${data.request.id}`;
    } catch (err) {
      showAlert(alertBox, err.message);
      setButtonLoading(submitBtn, false);
    }
  });
});
