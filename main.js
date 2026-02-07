async function loadAutomotiveGrid() {
  const grid = document.getElementById("autoGrid");
  if (!grid) return;

  try {
    const res = await fetch("./data/automotive.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    grid.innerHTML = items
      .slice(0, 6)
      .map((item) => {
        const src = item.src ?? "";
        const caption = item.caption ?? "";
        const alt = item.alt ?? caption ?? "Photographie automobile";
        return `
          <figure class="auto__card">
            <img class="auto__img" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />
            <figcaption class="auto__caption">${escapeHtml(caption)}</figcaption>
          </figure>
        `;
      })
      .join("");
  } catch (e) {
    console.error("Erreur chargement automotive.json :", e);
    grid.innerHTML = `<p style="text-align:center;color:#5B4F3E;">Impossible de charger la galerie pour le moment.</p>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", loadAutomotiveGrid);
