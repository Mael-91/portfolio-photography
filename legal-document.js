document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("legalContent");
  const type = document.body.dataset.documentType;
  const dateElement = document.getElementById("legalDate");

  if (!type || !container) return;

  try {
    const res = await fetch(`https://api.maelconstantin.fr/legal-documents/${type}`);

    if (!res.ok) {
      throw new Error("Erreur API");
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error("Document non trouvé");
    }

    const doc = data.document;

    // Injection HTML
    container.innerHTML = doc.contentHtml;

    if (dateElement) {
        const date = doc.publishedAt
          ? new Date(doc.publishedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "date inconnue";

        dateElement.innerText = `${date} — Version ${doc.versionLabel}`;
    }

  } catch (err) {
    console.error(err);

    container.innerHTML = `
      <p>Impossible de charger le document pour le moment.</p>
    `;
  }
});