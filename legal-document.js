document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("legalContent");
  const meta = document.getElementById("legalMeta");
  const type = document.body.dataset.documentType;

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

    // Meta info
    if (meta) {
      const date = doc.publishedAt
        ? new Date(doc.publishedAt).toLocaleDateString("fr-FR")
        : "date inconnue";

      meta.innerText = `Version ${doc.versionLabel} — publiée le ${date}`;
    }

  } catch (err) {
    console.error(err);

    container.innerHTML = `
      <p>Impossible de charger le document pour le moment.</p>
    `;
  }
});