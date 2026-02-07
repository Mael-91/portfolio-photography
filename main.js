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

    // ✅ IMPORTANT : appeler après injection du HTML
    applyImageRatios();
  } catch (e) {
    console.error("Erreur chargement automotive.json :", e);
    grid.innerHTML = `<p style="text-align:center;color:#5B4F3E;">Impossible de charger la galerie pour le moment.</p>`;
  }
}

/* ✅ Détection du ratio réel des images (hors de loadAutomotiveGrid) */
function applyImageRatios() {
  const images = document.querySelectorAll(".auto__img");

  images.forEach((img) => {
    if (img.complete && img.naturalWidth) {
      setRatioClass(img);
    } else {
      img.addEventListener("load", () => setRatioClass(img), { once: true });
    }
  });
}

function setRatioClass(img) {
  const ratio = img.naturalWidth / img.naturalHeight;

  if (ratio >= 1.8) {
    img.classList.add("is-wide");
    img.classList.remove("is-standard");
  } else {
    img.classList.add("is-standard");
    img.classList.remove("is-wide");
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

// Désactiver clic droit / drag / drop uniquement sur la grille automobile
document.addEventListener("contextmenu", (e) => {
  const target = e.target;
  if (target && target.closest && target.closest("#autoGrid")) {
    e.preventDefault();
  }
});

document.addEventListener("dragstart", (e) => {
  const target = e.target;
  if (target && target.closest && target.closest("#autoGrid")) {
    e.preventDefault();
  }
});

document.addEventListener("drop", (e) => {
  const target = e.target;
  if (target && target.closest && target.closest("#autoGrid")) {
    e.preventDefault();
  }
});

/* ✅ Un seul callback ici */
document.addEventListener("DOMContentLoaded", loadAutomotiveGrid);
