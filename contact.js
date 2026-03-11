const API_ENDPOINT = "https://api.maelconstantin.fr/contact";

document.addEventListener("DOMContentLoaded", () => {
  const contactType = document.getElementById("contactType");
  const formPro = document.getElementById("formPro");
  const formPart = document.getElementById("formPart");
  const formInfo = document.getElementById("formInfo");

  const forms = [formPro, formPart, formInfo].filter(Boolean);

  document.querySelectorAll('input[name="consent_privacy"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        const form = input.closest("form");
        const errorEl = form?.querySelector(`[data-error-for="${input.id}"]`);
        if (errorEl) {
          errorEl.textContent = "";
        }
        clearMessage(form);
      }
    });
  });

  document.querySelectorAll('input[name="allow_phone_contact"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        const form = input.closest("form");
        const errorEl = form?.querySelector(`[data-error-for="${input.id}"]`);
        if (errorEl) {
          errorEl.textContent = "";
        }
        clearMessage(form);
      }
    });
  });

  function showForm(type) {
    if (!formPro || !formPart || !formInfo) return;

    formPro.classList.toggle("is-hidden", type !== "pro");
    formPart.classList.toggle("is-hidden", type !== "part");
    formInfo.classList.toggle("is-hidden", type !== "info");
  }

  if (contactType) {
    showForm(contactType.value);

    contactType.addEventListener("change", (e) => {
      showForm(e.target.value);
    });
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      clearMessage(form);
      clearFieldErrors(form);

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn ? submitBtn.textContent : "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi...";
      }

      try {
        const formData = new FormData(form);
        const requestType = formData.get("request_type");

        const isValid = validateForm(form, requestType, formData);

        if (!isValid) {
          showMessage(
            form,
            "Veuillez corriger les champs du formulaire avant l’envoi.",
            "error"
          );
          return;
        }

        if (formData.get("bot-field")) {
          throw new Error("Envoi invalide.");
        }

        let data = null;

        if (requestType === "pro") {
          data = {
            request_type: "pro",
            first_name: toNullableString(formData.get("first_name")),
            last_name: toNullableString(formData.get("last_name")),
            company: toNullableString(formData.get("company")),
            email: toRequiredString(formData.get("email")),
            phone: toNullableString(formData.get("phone")),
            message: toRequiredString(formData.get("message")),
            allow_phone_contact: formData.get("allow_phone_contact") === "on",
            consent_privacy: formData.get("consent_privacy") === "on"
          };
        } else if (requestType === "part") {
          data = {
            request_type: "part",
            first_name: toRequiredString(formData.get("first_name")),
            last_name: toRequiredString(formData.get("last_name")),
            email: toRequiredString(formData.get("email")),
            phone: toNullableString(formData.get("phone")),
            message: toRequiredString(formData.get("message")),
            allow_phone_contact: formData.get("allow_phone_contact") === "on",
            consent_privacy: formData.get("consent_privacy") === "on"
          };
        } else if (requestType === "info") {
          data = {
            request_type: "info",
            first_name: toRequiredString(formData.get("first_name")),
            last_name: toRequiredString(formData.get("last_name")),
            email: toRequiredString(formData.get("email")),
            message: toRequiredString(formData.get("message")),
            consent_privacy: formData.get("consent_privacy") === "on"
          };
        } else {
          throw new Error("Type de formulaire invalide.");
        }

        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });

        let result = null;
        try {
          result = await response.json();
        } catch {
          throw new Error("Réponse serveur invalide.");
        }

        if (!response.ok) {
          const apiMessage =
            result?.message ||
            result?.error ||
            extractZodErrors(result?.errors) ||
            "Une erreur est survenue lors de l'envoi du formulaire.";

          showMessage(form, apiMessage, "error");
          return;
        }

        showMessage(
          form,
          "Votre message a bien été envoyé. Je vous répondrai rapidement.",
          "success"
        );

        form.reset();
      } catch (error) {
        console.error("Erreur formulaire :", error);

        showMessage(
          form,
          error?.message || "Impossible d'envoyer le formulaire. Réessayez plus tard.",
          "error"
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });
});

function validateForm(form, requestType, formData) {
  let valid = true;

  const requiredByType = {
    pro: ["company", "email", "message"],
    part: ["first_name", "last_name", "email", "message"],
    info: ["first_name", "last_name", "email", "message"]
  };

  const requiredFields = requiredByType[requestType] || [];

  requiredFields.forEach((fieldName) => {
    const input = form.querySelector(`[name="${fieldName}"]`);
    const value = formData.get(fieldName);

    if (!input) return;

    if (!String(value ?? "").trim()) {
      valid = false;
      showFieldError(form, input.id, getRequiredMessage(fieldName));
    }
  });

  const emailInput = form.querySelector('[name="email"]');
  const emailValue = formData.get("email");

  if (emailInput && String(emailValue ?? "").trim()) {
    if (!isValidEmail(String(emailValue).trim())) {
      valid = false;
      showFieldError(form, emailInput.id, "Veuillez renseigner une adresse mail valide.");
    }
  }

  const phoneInput = form.querySelector('[name="phone"]');
  const phoneValue = formData.get("phone");

  if (phoneInput && String(phoneValue ?? "").trim()) {
    if (!isValidPhone(String(phoneValue).trim())) {
      valid = false;
      showFieldError(form, phoneInput.id, "Veuillez renseigner un numéro de téléphone valide.");
    }
  }

  if (requestType === "part" || requestType === "info" || requestType === "pro") {
    const consentInput = form.querySelector('input[name="consent_privacy"]');
    if (consentInput) {
      const consentChecked = formData.get("consent_privacy") === "on";

      if (!consentChecked) {
        valid = false;
        showFieldError(
          form,
          consentInput.id,
          "Vous devez accepter la politique de confidentialité."
        );
      }
    }
  }

  return valid;
}

function getRequiredMessage(fieldName) {
  const messages = {
    first_name: "Le prénom est obligatoire.",
    last_name: "Le nom est obligatoire.",
    company: "La société est obligatoire.",
    email: "L’adresse mail est obligatoire.",
    phone: "Le téléphone est obligatoire.",
    message: "Le message est obligatoire."
  };

  return messages[fieldName] || "Ce champ est obligatoire.";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const normalized = phone.replace(/[\s().-]/g, "");

  // format international +33XXXXXXXXX
  if (/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    return true;
  }

  // format français 0X XX XX XX XX
  if (/^0\d{9}$/.test(normalized)) {
    return true;
  }

  return false;
}

function toRequiredString(value) {
  return String(value ?? "").trim();
}

function toNullableString(value) {
  const str = String(value ?? "").trim();
  return str === "" ? null : str;
}

function extractZodErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors.map((err) => err.message).filter(Boolean).join(" ");
}

function showMessage(form, message, type) {
  if (!form) return;

  let box = form.querySelector(".form__message");

  if (!box) {
    box = document.createElement("div");
    box.className = "form__message";
    form.prepend(box);
  }

  box.textContent = message;
  box.classList.remove("form__message--success", "form__message--error");
  box.classList.add(type === "success" ? "form__message--success" : "form__message--error");
}

function clearMessage(form) {
  if (!form) return;

  const box = form.querySelector(".form__message");
  if (box) {
    box.remove();
  }
}

function showFieldError(form, fieldId, message) {
  const errorEl = form.querySelector(`[data-error-for="${fieldId}"]`);
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearFieldErrors(form) {
  const errors = form.querySelectorAll(".field__error");
  errors.forEach((el) => {
    el.textContent = "";
  });
}