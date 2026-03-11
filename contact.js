const API_ENDPOINT = "https://api.maelconstantin.fr/contact";

document.addEventListener("DOMContentLoaded", () => {

  const forms = document.querySelectorAll(".contact__form");

  forms.forEach((form) => {

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi...";

      try {

        const formData = new FormData(form);

        const data = {
          request_type: formData.get("request_type"),
          first_name: formData.get("first_name") || null,
          last_name: formData.get("last_name") || null,
          company: formData.get("company") || null,
          email: formData.get("email"),
          phone: formData.get("phone") || null,
          message: formData.get("message"),
          allow_phone_contact: formData.get("allow_phone_contact") === "on",
          consent_privacy: formData.get("consent_privacy") === "on"
        };

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
          throw new Error("Réponse serveur invalide");
        }

        if (!response.ok || result.success === false) {

          const message =
            result?.error ||
            "Une erreur est survenue lors de l'envoi du formulaire.";

          showMessage(form, message, "error");
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
          "Impossible d'envoyer le formulaire. Vérifiez votre connexion ou réessayez plus tard.",
          "error"
        );

      } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

      }

    });

  });

});


function showMessage(form, message, type) {

  let box = form.querySelector(".form__message");

  if (!box) {
    box = document.createElement("div");
    box.className = "form__message";
    form.prepend(box);
  }

  box.textContent = message;

  box.classList.remove("form__message--success");
  box.classList.remove("form__message--error");

  if (type === "success") {
    box.classList.add("form__message--success");
  } else {
    box.classList.add("form__message--error");
  }

}