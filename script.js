const WHATSAPP_NUMBER = STORE_CONFIG.whatsappNumber;

const sectionLinks = {
  Início: "#inicio",
  "Mais Vendidos": "#novidades",
  Feminino: "#catalogo",
  Masculino: "#catalogo",
  Infantil: "#catalogo",
  Oversized: "#catalogo",
  "Moda Verão": "#catalogo",
  Acessórios: "#catalogo",
  Promoções: "#promocoes",
  Contato: "#contato",
};

const categoryGrid = document.querySelector("#category-grid");
const filterBar = document.querySelector("#filter-bar");
const catalogProducts = document.querySelector("#catalog-products");
const featuredProducts = document.querySelector("#featured-products");
const promoProducts = document.querySelector("#promo-products");
const catalogFeedback = document.querySelector("#catalog-feedback");
const lookGrid = document.querySelector("#look-grid");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("#main-menu");
const menuBackdrop = document.querySelector(".menu-backdrop");

let activeFilter = "Todos";
let visibleProducts = [...PRODUCTS];

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function replaceVars(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function formatPrice(value) {
  if (!value) return "";
  return String(value).trim().startsWith("R$") ? value : `R$ ${value}`;
}

function productMessage(product) {
  return replaceVars(STORE_CONFIG.whatsappProductMessage, {
    codigo: product.codigo,
    nome: product.nome,
  });
}

function isSold(product) {
  return String(product.status || "").toLowerCase() === "vendido";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTheme(productOrCategory) {
  const category = typeof productOrCategory === "string" ? productOrCategory : productOrCategory.categoria;
  if (category === "Feminino") return "feminino";
  if (category === "Moda Verão") return "verao";
  if (category === "Masculino" || category === "Oversized" || category === "Acessórios") return "masculino";
  return "neutro";
}

function matchesFilter(product, filter) {
  if (filter === "Todos") return true;
  if (filter === "Mais Vendidos") return Boolean(product.destaque);
  if (filter === "Promoções") return Boolean(product.promocao);
  if (filter === "Oversized") {
    return product.categoria === "Oversized" || product.subcategoria === "Oversized" || /oversized/i.test(product.nome || "");
  }
  if (filter === "Acessórios") return product.categoria === "Acessórios" || /acess/i.test(product.subcategoria || "");
  return product.categoria === filter;
}

function imageMarkup(src, alt) {
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt);
  const hasImage = Boolean(src && String(src).trim());
  const image = hasImage
    ? `<img src="${safeSrc}" alt="${safeAlt}" onerror="this.closest('.product-photo').classList.add('photo-missing'); this.remove();">`
    : "";

  return `
    <div class="product-photo ${hasImage ? "" : "photo-missing"}">
      ${image}
      <div class="photo-placeholder">
        <span>Foto em breve</span>
      </div>
    </div>
  `;
}

function renderProductCard(product) {
  const sold = isSold(product);
  const theme = getTheme(product);
  const summerBadge = product.categoria === "Moda Verão" ? '<span class="badge badge-summer">Verão</span>' : "";
  const price = product.promocao
    ? `<div class="price-row"><span class="old-price">${formatPrice(product.precoAntigo)}</span><strong>${formatPrice(product.preco)}</strong></div>`
    : `<div class="price-row"><strong>${formatPrice(product.preco)}</strong></div>`;
  const action = sold
    ? `<button class="btn product-buy btn-disabled" type="button" disabled>${SITE_CONTENT.buttons.sold}</button>`
    : `<a class="btn product-buy btn-whatsapp" href="${whatsappUrl(productMessage(product))}" target="_blank" rel="noopener">${SITE_CONTENT.buttons.buyWhatsapp}</a>`;

  return `
    <article class="product-card theme-${theme}">
      <div class="product-image">
        ${imageMarkup(product.imagem, product.nome)}
        ${product.promocao ? '<span class="badge badge-promo">Promoção</span>' : summerBadge}
        <span class="badge badge-status ${sold ? "sold" : "available"}">${escapeHtml(product.status || "Disponível")}</span>
      </div>
      <div class="product-info">
        <span class="product-code">${escapeHtml(product.codigo)}</span>
        <h3>${escapeHtml(product.nome)}</h3>
        <p class="product-description">${escapeHtml(product.descricao)}</p>
        <dl>
          <div><dt>Categoria</dt><dd>${escapeHtml(product.categoria)}</dd></div>
          <div><dt>Subcategoria</dt><dd>${escapeHtml(product.subcategoria || "-")}</dd></div>
          <div><dt>Tamanho</dt><dd>${escapeHtml(product.tamanhos)}</dd></div>
          <div><dt>Cor</dt><dd>${escapeHtml(product.cor)}</dd></div>
          <div><dt>Tecido</dt><dd>${escapeHtml(product.tecido)}</dd></div>
        </dl>
        ${price}
        ${action}
      </div>
    </article>
  `;
}

function filteredProducts(filter) {
  return visibleProducts.filter((product) => matchesFilter(product, filter));
}

function setActiveFilter(filter) {
  activeFilter = filter;
  renderCatalog();
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMenu() {
  const menuItems = SITE_CONTENT.nav
    .map((label) => {
      const dataFilter = CATALOG_FILTERS.includes(label) && label !== "Todos" ? ` data-menu-filter="${escapeHtml(label)}"` : "";
      return `<a href="${sectionLinks[label] || "#inicio"}"${dataFilter}>${escapeHtml(label)}</a>`;
    })
    .join("");
  const mobileWhatsapp = `<a class="nav-mobile-whatsapp" data-whatsapp-general href="#" target="_blank" rel="noopener">${SITE_CONTENT.buttons.whatsapp}</a>`;
  navLinks.innerHTML = menuItems + mobileWhatsapp;
}

function renderCategories() {
  categoryGrid.innerHTML = CATEGORIES.map((category) => {
    const theme = getTheme(category);
    return `
      <button class="category-card category-${slugify(category)} theme-${theme}" type="button" data-category="${escapeHtml(category)}">
        <span>${escapeHtml(category)}</span>
        <small>${SITE_CONTENT.sections.categoryAction}</small>
      </button>
    `;
  }).join("");

  categoryGrid.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => setActiveFilter(button.dataset.category));
  });
}

function renderFilters() {
  filterBar.innerHTML = CATALOG_FILTERS.map(
    (filter) => `
      <button class="filter-button ${filter === activeFilter ? "active" : ""} filter-${slugify(filter)}" type="button" data-filter="${escapeHtml(filter)}">
        ${escapeHtml(filter)}
      </button>
    `
  ).join("");

  filterBar.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const products = filteredProducts(activeFilter);
  renderFilters();
  catalogFeedback.textContent = `${products.length} produto${products.length === 1 ? "" : "s"} encontrado${products.length === 1 ? "" : "s"}.`;
  catalogProducts.innerHTML = products.length
    ? products.map(renderProductCard).join("")
    : '<div class="empty-state">Nenhum produto encontrado nesta categoria.</div>';
}

function renderFeaturedProducts() {
  const products = visibleProducts.filter((product) => product.destaque).slice(0, 4);
  featuredProducts.innerHTML = products.length
    ? products.map(renderProductCard).join("")
    : '<div class="empty-state">Os mais vendidos aparecem aqui quando houver produtos em destaque.</div>';
}

function renderPromoProducts() {
  const products = visibleProducts.filter((product) => product.promocao).slice(0, 4);
  promoProducts.innerHTML = products.length
    ? products.map(renderProductCard).join("")
    : '<div class="empty-state">As promoções aparecem aqui quando houver produtos com promoção marcada.</div>';
}

function renderLooks() {
  lookGrid.innerHTML = LOOKS.map((look) => {
    const message = replaceVars(SITE_CONTENT.lookMessage, { look: look.nome });
    const theme = getTheme(look.categoria || look.nome);
    return `
      <article class="look-card theme-${theme}">
        <img src="${escapeHtml(look.imagem)}" alt="${escapeHtml(look.nome)}" onerror="this.closest('.look-card').classList.add('look-no-image'); this.remove();">
        <div>
          <h3>${escapeHtml(look.nome)}</h3>
          <p>${escapeHtml(look.descricao)}</p>
          <a class="btn btn-outline" href="${whatsappUrl(message)}" target="_blank" rel="noopener">
            ${SITE_CONTENT.buttons.wantLook}
          </a>
        </div>
      </article>
    `;
  }).join("");
}

function renderAllProductSections() {
  renderFeaturedProducts();
  renderCatalog();
  renderPromoProducts();
}

function applyStoreConfig() {
  const generalMessage = replaceVars(STORE_CONFIG.whatsappDefaultMessage, {
    storeName: STORE_CONFIG.storeName,
  });

  document.title = `${STORE_CONFIG.storeName} | Catálogo de Moda`;
  document.querySelector("#meta-description").setAttribute("content", SITE_CONTENT.metaDescription);
  document.querySelector("#header-brand").setAttribute("aria-label", `${STORE_CONFIG.storeName} - Início`);

  document.querySelectorAll("[data-store-name]").forEach((element) => {
    element.textContent = STORE_CONFIG.storeName;
  });
  document.querySelectorAll(".brand-mark").forEach((element) => {
    element.textContent = STORE_CONFIG.logoInitials || "PV";
  });
  document.querySelectorAll("[data-whatsapp-general]").forEach((link) => {
    link.href = whatsappUrl(generalMessage);
    link.textContent = SITE_CONTENT.buttons.whatsapp;
  });

  setText("#hero-eyebrow", SITE_CONTENT.hero.eyebrow);
  setText("#hero-title", SITE_CONTENT.hero.title);
  setText("#hero-subtitle", SITE_CONTENT.hero.subtitle);
  setText("#hero-catalog-button", SITE_CONTENT.buttons.viewCatalog);
  setText("#hero-card-title", SITE_CONTENT.hero.cardTitle);
  setText("#hero-card-text", SITE_CONTENT.hero.cardText);

  const heroImage = document.querySelector("#hero-image");
  heroImage.src = SITE_CONTENT.hero.image;
  heroImage.alt = SITE_CONTENT.hero.imageAlt;
  heroImage.onerror = function () {
    this.closest(".hero-media").classList.add("hero-no-image");
    this.remove();
  };

  document.querySelector("#hero-badges").innerHTML = SITE_CONTENT.hero.badges
    .map((badge) => `<span>${escapeHtml(badge)}</span>`)
    .join("");

  setText("#categories-eyebrow", SITE_CONTENT.sections.categoriesEyebrow);
  setText("#categorias-title", SITE_CONTENT.sections.categoriesTitle);
  setText("#categories-description", SITE_CONTENT.sections.categoriesDescription);
  setText("#news-eyebrow", SITE_CONTENT.sections.newsEyebrow);
  setText("#novidades-title", SITE_CONTENT.sections.newsTitle);
  setText("#news-description", SITE_CONTENT.sections.newsDescription);
  setText("#catalog-link", SITE_CONTENT.sections.catalogLink);
  setText("#catalog-eyebrow", SITE_CONTENT.sections.catalogEyebrow);
  setText("#catalogo-title", SITE_CONTENT.sections.catalogTitle);
  setText("#catalog-description", SITE_CONTENT.sections.catalogDescription);
  setText("#promo-eyebrow", SITE_CONTENT.sections.promoEyebrow);
  setText("#promocoes-title", SITE_CONTENT.sections.promoTitle);
  setText("#promo-text", SITE_CONTENT.sections.promoText);
  setText("#promo-action", SITE_CONTENT.sections.promoAction);
  setText("#looks-eyebrow", SITE_CONTENT.sections.looksEyebrow);
  setText("#looks-title", SITE_CONTENT.sections.looksTitle);
  setText("#contact-eyebrow", SITE_CONTENT.sections.contactEyebrow);
  setText("#contato-title", SITE_CONTENT.sections.contactTitle);
  setText("#contact-text", SITE_CONTENT.sections.contactText);
  setText("#contact-card-title", SITE_CONTENT.sections.contactCardTitle);
  setText("#instagram-link", SITE_CONTENT.buttons.viewInstagram);
  setText("#contact-whatsapp", `+${STORE_CONFIG.whatsappNumber}`);
  setText("#contact-instagram", `@${STORE_CONFIG.instagramUser}`);
  setText("#contact-city", STORE_CONFIG.city);
  setText("#contact-payment", STORE_CONFIG.paymentMethods);
  setText("#contact-delivery", STORE_CONFIG.deliveryText);
  setText("#footer-text", SITE_CONTENT.footer.text);
  setText("#footer-rights", SITE_CONTENT.footer.rights);
  setText("#current-year", new Date().getFullYear());

  document.querySelector("#instagram-link").href = STORE_CONFIG.instagramUrl;
  document.querySelector("#footer-instagram").href = STORE_CONFIG.instagramUrl;
}

function setupMenu() {
  const openMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fechar menu");
    navLinks.classList.add("open");
    document.body.classList.add("menu-open");
    const firstLink = navLinks.querySelector("a");
    if (firstLink) firstLink.focus({ preventScroll: true });
  };

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  if (menuBackdrop) {
    menuBackdrop.addEventListener("click", closeMenu);
  }

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const filter = link.dataset.menuFilter;
      if (filter) {
        event.preventDefault();
        setActiveFilter(filter);
      }
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus({ preventScroll: true });
    }
  });
}

function setupPromoLinks() {
  document.querySelectorAll("[data-filter-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveFilter("Promoções");
    });
  });
}

async function loadFirebaseProducts() {
  const firebase = window.PrimeFirebase;

  if (!firebase || !firebase.isConfigured()) {
    catalogFeedback.textContent = "Firebase ainda não configurado. Exibindo produtos de exemplo.";
    return;
  }

  try {
    const remoteProducts = await firebase.fetchProducts();
    if (remoteProducts.length) {
      visibleProducts = remoteProducts;
      catalogFeedback.textContent = "Produtos carregados do painel administrativo.";
      renderAllProductSections();
      return;
    }
    catalogFeedback.textContent = "Nenhum produto cadastrado no painel ainda. Exibindo exemplos.";
  } catch (error) {
    catalogFeedback.textContent = "Não foi possível carregar o Firebase agora. Exibindo produtos de exemplo.";
  }
}

renderMenu();
applyStoreConfig();
setupMenu();
setupPromoLinks();
renderCategories();
renderAllProductSections();
renderLooks();
loadFirebaseProducts();
