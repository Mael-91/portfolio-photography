// --- CONTACT / NETLIFY FORMS (AJAX) ---

function encodeForm(form) {
  const formData = new FormData(form);
  // Netlify: body URL-encoded recommandé pour les données simples
  return new URLSearchParams(formData).toString();
}

function setStatus(type, message) {
  const el = document.getElementById("contactStatus");
  if (!el) return;
  el.className = "contact__status " + (type ? `is-${type}` : "");
  el.textContent = message || "";
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field__error").forEach((e) => (e.textContent = ""));
}

function showFieldError(input, message) {
  const form = input.closest("form");
  const err = form?.querySelector(`[data-error-for="${input.id}"]`);
  if (err) err.textContent = message;
}

function validateForm(form) {
  clearFieldErrors(form);
  setStatus("", "");

  // Utilise les contraintes HTML (required, type=email, etc.)
  const inputs = Array.from(form.querySelectorAll("input, textarea, select"));

  let ok = true;

  for (const el of inputs) {
    if (!el.willValidate) continue;

    // force la validation du champ
    if (!el.checkValidity()) {
      ok = false;

      // Messages propres (tu peux affiner ensuite)
      let msg = el.validationMessage;

      if (el.type === "email" && el.validity.typeMismatch) {
        msg = "Merci de saisir une adresse email valide.";
      } else if (el.type === "checkbox" && el.validity.valueMissing) {
        msg = "Merci de cocher cette case.";
      } else if (el.validity.valueMissing) {
        msg = "Ce champ est obligatoire.";
      }

      showFieldError(el, msg);
    }
  }

  if (!ok) {
    setStatus("error", "Merci de corriger les champs en surbrillance.");
  }

  return ok;
}

function showFormByType(type) {
  const pro = document.getElementById("formPro");
  const part = document.getElementById("formPart");
  const info = document.getElementById("formInfo");

  [pro, part, info].forEach((f) => f?.classList.add("is-hidden"));
  setStatus("", "");

  if (type === "pro") pro?.classList.remove("is-hidden");
  if (type === "part") part?.classList.remove("is-hidden");
  if (type === "info") info?.classList.remove("is-hidden");
}

async function handleNetlifyAjaxSubmit(e) {
  e.preventDefault();

  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (!validateForm(form)) return;

  setStatus("loading", "Envoi en cours…");

  try {
    const body = encodeForm(form);

    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // OK
    form.reset();
    setStatus("success", "Message envoyé avec succès. Je reviens vers vous rapidement.");
  } catch (err) {
    console.error(err);
    setStatus(
      "error",
      "Une erreur est survenue lors de l’envoi. Réessayez ou contactez-moi par email."
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("contactType");
  if (select) {
    showFormByType(select.value);
    select.addEventListener("change", () => showFormByType(select.value));
  }

  // Branche les 3 forms
  ["formPro", "formPart", "formInfo"].forEach((id) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("submit", handleNetlifyAjaxSubmit);
  });
});
