document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("alert-box");
  const chatWindow = document.getElementById("chat-window");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const modeTabs = document.getElementById("mode-tabs");
  const fileInput = document.getElementById("file-input");
  const chipRow = document.getElementById("attachment-chip-row");

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

  let currentMode = "chat";
  let history = [];
  let attachedFile = null;

  modeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    modeTabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    chatWindow.innerHTML = "";
    history = [];
  });

  function renderAttachmentChip() {
    if (!attachedFile) {
      chipRow.innerHTML = "";
      return;
    }
    chipRow.innerHTML = `
      <span class="file-chip">
        📄 ${attachedFile.name}
        <button type="button" class="chip-remove" id="remove-file-btn" title="Retirer le fichier">&times;</button>
      </span>
    `;
    document.getElementById("remove-file-btn").addEventListener("click", () => {
      attachedFile = null;
      fileInput.value = "";
      renderAttachmentChip();
    });
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      attachedFile = fileInput.files[0];
      renderAttachmentChip();
    }
  });

  function appendMessage(role, content) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    if (typeof content === "string") {
      div.textContent = content;
    } else {
      div.appendChild(content);
    }
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
  }

  function typingIndicator() {
    const span = document.createElement("span");
    span.className = "typing-dots";
    span.innerHTML = "<span></span><span></span><span></span>";
    return span;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message && !attachedFile) return;
    clearAlert(alertBox);

    const userLabel = attachedFile ? `${message}${message ? "\n" : ""}📎 ${attachedFile.name}` : message;
    appendMessage("user", userLabel);

    const loadingEl = appendMessage("assistant", typingIndicator());

    const formData = new FormData();
    formData.append("message", message);
    formData.append("mode", currentMode);
    formData.append("history", JSON.stringify(history));
    if (attachedFile) formData.append("file", attachedFile);

    chatInput.value = "";
    const sentFile = attachedFile;
    attachedFile = null;
    fileInput.value = "";
    renderAttachmentChip();
    sendBtn.disabled = true;

    try {
      const data = await apiFetch("/api/ai/chat", { method: "POST", body: formData });
      loadingEl.textContent = data.reply;
      history.push({ role: "user", content: sentFile ? `${message} (fichier joint : ${sentFile.name})` : message });
      history.push({ role: "assistant", content: data.reply });
    } catch (err) {
      loadingEl.remove();
      showAlert(alertBox, err.message);
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
