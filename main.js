async function loadAutomotiveGrid() {
  const grid = document.getElementById("autoGrid");
  if (!grid) return;

  const API_URL = "https://api.maelconstantin.fr/portfolio-images";
  const FALLBACK_JSON_URL = "./data/automotive.json";
  const CACHE_KEY = "portfolio_images_public_cache_v1";

  try {
    const apiItems = await fetchPortfolioImagesFromApi(API_URL);

    if (Array.isArray(apiItems) && apiItems.length > 0) {
      const normalizedItems = normalizePortfolioItems(apiItems);

      savePortfolioCache(CACHE_KEY, normalizedItems);
      renderAutomotiveGrid(grid, normalizedItems);
      return;
    }

    throw new Error("API vide ou format invalide");
  } catch (apiError) {
    console.warn("API portfolio indisponible, tentative via cache local :", apiError);

    const cachedItems = loadPortfolioCache(CACHE_KEY);

    if (Array.isArray(cachedItems) && cachedItems.length > 0) {
      renderAutomotiveGrid(grid, cachedItems);
      return;
    }

    try {
      const fallbackItems = await fetchFallbackJson(FALLBACK_JSON_URL);

      if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
        renderAutomotiveGrid(grid, fallbackItems);
        return;
      }

      throw new Error("Fallback JSON vide ou invalide");
    } catch (fallbackError) {
      console.error("Impossible de charger la galerie :", fallbackError);
      grid.innerHTML = `<p style="text-align:center;color:#5B4F3E;">Impossible de charger la galerie pour le moment.</p>`;
    }
  }
}

async function fetchPortfolioImagesFromApi(apiUrl) {
  const res = await fetch(apiUrl, {
    method: "GET",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}`);
  }

  return res.json();
}

async function fetchFallbackJson(jsonUrl) {
  const res = await fetch(jsonUrl, {
    method: "GET",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Fallback HTTP ${res.status}`);
  }

  return res.json();
}

function normalizePortfolioItems(items) {
  return items
    .map((item) => {
      const src =
        item.image_url ??
        item.src ??
        item.url ??
        "";

      const caption =
        item.caption ??
        item.title ??
        "";

      const alt =
        item.alt_text ??
        item.alt ??
        caption ??
        "Photographie automobile";

      const displayOrder =
        Number(item.display_order ?? 999999);

      return {
        src,
        caption,
        alt,
        display_order: displayOrder
      };
    })
    .filter((item) => item.src)
    .sort((a, b) => a.display_order - b.display_order);
}

function renderAutomotiveGrid(grid, items) {
  grid.innerHTML = items
    .slice(0, 6)
    .map((item) => {
      return `
        <figure class="auto__card">
          <img
            class="auto__img"
            src="${escapeHtml(item.src)}"
            alt="${escapeHtml(item.alt)}"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="auto__caption">${escapeHtml(item.caption ?? "")}</figcaption>
        </figure>
      `;
    })
    .join("");

  applyImageRatios();
}

function savePortfolioCache(key, items) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        items
      })
    );
  } catch (error) {
    console.warn("Impossible de sauvegarder le cache local portfolio :", error);
  }
}

function loadPortfolioCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;

    return parsed.items;
  } catch (error) {
    console.warn("Impossible de lire le cache local portfolio :", error);
    return null;
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
  const tabPro = document.getElementById("servicesTabPro");
  const tabPart = document.getElementById("servicesTabPart");

  if (!titleEl || !introEl || !fromEl || !gridEl || !ctaEl || !tabPro || !tabPart) return;

  try {
    const res = await fetch("./data/services.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    titleEl.textContent = data.sectionTitle ?? "PRESTATIONS";
    introEl.textContent = data.intro ?? "";

    let currentMode = "pro";

    function renderServices(mode) {
      const modeData = data.modes?.[mode];
      if (!modeData) return;

      currentMode = mode;

      // Toggle boutons
      tabPro.classList.toggle("is-active", mode === "pro");
      tabPart.classList.toggle("is-active", mode === "part");
      tabPro.setAttribute("aria-selected", String(mode === "pro"));
      tabPart.setAttribute("aria-selected", String(mode === "part"));

      // Affichage du "À partir de..." uniquement pour pro
      if (mode === "pro") {
        const fromLabel = modeData.fromLabel ?? "À partir de";
        const fromPrice = modeData.fromPrice ?? "";
        const fromNote = modeData.fromNote ?? "";

        fromEl.innerHTML = `
          <span class="services__from-label">${escapeHtml(fromLabel)}</span>
          <span class="services__from-price">${escapeHtml(fromPrice)}</span>
          <span class="services__from-note">${escapeHtml(fromNote)}</span>
        `;
        fromEl.hidden = false;
      } else {
        fromEl.innerHTML = "";
        fromEl.hidden = true;
      }

      // Cards
      const cards = Array.isArray(modeData.cards) ? modeData.cards : [];
      gridEl.innerHTML = cards
        .map((card) => {
          const title = card.title ?? "";
          const type = card.type ?? "list";
          const text = card.text ?? "";
          const items = Array.isArray(card.items) ? card.items : [];
          const price = card.price ?? "";

          const listHtml = items.length
            ? `<ul class="services__list">${items.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`
            : "";

          const textHtml = text
            ? `<p class="services__text">${escapeHtml(text)}</p>`
            : "";

          const priceHtml = price
            ? `<p class="services__price">${escapeHtml(price)}</p>`
            : "";

          return `
            <article class="services__card">
              <h3 class="services__card-title">${escapeHtml(title)}</h3>
              ${type === "mixed" ? `${textHtml}${listHtml}` : type === "text" ? textHtml : listHtml}
              ${priceHtml}
            </article>
          `;
        })
        .join("");

      // CTA
      const cta = modeData.cta ?? {};
      const primaryText = cta.primaryText ?? "Demander un devis";
      const primaryHref = cta.primaryHref ?? "#contact";

      ctaEl.innerHTML = `
        <a class="services__btn services__btn--primary" href="${escapeHtml(primaryHref)}">
          ${escapeHtml(primaryText)}
        </a>
      `;
    }

    tabPro.addEventListener("click", () => renderServices("pro"));
    tabPart.addEventListener("click", () => renderServices("part"));

    renderServices("pro");
  } catch (e) {
    console.error("Erreur chargement services.json :", e);
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
