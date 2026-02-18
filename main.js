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

async function loadServices() {
  const titleEl = document.getElementById("servicesTitle");
  const introEl = document.getElementById("servicesIntro");
  const fromEl = document.getElementById("servicesFrom");
  const gridEl = document.getElementById("servicesGrid");
  const ctaEl = document.getElementById("servicesCta");

  // Si la section n'existe pas sur la page, on ne fait rien
  if (!titleEl || !introEl || !fromEl || !gridEl || !ctaEl) return;

  try {
    const res = await fetch("./data/services.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Header
    titleEl.textContent = data.sectionTitle ?? "PRESTATIONS";
    introEl.textContent = data.intro ?? "";

    const fromLabel = data.fromLabel ?? "À partir de";
    const fromPrice = data.fromPrice ?? "";
    const fromNote = data.fromNote ?? "";

    fromEl.innerHTML = `
      <span class="services__from-label">${escapeHtml(fromLabel)}</span>
      <span class="services__from-price">${escapeHtml(fromPrice)}</span>
      <span class="services__from-note">${escapeHtml(fromNote)}</span>
    `;

    // Cards
    const cards = Array.isArray(data.cards) ? data.cards : [];
    gridEl.innerHTML = cards
      .map((card) => {
        const title = card.title ?? "";
        const type = card.type ?? "list";
        const text = card.text ?? "";
        const items = Array.isArray(card.items) ? card.items : [];

        const listHtml = items.length
          ? `<ul class="services__list">${items.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`
          : "";

        const textHtml = text
          ? `<p class="services__text">${escapeHtml(text)}</p>`
          : "";

        return `
          <article class="services__card">
            <h3 class="services__card-title">${escapeHtml(title)}</h3>
            ${type === "mixed" ? `${textHtml}${listHtml}` : type === "text" ? textHtml : listHtml}
          </article>
        `;
      })
      .join("");

    // CTA
    const cta = data.cta ?? {};
    const primaryText = cta.primaryText ?? "Demander un devis";
    const primaryHref = cta.primaryHref ?? "#contact";
    const secondaryText = cta.secondaryText ?? "Voir des projets récents sur Instagram";
    const instagramHref = cta.instagramHref ?? "#";

    ctaEl.innerHTML = `
      <a class="services__btn services__btn--primary" href="${escapeHtml(primaryHref)}">
        ${escapeHtml(primaryText)}
      </a>
    `;
  } catch (e) {
    console.error("Erreur chargement services.json :", e);
    // fallback minimal
    titleEl.textContent = "PRESTATIONS";
    introEl.textContent = "";
    fromEl.textContent = "";
    gridEl.innerHTML = `<p style="text-align:center;color:#5B4F3E;">Impossible de charger les prestations pour le moment.</p>`;
    ctaEl.innerHTML = "";
  }
}

let footerLoading = false;
let footerLoaded = false;

async function loadFooter() {
  const container = document.getElementById("site-footer");
  if (!container) return;

  // Empêche double chargement
  if (footerLoaded || footerLoading) return;

  footerLoading = true;

  try {
    const res = await fetch("/components/footer.html", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    container.innerHTML = await res.text();
    container.removeAttribute("aria-hidden");

    // Année dynamique
    const yearEl = container.querySelector("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    footerLoaded = true;
  } catch (err) {
    console.error("Erreur chargement footer:", err);
  } finally {
    footerLoading = false;
  }
}

async function loadAbout() {
  const textEl = document.getElementById("aboutText");
  if (!textEl) return;

  try {
    const res = await fetch("./data/about.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];

    textEl.innerHTML = paragraphs
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join("");

  } catch (err) {
    console.error("Erreur chargement about.json :", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadFooter();
  loadAutomotiveGrid();
  loadServices();
  loadAbout();
});
