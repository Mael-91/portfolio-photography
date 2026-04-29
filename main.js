const API_BASE_URL = "https://api.maelconstantin.fr";
const ASSET_BASE_URL = "https://admin-api.maelconstantin.fr";
const PORTFOLIO_SETTINGS_FALLBACK_URL = "./data/portfolio-settings.json";

async function fetchWithSingleFallback(apiPath, fallbackKey) {
  try {
    const res = await fetch(`${API_BASE_URL}${apiPath}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("Réponse API vide");
    }

    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn(`Fallback JSON utilisé pour ${apiPath}`, error);

    const fallbackRes = await fetch(PORTFOLIO_SETTINGS_FALLBACK_URL, {
      cache: "no-store"
    });

    if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);

    const fallbackData = await fallbackRes.json();
    return fallbackData[fallbackKey];
  }
}

function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  return `${ASSET_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchWithFallback(apiPath, fallbackPath) {
  try {
    const res = await fetch(`${API_BASE_URL}${apiPath}`, {
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("Données vides");
    }

    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.warn(`Fallback utilisé pour ${apiPath}`, err);

    const fallbackRes = await fetch(fallbackPath, {
      cache: "no-store"
    });

    if (!fallbackRes.ok) {
      throw new Error(`Fallback HTTP ${fallbackRes.status}`);
    }

    return fallbackRes.json();
  }
}

async function loadIdentity() {
  const data = await fetchWithSingleFallback("/portfolio/identity", "identity");
  const title = (data.site_title ?? data.siteTitle ?? "").trim();
  const description = (data.site_description ?? data.siteDescription ?? "").trim();
  const favicon = resolveImageUrl(data.site_favicon_url ?? data.faviconUrl ?? "");

  if (title) {
    document.title = title;
  }

  if (description) {
    let meta = document.querySelector('meta[name="description"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }

  // ✅ Open Graph
  setMetaProperty("og:site_name", title);
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);

  if (favicon && typeof favicon === "string") {
    updateFavicon(favicon);
  }
}

async function loadHero() {
  const data = await fetchWithSingleFallback(
    "/portfolio/hero-page",
    "hero"
  );

  const titleEl = document.querySelector(".hero__title");
  const subtitleEl = document.querySelector(".hero__subtitle");
  const heroEl = document.querySelector(".hero");

  if (titleEl) titleEl.textContent = data.home_title ?? data.title ?? "";
  if (subtitleEl) subtitleEl.textContent = data.home_subtitle ?? data.subtitle ?? "";

  const imageUrl = resolveImageUrl(data.home_background_image_url ?? data.backgroundImageUrl ?? "") + `?v=${Date.now()}`;

  if (heroEl && imageUrl) {
    applyDynamicBackgroundClass(
      heroEl,
      "hero--dynamic-bg",
      imageUrl
    );

  }
}

async function loadPortfolioSection() {
  const data = await fetchWithSingleFallback(
    "/portfolio/portfolio-page",
    "portfolio"
  );

  const titleEl = document.querySelector(".auto__title");
  const subtitleEl = document.querySelector(".auto__subtitle");

  if (titleEl) {
    titleEl.textContent = data.gallery_section_title ?? data.title ?? "";
  }

  if (subtitleEl) {
    subtitleEl.textContent = data.gallery_section_subtitle ?? data.subtitle ?? "";
  }
}

async function loadContactPage() {
  const data = await fetchWithSingleFallback(
    "/portfolio/contact-page",
    "contact"
  );

  const titleEl = document.querySelector(".contact__title");
  const subtitleEl = document.querySelector(".contact__intro");
  const selectEl = document.getElementById("contactType");

  if (titleEl) {
    titleEl.textContent = data.contact_section_title ?? data.title ?? "";
  }

  if (subtitleEl) {
    subtitleEl.textContent = data.contact_section_subtitle ?? data.subtitle ?? "";
  }

  const submitLabel =
    data.contact_submit_button_label ??
    data.submitButtonLabel ??
    "Envoyer";

  document.querySelectorAll(".contact__form button[type='submit']").forEach((btn) => {
    btn.textContent = submitLabel;
  });

  const options = {
    pro: toBoolean(data.contact_option_pro_enabled ?? data.optionProEnabled, true),
    part: toBoolean(data.contact_option_private_enabled ?? data.optionPrivateEnabled, true),
    info: toBoolean(data.contact_option_info_enabled ?? data.optionInfoEnabled, true)
  };

  window.CONTACT_OPTIONS = options;

  if (selectEl) {
    Array.from(selectEl.options).forEach((option) => {
      if (options[option.value] === false) {
        option.remove();
      }
    });

    const firstEnabled = Object.keys(options).find((key) => options[key]);

    if (firstEnabled && options[selectEl.value] === false) {
      selectEl.value = firstEnabled;
      selectEl.dispatchEvent(new Event("change"));
    }
  }

  removeDisabledContactForms(options);
}

function removeDisabledContactForms(options) {
  const forms = {
    pro: document.getElementById("formPro"),
    part: document.getElementById("formPart"),
    info: document.getElementById("formInfo")
  };

  Object.entries(forms).forEach(([type, form]) => {
    if (form && options[type] === false) {
      form.remove();
    }
  });
}

function toggleContactForms(options) {
  const forms = {
    pro: document.getElementById("formPro"),
    part: document.getElementById("formPart"),
    info: document.getElementById("formInfo")
  };

  Object.entries(forms).forEach(([key, form]) => {
    if (!form) return;

    if (!options[key]) {
      form.remove();
    }
  });
}

function updateFavicon(url) {
  const faviconEl = document.getElementById("site-favicon");
  if (faviconEl && url) {
    faviconEl.href = url;
  }
}

function setMetaProperty(property, content) {
  if (!content) return;

  let meta = document.querySelector(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function applyDynamicBackgroundClass(element, className, imageUrl) {
  if (!element || !className || !imageUrl) return;

  // Supprime ancienne classe dynamique si existante
  const existing = Array.from(document.styleSheets)
    .flatMap(sheet => {
      try {
        return Array.from(sheet.cssRules || []);
      } catch {
        return [];
      }
    })
    .find(rule => rule.selectorText === `.${className}`);

  if (existing) return;

  const style = document.createElement("style");

  style.innerHTML = `
    .${className} {
      background-image: url("${imageUrl}");
    }
  `;

  document.head.appendChild(style);

  element.classList.add(className);
}

function toBoolean(value, defaultValue = true) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (value === null || value === undefined) return defaultValue;
  return Boolean(value);
}

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
  const servicesSection = document.getElementById("prestations");
  const titleEl = document.getElementById("servicesTitle");
  const introEl = document.getElementById("servicesIntro");
  const fromEl = document.getElementById("servicesFrom");
  const gridEl = document.getElementById("servicesGrid");
  const ctaEl = document.getElementById("servicesCta");
  const tabPro = document.getElementById("servicesTabPro");
  const tabPart = document.getElementById("servicesTabPart");

  if (!servicesSection || !titleEl || !introEl || !fromEl || !gridEl || !ctaEl || !tabPro || !tabPart) return;

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

      servicesSection.hidden = false;
      titleEl.textContent = "PRESTATIONS";
      introEl.textContent = "";
      fromEl.innerHTML = "";
      gridEl.innerHTML = `<p style="text-align:center;">Impossible de charger les prestations.</p>`;
      ctaEl.innerHTML = "";
      return;
    }
  }

  if (servicesData.enabled === false) {
    servicesSection.hidden = true;
    return;
  }

  servicesSection.hidden = false;

  titleEl.textContent = servicesData.sectionTitle ?? "PRESTATIONS";

  introEl.textContent =
    servicesData.generalIntro ??
    "Chaque projet est unique. Les prestations sont définies selon vos besoins, le contexte et l’usage des images.";

  function renderServices(type) {
    currentType = type;

    const modeData = servicesData?.modes?.[type];
    if (!modeData) return;

    tabPro.classList.toggle("is-active", type === "pro");
    tabPart.classList.toggle("is-active", type === "private");

    tabPro.setAttribute("aria-selected", String(type === "pro"));
    tabPart.setAttribute("aria-selected", String(type === "private"));

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

    const cta = modeData.cta ?? servicesData.cta ?? {};
    const primaryText = cta.primaryText ?? "Demander un devis";
    const primaryHref = cta.primaryHref ?? "#contact";

    ctaEl.innerHTML = `
      <a class="services__btn services__btn--primary" href="${escapeHtml(primaryHref)}">
        ${escapeHtml(primaryText)}
      </a>
    `;
  }

  tabPro.addEventListener("click", () => renderServices("pro"));
  tabPart.addEventListener("click", () => renderServices("private"));

  renderServices(currentType);
}

function normalizeServicesApiData(apiData, fallbackData) {
  return {
    enabled: apiData?.enabled === true,
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
    enabled: true,
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
  const photoContainer = document.querySelector(".about__photo");
  const textEl = document.getElementById("aboutText");

  if (!photoContainer || !textEl) return;

  const API_URL = "https://api.maelconstantin.fr/about";
  const FALLBACK_JSON_URL = "./data/about.json";
  const IMAGE_BASE_URL = "https://admin-api.maelconstantin.fr";
  const FALLBACK_IMAGE = "./assets/portrait.jpg";

  try {
    const res = await fetch(API_URL, { cache: "no-store" });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data || (!data.textHtml && !data.imageUrl)) {
      throw new Error("Données API invalides");
    }

    const normalized = normalizeAboutData(data, IMAGE_BASE_URL);

    renderAbout(photoContainer, textEl, normalized, FALLBACK_IMAGE);

  } catch (apiError) {
    console.warn("API about indisponible :", apiError);

    // 🔹 fallback texte uniquement
    try {
      const fallbackRes = await fetch(FALLBACK_JSON_URL, { cache: "no-store" });
      if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);

      const fallbackData = await fallbackRes.json();
      const normalized = normalizeFallbackAboutData(fallbackData);

      renderAbout(photoContainer, textEl, normalized, FALLBACK_IMAGE);

    } catch (fallbackError) {
      console.error("Fallback about KO :", fallbackError);

      textEl.innerHTML = `<p>Impossible de charger la présentation.</p>`;

      // 🔹 image fallback quand même
      photoContainer.style.backgroundImage = `url("${FALLBACK_IMAGE}")`;
      photoContainer.setAttribute("role", "img");
      photoContainer.setAttribute("aria-label", "Photo de présentation");
    }
  }
}

function normalizeFallbackAboutData(data) {
  return {
    textHtml: data.text_html ?? data.textHtml ?? data.text ?? "<p></p>",
    imageUrl: data.image_url ?? data.imageUrl ?? data.image ?? "",
    imageAlt: data.image_alt ?? data.imageAlt ?? "Photo de présentation"
  };
}

function normalizeAboutData(data, baseUrl) {
  let imageUrl = data.imageUrl ?? "";

  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }

  return {
    textHtml: data.textHtml ?? "",
    imageUrl,
    imageAlt: data.imageAlt ?? "Photo de présentation"
  };
}

function normalizeFallbackAboutData(data) {
  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  return {
    textHtml: paragraphs.length
      ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
      : "",
    imageUrl: "",
    imageAlt: data.imageAlt ?? "Photo de présentation"
  };
}

function renderAbout(photoContainer, textEl, data, fallbackImage) {
  // ✅ texte
  textEl.innerHTML = data.textHtml || "<p></p>";

  // ✅ image avec fallback
  let finalImage = data.imageUrl || fallbackImage;

  photoContainer.style.backgroundImage = `url("${finalImage}")`;
  photoContainer.setAttribute("role", "img");
  photoContainer.setAttribute("aria-label", data.imageAlt || "Photo de présentation");
}

document.addEventListener("DOMContentLoaded", () => {
  loadIdentity();
  loadHero();
  loadPortfolioSection();
  loadContactPage();
  loadFooter();
  loadAutomotiveGrid();
  loadServices();
  loadAbout();
});
