const API_ENDPOINT = "https://api.maelconstantin.fr/contact";

document.addEventListener("DOMContentLoaded", () => {
  const contactType = document.getElementById("contactType");
  const formPro = document.getElementById("formPro");
  const formPart = document.getElementById("formPart");
  const formInfo = document.getElementById("formInfo");

  const forms = [formPro, formPart, formInfo].filter(Boolean);

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

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn ? submitBtn.textContent : "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi...";
      }

      try {
        const formData = new FormData(form);
        const requestType = formData.get("request_type");

        // Honeypot simple si tu gardes bot-field dans le HTML
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
            phone: toRequiredString(formData.get("phone")),
            message: toRequiredString(formData.get("message")),
            allow_phone_contact: formData.get("allow_phone_contact") === "on"
          };
        } else if (requestType === "part") {
          data = {
            request_type: "part",
            first_name: toRequiredString(formData.get("first_name")),
            last_name: toRequiredString(formData.get("last_name")),
            email: toRequiredString(formData.get("email")),
            phone: toRequiredString(formData.get("phone")),
            message: toRequiredString(formData.get("message")),
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

        console.log("DATA SENT TO API:", data);

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
  const box = form.querySelector(".form__message");
  if (box) {
    box.remove();
  }
}