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
  const ASSET_BASE_URL = "https://admin-api.maelconstantin.fr";

  return items
    .map((item) => {
      let src = item.fileUrl ?? item.file_url ?? item.src ?? item.url ?? "";

      if (src && !src.startsWith("http://") && !src.startsWith("https://")) {
        src = `${ASSET_BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
      }

      return {
        src: src,
        caption: item.caption ?? "Photographie automobile",
        alt: item.altText ?? item.caption ?? "Photographie automobile",
        display_order: Number(item.displayOrder ?? 999999)
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

  const API_URL = "https://api.maelconstantin.fr/services";
  const FALLBACK_JSON_URL = "./data/services.json";

  let currentType = "pro";
  let servicesData = null;

  try {
    const [apiRes, fallbackRes] = await Promise.all([
      fetch(API_URL, { cache: "no-store" }),
      fetch(FALLBACK_JSON_URL, { cache: "no-store" })
    ]);

    if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);
    const fallbackData = await fallbackRes.json();

    if (!apiRes.ok) throw new Error(`API HTTP ${apiRes.status}`);
    const apiData = await apiRes.json();

    servicesData = normalizeServicesApiData(apiData, fallbackData);
  } catch (error) {
    console.warn("API services indisponible, fallback JSON :", error);

    try {
      const fallbackRes = await fetch(FALLBACK_JSON_URL, { cache: "no-store" });
      if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);
      const fallbackData = await fallbackRes.json();

      servicesData = normalizeFallbackServicesData(fallbackData);
    } catch (fallbackError) {
      console.error("Impossible de charger les services :", fallbackError);

      titleEl.textContent = "PRESTATIONS";
      introEl.textContent = "";
      fromEl.innerHTML = "";
      gridEl.innerHTML = `<p style="text-align:center;">Impossible de charger les prestations.</p>`;
      ctaEl.innerHTML = "";
      return;
    }
  }

  // ✅ TITRE
  titleEl.textContent = servicesData.sectionTitle ?? "PRESTATIONS";

  // ✅ INTRO FIXE (toujours visible au-dessus du toggle)
  introEl.textContent =
    servicesData.generalIntro ??
    "Chaque projet est unique. Les prestations sont définies selon vos besoins, le contexte et l’usage des images.";

  function renderServices(type) {
    currentType = type;

    const modeData = servicesData?.modes?.[type];
    if (!modeData) return;

    // ✅ Toggle (inchangé)
    tabPro.classList.toggle("is-active", type === "pro");
    tabPart.classList.toggle("is-active", type === "private");

    tabPro.setAttribute("aria-selected", String(type === "pro"));
    tabPart.setAttribute("aria-selected", String(type === "private"));

    // ✅ TEXTE DYNAMIQUE SOUS LE TOGGLE
    if (modeData.introEnabled) {
      if (modeData.introHtml) {
        fromEl.innerHTML = modeData.introHtml;
      } else if (
        modeData.fromLabel ||
        modeData.fromPrice ||
        modeData.fromNote
      ) {
        fromEl.innerHTML = `
          <span class="services__from-label">${escapeHtml(modeData.fromLabel ?? "")}</span>
          <span class="services__from-price">${escapeHtml(modeData.fromPrice ?? "")}</span>
          <span class="services__from-note">${escapeHtml(modeData.fromNote ?? "")}</span>
        `;
      } else {
        fromEl.innerHTML = "";
      }

      fromEl.hidden = false;
    } else {
      fromEl.innerHTML = "";
      fromEl.hidden = true;
    }

    // ✅ CARTES
    const cards = Array.isArray(modeData.cards) ? modeData.cards : [];

    gridEl.innerHTML = cards
      .map((card) => {
        const title = card.title ?? "";

        const bodyHtml =
          card.bodyEnabled && card.bodyHtml
            ? `<div class="services__text">${card.bodyHtml}</div>`
            : "";

        const bulletsHtml =
          card.bulletsEnabled && Array.isArray(card.bullets) && card.bullets.length
            ? `<ul class="services__list">${card.bullets
                .map((li) => `<li>${escapeHtml(li)}</li>`)
                .join("")}</ul>`
            : "";

        const priceHtml =
          card.priceEnabled && card.priceLabel
            ? `<p class="services__price">${escapeHtml(card.priceLabel)}</p>`
            : "";

        return `
          <article class="services__card">
            <h3 class="services__card-title">${escapeHtml(title)}</h3>
            ${bodyHtml}
            ${bulletsHtml}
            ${priceHtml}
          </article>
        `;
      })
      .join("");

    // ✅ CTA
    const cta = modeData.cta ?? servicesData.cta ?? {};
    const primaryText = cta.primaryText ?? "Demander un devis";
    const primaryHref = cta.primaryHref ?? "#contact";

    ctaEl.innerHTML = `
      <a class="services__btn services__btn--primary" href="${escapeHtml(primaryHref)}">
        ${escapeHtml(primaryText)}
      </a>
    `;
  }

  // ✅ Toggle listeners (inchangé)
  tabPro.addEventListener("click", () => renderServices("pro"));
  tabPart.addEventListener("click", () => renderServices("private"));

  // ✅ Initial render
  renderServices(currentType);
}

function normalizeServicesApiData(apiData, fallbackData) {
  return {
    sectionTitle: fallbackData?.sectionTitle ?? "PRESTATIONS",
    generalIntro:
      fallbackData?.intro ??
      "Chaque projet est unique. Les prestations sont définies selon vos besoins, le contexte et l’usage des images.",
    cta: fallbackData?.cta ?? {
      primaryText: "Demander un devis",
      primaryHref: "#contact"
    },
    modes: {
      pro: {
        introEnabled: !!apiData?.pro?.introEnabled,

        // priorité admin
        introHtml: apiData?.pro?.introHtml ?? null,

        // fallback JSON actuel
        fromLabel: fallbackData?.fromLabel ?? "",
        fromPrice: fallbackData?.fromPrice ?? "",
        fromNote: fallbackData?.fromNote ?? "",

        cards: normalizeServiceCards(apiData?.pro?.cards),
        cta: fallbackData?.cta
      },

      private: {
        introEnabled: !!apiData?.private?.introEnabled,
        introHtml: apiData?.private?.introHtml ?? null,

        // pas de "à partir de" pour particulier sauf si tu veux plus tard
        fromLabel: "",
        fromPrice: "",
        fromNote: "",

        cards: normalizeServiceCards(apiData?.private?.cards),
        cta: fallbackData?.cta
      }
    }
  };
}

function normalizeServiceCards(cards) {
  if (!Array.isArray(cards)) return [];

  return cards.map((card) => ({
    id: card.id ?? null,
    title: card.title ?? "",
    bodyEnabled: !!card.bodyEnabled,
    bodyHtml: card.bodyHtml ?? "",
    bulletsEnabled: !!card.bulletsEnabled,
    bullets: Array.isArray(card.bullets) ? card.bullets : [],
    priceEnabled: !!card.priceEnabled,
    priceLabel: card.priceLabel ?? null
  }));
}

// Compatibilité avec ton ancien services.json actuel
function normalizeFallbackServicesData(fallbackData) {
  const proCards = Array.isArray(fallbackData?.modes?.pro?.cards)
    ? fallbackData.modes.pro.cards
    : Array.isArray(fallbackData?.cards)
      ? fallbackData.cards
      : [];

  const privateCards = Array.isArray(fallbackData?.modes?.private?.cards)
    ? fallbackData.modes.private.cards
    : [];

  return {
    sectionTitle: fallbackData?.sectionTitle ?? "PRESTATIONS",
    generalIntro:
      fallbackData?.intro ??
      "Chaque projet est unique. Les prestations sont définies selon vos besoins, le contexte et l’usage des images.",
    cta: fallbackData?.cta ?? {
      primaryText: "Demander un devis",
      primaryHref: "#contact"
    },
    modes: {
      pro: {
        introEnabled: false,
        introHtml: "",
        fromEnabled: !!(fallbackData?.fromLabel || fallbackData?.fromPrice || fallbackData?.fromNote),
        fromLabel: fallbackData?.fromLabel ?? "",
        fromPrice: fallbackData?.fromPrice ?? "",
        fromNote: fallbackData?.fromNote ?? "",
        cards: normalizeFallbackCards(proCards),
        cta: fallbackData?.cta ?? {
          primaryText: "Demander un devis",
          primaryHref: "#contact"
        }
      },
      private: {
        introEnabled: false,
        introHtml: "",
        fromEnabled: false,
        fromLabel: "",
        fromPrice: "",
        fromNote: "",
        cards: normalizeFallbackCards(privateCards),
        cta: fallbackData?.cta ?? {
          primaryText: "Demander un devis",
          primaryHref: "#contact"
        }
      }
    }
  };
}

function normalizeFallbackCards(cards) {
  return cards.map((card) => ({
    id: card.id ?? null,
    title: card.title ?? "",
    bodyEnabled: card.type === "text" || card.type === "mixed",
    bodyHtml:
      card.text && (card.type === "text" || card.type === "mixed")
        ? `<p>${escapeHtml(card.text)}</p>`
        : "",
    bulletsEnabled: card.type === "list" || card.type === "mixed",
    bullets: Array.isArray(card.items) ? card.items : [],
    priceEnabled: !!card.price,
    priceLabel: card.price ?? null
  }));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
