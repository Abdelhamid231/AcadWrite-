const PAYMENT_METHODS = {
  ccp: {
    label: "CCP (Compte Courant Postal)",
    instructions: "Effectuez un versement au compte CCP n&deg; 0021 0000 1234 56 cle 78, au nom de AcadWrite+, puis televersez votre recu.",
  },
  baridimob: {
    label: "BaridiMob",
    instructions: "Envoyez le montant via l'application BaridiMob au numero 05 55 12 34 56, puis televersez la capture de confirmation.",
  },
  edahabia: {
    label: "Carte Edahabia",
    instructions: "Payez en ligne avec votre carte Edahabia (lien de paiement transmis par email), puis televersez le recu de paiement.",
  },
  virement: {
    label: "Virement bancaire",
    instructions: "Effectuez un virement bancaire vers le RIB communique par email, puis televersez le justificatif de virement.",
  },
  especes: {
    label: "Especes (sur place)",
    instructions: "Payez en especes directement dans nos locaux et indiquez la reference du recu remis.",
  },
};

const PAYMENT_STATUS_LABELS = {
  en_attente: "En attente de validation",
  valide: "Valide",
  refuse: "Refuse",
};

function getRequestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadRequest() {
  const alertBox = document.getElementById("alert-box");
  const detailEl = document.getElementById("request-detail");
  const paymentSection = document.getElementById("payment-section");
  const id = getRequestId();

  if (!id) {
    detailEl.innerHTML = `<p class="muted">Aucune demande specifiee.</p>`;
    return;
  }

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

  try {
    const data = await apiFetch(`/api/requests/${id}`);
    const r = data.request;

    detailEl.innerHTML = `
      <div class="card">
        <h2>${r.title} ${statusBadge(r.status)}</h2>
        <p><strong>Type :</strong> ${TYPE_LABELS[r.type] || r.type}</p>
        ${r.type === "traduction" ? `<p><strong>Langues :</strong> ${r.source_lang} &rarr; ${r.target_lang}</p>` : ""}
        <p><strong>Description :</strong> ${r.description ? r.description : "-"}</p>
        <p><strong>Deposee le :</strong> ${formatDate(r.created_at)}</p>
        ${r.file_path ? `<p><a href="/api/requests/${r.id}/file">Telecharger mon document depose</a></p>` : ""}
        ${r.price ? `<p><strong>Devis :</strong> ${r.price} DA</p>` : `<p class="muted">Devis non encore fixe. Un administrateur va evaluer votre demande.</p>`}
        ${r.admin_note ? `<p><strong>Remarque de l'equipe :</strong> ${r.admin_note}</p>` : ""}
        ${r.result_file_path ? `<p><a href="/api/requests/${r.id}/result">Telecharger le fichier corrige / traduit</a></p>` : ""}
      </div>
    `;

    renderPaymentSection(paymentSection, r, data.payments || []);
  } catch (err) {
    showAlert(alertBox, err.message);
  }
}

function renderPaymentSection(container, request, payments) {
  const history = payments.length
    ? `
      <div class="card">
        <h3>Historique des paiements</h3>
        <table>
          <thead><tr><th>Methode</th><th>Reference</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>
            ${payments
              .map(
                (p) => `
              <tr>
                <td>${PAYMENT_METHODS[p.method]?.label || p.method}</td>
                <td>${p.reference || "-"}</td>
                <td>${PAYMENT_STATUS_LABELS[p.status] || p.status}</td>
                <td>${formatDate(p.created_at)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : "";

  const hasPendingOrValid = payments.some((p) => p.status === "en_attente" || p.status === "valide");
  const canPay = request.price && !hasPendingOrValid;

  if (!canPay) {
    container.innerHTML = history;
    return;
  }

  container.innerHTML = `
    ${history}
    <div class="card">
      <h3>Payer le devis (${request.price} DA)</h3>
      <div id="pay-alert"></div>
      <div class="pay-methods" id="pay-methods">
        ${Object.entries(PAYMENT_METHODS)
          .map(
            ([key, m], i) => `
          <div class="pay-method${i === 0 ? " selected" : ""}" data-method="${key}">
            <strong>${m.label}</strong>
          </div>
        `
          )
          .join("")}
      </div>
      <p class="small muted" id="pay-instructions">${Object.values(PAYMENT_METHODS)[0].instructions}</p>
      <form class="form" id="payment-form" enctype="multipart/form-data">
        <input type="hidden" name="method" id="method-input" value="${Object.keys(PAYMENT_METHODS)[0]}">
        <div class="field">
          <label for="reference">Reference / numero de transaction</label>
          <input type="text" id="reference" name="reference" placeholder="Ex: numero de recu ou de transaction">
        </div>
        <div class="field">
          <label for="proof">Justificatif (capture ou photo du recu - PDF/JPG/PNG)</label>
          <input type="file" id="proof" name="proof" accept=".pdf,.jpg,.jpeg,.png">
        </div>
        <button type="submit" class="btn secondary">Declarer mon paiement</button>
      </form>
    </div>
  `;

  const methodEls = container.querySelectorAll(".pay-method");
  methodEls.forEach((el) => {
    el.addEventListener("click", () => {
      methodEls.forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
      const method = el.dataset.method;
      document.getElementById("method-input").value = method;
      document.getElementById("pay-instructions").textContent = PAYMENT_METHODS[method].instructions;
    });
  });

  const payForm = document.getElementById("payment-form");
  const paySubmitBtn = payForm.querySelector("button[type=submit]");
  payForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payAlert = document.getElementById("pay-alert");
    clearAlert(payAlert);
    setButtonLoading(paySubmitBtn, true, "Envoi en cours...");
    const formData = new FormData(payForm);
    formData.set("request_id", request.id);
    try {
      await apiFetch("/api/payments", { method: "POST", body: formData });
      showAlert(payAlert, "Paiement declare ! Il sera valide par notre equipe.", "success");
      setTimeout(loadRequest, 1200);
    } catch (err) {
      showAlert(payAlert, err.message);
      setButtonLoading(paySubmitBtn, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", loadRequest);
