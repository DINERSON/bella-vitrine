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
const productModal = document.querySelector("#product-modal");
const productModalContent = document.querySelector("#product-modal-content");

let activeFilter = "Todos";
let visibleProducts = [...PRODUCTS];
let menuReady = false;

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function replaceVars(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

function whatsappUrl(message) {
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function formatPrice(value) {
  if (!value) return "";
  return String(value).trim().startsWith("R$") ? value : `R$ ${value}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeSizes(product) {
  const value = product?.tamanhos;

  if (Array.isArray(value)) {
    return value
      .map((size) => {
        if (typeof size === "string") return { label: size.trim(), estoque: 1 };
        return {
          label: String(size.label || size.tamanho || "").trim(),
          estoque: Number.isFinite(Number(size.estoque)) ? Math.max(0, Number(size.estoque)) : 0,
        };
      })
      .filter((size) => size.label);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([label, estoque]) => ({
        label: String(label).trim(),
        estoque: Number.isFinite(Number(estoque)) ? Math.max(0, Number(estoque)) : 0,
      }))
      .filter((size) => size.label);
  }

  return String(value || "")
    .split(/[\/,|]+/)
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ label, estoque: 1 }));
}

function productHasAvailableSize(product) {
  const sizes = normalizeSizes(product);
  return !sizes.length || sizes.some((size) => size.estoque > 0);
}

function isSold(product) {
  const status = String(product.status || "").toLowerCase();
  return status === "vendido" || status === "esgotado" || !productHasAvailableSize(product);
}

function productStatusLabel(product) {
  return isSold(product) ? "Esgotado" : product.status || "Disponível";
}

function productMessage(product, selectedSize = "") {
  if (selectedSize) {
    return `Olá, tenho interesse no produto ${product.codigo} - ${product.nome}, tamanho/número ${selectedSize}. Está disponível?`;
  }

  return replaceVars(STORE_CONFIG.whatsappProductMessage, {
    codigo: product.codigo,
    nome: product.nome,
  });
}

function productCardId(product) {
  return String(product.firestoreId || product.id || product.codigo || "");
}

function findProductByCardId(id) {
  return visibleProducts.find((product) => productCardId(product) === id);
}

function productImages(product) {
  const images = Array.isArray(product?.imagens) ? product.imagens : [];
  return [product?.imagem, ...images]
    .map((image) => String(image || "").trim())
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index);
}

function primaryProductImage(product) {
  return productImages(product)[0] || "";
}

function sizeSummary(product) {
  const sizes = normalizeSizes(product);
  if (!sizes.length) return "";
  return sizes.map((size) => size.label).join(" | ");
}

function renderSizeOptions(product, sold) {
  const sizes = normalizeSizes(product);
  if (!sizes.length) return "";

  const options = sizes
    .map((size) => {
      const available = size.estoque > 0 && !sold;
      const title = available ? `${size.estoque} em estoque` : "Esgotado";
      return `
        <button
          class="size-option ${available ? "" : "is-empty"}"
          type="button"
          data-size="${escapeHtml(size.label)}"
          ${available ? "" : "disabled"}
          aria-label="Tamanho ou número ${escapeHtml(size.label)} - ${escapeHtml(title)}"
          title="${escapeHtml(title)}"
        >
          ${escapeHtml(size.label)}
        </button>
      `;
    })
    .join("");

  return `
    <div class="size-selector" aria-label="Escolha o tamanho ou número">
      <span>Tamanho/Número</span>
      <div class="size-options">${options}</div>
    </div>
  `;
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
  if (filter === "Mais Vendidos") return Boolean(product.maisVendido || product.destaque);
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

function modalImageMarkup(src, alt, sold) {
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt);
  const hasImage = Boolean(src && String(src).trim());
  const image = hasImage
    ? `<img id="product-modal-main-image" src="${safeSrc}" alt="${safeAlt}" onerror="this.closest('.product-modal-photo').classList.add('photo-missing'); this.remove();">`
    : "";

  return `
    <div class="product-modal-photo ${hasImage ? "" : "photo-missing"} ${sold ? "is-sold-out" : ""}">
      ${image}
      <div class="photo-placeholder">
        <span>Foto em breve</span>
      </div>
    </div>
  `;
}

function renderProductThumbnails(product) {
  const images = productImages(product);
  if (images.length <= 1) return "";

  return `
    <div class="product-modal-thumbs" aria-label="Fotos do produto">
      ${images
        .map(
          (image, index) => `
            <button class="product-thumb ${index === 0 ? "active" : ""}" type="button" data-image="${escapeHtml(image)}" aria-label="Ver foto ${index + 1}">
              <img src="${escapeHtml(image)}" alt="" onerror="this.closest('.product-thumb').classList.add('photo-missing'); this.remove();">
              <span>Foto ${index + 1}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function detailRow(label, value) {
  if (!value) return "";
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderProductModal(product) {
  const sold = isSold(product);
  const theme = getTheme(product);
  const images = productImages(product);
  const mainImage = images[0] || "";
  const statusLabel = productStatusLabel(product);
  const hasSizes = normalizeSizes(product).length > 0;
  const price = product.promocao
    ? `<div class="modal-price"><span class="old-price">${formatPrice(product.precoAntigo)}</span><strong>${formatPrice(product.preco)}</strong></div>`
    : `<div class="modal-price"><strong>${formatPrice(product.preco)}</strong></div>`;
  const action = sold
    ? `<button class="btn btn-disabled modal-buy" type="button" disabled>Indisponível</button>`
    : hasSizes
      ? `<button class="btn btn-whatsapp modal-buy product-modal-buy" type="button">Comprar pelo WhatsApp</button>`
      : `<a class="btn btn-whatsapp modal-buy" href="${whatsappUrl(productMessage(product))}" target="_blank" rel="noopener">Comprar pelo WhatsApp</a>`;

  return `
    <div class="product-modal-grid theme-${theme} ${sold ? "is-sold-out" : ""}" data-product-id="${escapeHtml(productCardId(product))}">
      <div class="product-modal-gallery">
        ${modalImageMarkup(mainImage, product.nome, sold)}
        ${renderProductThumbnails(product)}
      </div>
      <div class="product-modal-details">
        <div class="product-modal-badges">
          ${product.promocao ? '<span class="badge-inline badge-promo-inline">Promoção</span>' : ""}
          <span class="badge-inline ${sold ? "badge-sold-inline" : "badge-available-inline"}">${escapeHtml(statusLabel)}</span>
        </div>
        <span class="product-code">${escapeHtml(product.codigo)}</span>
        <h2 id="product-modal-title">${escapeHtml(product.nome)}</h2>
        ${price}
        <p class="product-modal-description">${escapeHtml(product.descricao || "Produto selecionado da Vitrine Moda.")}</p>
        ${renderSizeOptions(product, sold)}
        <p class="size-warning" aria-live="polite"></p>
        <dl class="product-modal-specs">
          ${detailRow("Categoria", product.categoria)}
          ${detailRow("Subcategoria", product.subcategoria)}
          ${detailRow("Cor", product.cor)}
          ${detailRow("Tecido", product.tecido)}
          ${detailRow("Tamanhos", sizeSummary(product))}
        </dl>
        ${action}
      </div>
    </div>
  `;
}

function openProductModal(productId) {
  const product = findProductByCardId(productId);
  if (!product || !productModal || !productModalContent) return;

  productModalContent.innerHTML = renderProductModal(product);
  productModal.hidden = false;
  productModal.dataset.productId = productCardId(product);
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => productModal.classList.add("open"));
  productModal.querySelector(".product-modal-close")?.focus({ preventScroll: true });
}

function closeProductModal() {
  if (!productModal) return;
  productModal.classList.remove("open");
  productModal.hidden = true;
  productModalContent.innerHTML = "";
  productModal.dataset.productId = "";
  document.body.classList.remove("modal-open");
}

function renderProductCard(product) {
  const sold = isSold(product);
  const theme = getTheme(product);
  const sizes = normalizeSizes(product);
  const hasSizes = sizes.length > 0;
  const cardId = productCardId(product);
  const statusLabel = productStatusLabel(product);
  const primaryImage = primaryProductImage(product);
  const summerBadge = product.categoria === "Moda Verão" ? '<span class="badge badge-summer">Verão</span>' : "";
  const price = product.promocao
    ? `<div class="price-row"><span class="old-price">${formatPrice(product.precoAntigo)}</span><strong>${formatPrice(product.preco)}</strong></div>`
    : `<div class="price-row"><strong>${formatPrice(product.preco)}</strong></div>`;
  const action = sold
    ? `<button class="btn product-buy btn-disabled" type="button" disabled aria-label="Produto indisponível ${escapeHtml(product.codigo)} - ${escapeHtml(product.nome)}">Indisponível</button>`
    : hasSizes
      ? `<button class="btn product-buy btn-whatsapp product-buy-size" type="button" data-product-id="${escapeHtml(cardId)}" aria-label="${SITE_CONTENT.buttons.buyWhatsapp} ${escapeHtml(product.codigo)} - ${escapeHtml(product.nome)}">Comprar</button>`
      : `<a class="btn product-buy btn-whatsapp" href="${whatsappUrl(productMessage(product))}" target="_blank" rel="noopener" aria-label="${SITE_CONTENT.buttons.buyWhatsapp} ${escapeHtml(product.codigo)} - ${escapeHtml(product.nome)}">Comprar</a>`;

  return `
    <article class="product-card theme-${theme} ${sold ? "is-sold-out" : ""}" data-product-id="${escapeHtml(cardId)}">
      <div class="product-image">
        ${imageMarkup(primaryImage, product.nome)}
        ${sold ? '<span class="sold-overlay">Esgotado</span>' : ""}
        ${product.promocao ? '<span class="badge badge-promo">Promoção</span>' : summerBadge}
        <span class="badge badge-status ${sold ? "sold" : "available"}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="product-info">
        <span class="product-code">${escapeHtml(product.codigo)}</span>
        <h3><button class="product-title-button product-details-trigger" type="button" data-product-id="${escapeHtml(cardId)}">${escapeHtml(product.nome)}</button></h3>
        <p class="product-description">${escapeHtml(product.descricao)}</p>
        <dl>
          <div><dt>Categoria</dt><dd>${escapeHtml(product.categoria)}</dd></div>
          <div><dt>Subcategoria</dt><dd>${escapeHtml(product.subcategoria || "-")}</dd></div>
          <div><dt>Tamanho</dt><dd>${escapeHtml(sizeSummary(product))}</dd></div>
          <div><dt>Cor</dt><dd>${escapeHtml(product.cor)}</dd></div>
          <div><dt>Tecido</dt><dd>${escapeHtml(product.tecido)}</dd></div>
        </dl>
        ${renderSizeOptions(product, sold)}
        ${price}
        <p class="size-warning" aria-live="polite"></p>
        <button class="product-details-button product-details-trigger" type="button" data-product-id="${escapeHtml(cardId)}">Detalhes</button>
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
  const drawerHeader = `
    <div class="drawer-header">
      <span class="brand-mark drawer-brand-mark">
        <img class="brand-logo" data-brand-logo src="${escapeHtml(STORE_CONFIG.logoImage || "assets/brand/logo-vitrine-moda.svg")}" alt="Logo ${escapeHtml(STORE_CONFIG.storeName)}" />
      </span>
      <strong>${escapeHtml(STORE_CONFIG.storeName)}</strong>
      <button class="drawer-close" type="button" data-menu-close aria-label="Fechar menu">×</button>
    </div>
  `;
  const menuItems = SITE_CONTENT.nav
    .map((label) => {
      const dataFilter = CATALOG_FILTERS.includes(label) && label !== "Todos" ? ` data-menu-filter="${escapeHtml(label)}"` : "";
      return `<a href="${sectionLinks[label] || "#inicio"}"${dataFilter}>${escapeHtml(label)}</a>`;
    })
    .join("");
  const mobileWhatsapp = `<a class="nav-mobile-whatsapp" data-whatsapp-general href="#" target="_blank" rel="noopener">${SITE_CONTENT.buttons.whatsapp}</a>`;
  navLinks.innerHTML = drawerHeader + `<div class="drawer-menu-items">${menuItems}</div>` + mobileWhatsapp;
}

function renderCategories() {
  if (!categoryGrid) return;

  categoryGrid.innerHTML = CATEGORIES.map((category) => {
    const theme = getTheme(category);
    const content = CATEGORY_CONTENT[category] || {};
    const icon = content.icon || category.slice(0, 2).toUpperCase();
    const subtitle = content.subtitle || "Confira as peças disponíveis nesta categoria.";
    const cta = content.cta || SITE_CONTENT.sections.categoryAction;

    return `
      <button class="category-card category-${slugify(category)} theme-${theme}" type="button" data-category="${escapeHtml(category)}">
        <span class="category-icon">${escapeHtml(icon)}</span>
        <span class="category-title">${escapeHtml(category)}</span>
        <span class="category-description">${escapeHtml(subtitle)}</span>
        <small>${escapeHtml(cta)}</small>
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
  const products = visibleProducts.filter((product) => product.maisVendido || product.destaque).slice(0, 4);
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

function applyRemoteStoreConfig(remoteConfig) {
  if (!remoteConfig) return;

  const nextStoreConfig = {
    storeName: remoteConfig.storeName,
    logoInitials: remoteConfig.logoInitials,
    logoImage: remoteConfig.logoImage,
    whatsappNumber: remoteConfig.whatsappNumber,
    instagramUser: remoteConfig.instagramUser,
    instagramUrl: remoteConfig.instagramUrl,
    city: remoteConfig.city,
    deliveryText: remoteConfig.deliveryText,
    paymentMethods: remoteConfig.paymentMethods,
    whatsappDefaultMessage: remoteConfig.whatsappDefaultMessage,
  };

  Object.entries(nextStoreConfig).forEach(([key, value]) => {
    if (value) STORE_CONFIG[key] = value;
  });

  if (remoteConfig.heroTitle) SITE_CONTENT.hero.title = remoteConfig.heroTitle;
  if (remoteConfig.heroSubtitle) SITE_CONTENT.hero.subtitle = remoteConfig.heroSubtitle;
  SITE_CONTENT.footer.text = `${STORE_CONFIG.storeName}: moda masculina, feminina e verao com compra rapida pelo WhatsApp.`;
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
    if (!element.querySelector("img")) {
      element.textContent = STORE_CONFIG.logoInitials || "VM";
    }
  });
  document.querySelectorAll("[data-brand-logo]").forEach((image) => {
    image.src = STORE_CONFIG.logoImage || "assets/brand/logo-vitrine-moda.svg";
    image.alt = `Logo ${STORE_CONFIG.storeName}`;
  });
  document.querySelectorAll("[data-whatsapp-general]").forEach((link) => {
    link.href = whatsappUrl(generalMessage);
    link.textContent = SITE_CONTENT.buttons.whatsapp;
  });

  setText("#hero-eyebrow", SITE_CONTENT.hero.eyebrow);
  setText("#hero-title", SITE_CONTENT.hero.title);
  setText("#hero-subtitle", SITE_CONTENT.hero.subtitle);
  setText("#hero-catalog-button", SITE_CONTENT.buttons.viewCatalog);

  const heroImage = document.querySelector("#hero-image");
  if (SITE_CONTENT.hero.image) {
    heroImage.src = SITE_CONTENT.hero.image;
    heroImage.alt = SITE_CONTENT.hero.imageAlt;
    heroImage.hidden = false;
    heroImage.onerror = function () {
      this.closest(".hero-media").classList.add("hero-no-image");
      this.hidden = true;
    };
  } else {
    heroImage.hidden = true;
    heroImage.closest(".hero-media").classList.add("hero-no-image");
  }

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
  if (menuReady) return;
  menuReady = true;

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

  navLinks.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-menu-close]");
    if (closeButton) {
      closeMenu();
      return;
    }

    const link = event.target.closest("a");
    if (!link) return;

    const filter = link.dataset.menuFilter;
    if (filter) {
      event.preventDefault();
      closeMenu();
      requestAnimationFrame(() => setActiveFilter(filter));
      return;
    }
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus({ preventScroll: true });
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180 && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
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

function setupProductInteractions() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
      closeProductModal();
      return;
    }

    const thumb = event.target.closest(".product-thumb");
    if (thumb) {
      const modal = thumb.closest(".product-modal-grid");
      const mainImage = modal.querySelector("#product-modal-main-image");
      const photo = modal.querySelector(".product-modal-photo");
      modal.querySelectorAll(".product-thumb").forEach((button) => button.classList.remove("active"));
      thumb.classList.add("active");
      photo.classList.remove("photo-missing");
      if (mainImage) {
        mainImage.src = thumb.dataset.image;
      } else {
        photo.insertAdjacentHTML(
          "afterbegin",
          `<img id="product-modal-main-image" src="${escapeHtml(thumb.dataset.image)}" alt="Foto do produto" onerror="this.closest('.product-modal-photo').classList.add('photo-missing'); this.remove();">`
        );
      }
      return;
    }

    const sizeButton = event.target.closest(".size-option");
    if (sizeButton && !sizeButton.disabled) {
      const modal = sizeButton.closest(".product-modal-grid");
      if (modal) {
        modal.querySelectorAll(".size-option").forEach((button) => {
          button.classList.remove("selected");
          button.setAttribute("aria-pressed", "false");
        });
        sizeButton.classList.add("selected");
        sizeButton.setAttribute("aria-pressed", "true");
        modal.dataset.selectedSize = sizeButton.dataset.size;
        const warning = modal.querySelector(".size-warning");
        if (warning) warning.textContent = "";
        modal.querySelector(".size-options")?.classList.remove("needs-choice");
        return;
      }

      const card = sizeButton.closest(".product-card");
      if (!card) return;
      card.querySelectorAll(".size-option").forEach((button) => {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });
      sizeButton.classList.add("selected");
      sizeButton.setAttribute("aria-pressed", "true");
      card.dataset.selectedSize = sizeButton.dataset.size;
      const warning = card.querySelector(".size-warning");
      if (warning) warning.textContent = "";
      card.querySelector(".size-options")?.classList.remove("needs-choice");
      return;
    }

    const modalBuyButton = event.target.closest(".product-modal-buy");
    if (modalBuyButton) {
      const modal = modalBuyButton.closest(".product-modal-grid");
      const selectedSize = modal.dataset.selectedSize;
      const warning = modal.querySelector(".size-warning");

      if (!selectedSize) {
        if (warning) warning.textContent = "Escolha um tamanho/número antes de comprar.";
        modal.querySelector(".size-options")?.classList.add("needs-choice");
        return;
      }

      const product = findProductByCardId(modal.dataset.productId);
      if (!product) return;
      window.open(whatsappUrl(productMessage(product, selectedSize)), "_blank", "noopener");
      return;
    }

    const detailTrigger = event.target.closest(".product-details-trigger");
    if (detailTrigger) {
      openProductModal(detailTrigger.dataset.productId);
      return;
    }

    const buyButton = event.target.closest(".product-buy-size");
    if (!buyButton) return;

    const card = buyButton.closest(".product-card");
    const selectedSize = card.dataset.selectedSize;
    const warning = card.querySelector(".size-warning");

    if (!selectedSize) {
      if (warning) warning.textContent = "Escolha um tamanho/número antes de comprar.";
      card.querySelector(".size-options")?.classList.add("needs-choice");
      return;
    }

    const product = findProductByCardId(buyButton.dataset.productId);
    if (!product) return;

    window.open(whatsappUrl(productMessage(product, selectedSize)), "_blank", "noopener");
  });

  document.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");
    if (!card || event.target.closest("a, button, input, select, textarea")) return;
    openProductModal(card.dataset.productId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && productModal && !productModal.hidden) {
      closeProductModal();
    }
  });
}

async function loadFirebaseData() {
  const firebase = window.PrimeFirebase;

  if (!firebase || !firebase.isConfigured()) {
    catalogFeedback.textContent = "Firebase ainda não configurado. Exibindo produtos de exemplo.";
    return;
  }

  try {
    const remoteStoreConfig = await firebase.fetchStoreConfig();
    if (remoteStoreConfig) {
      applyRemoteStoreConfig(remoteStoreConfig);
      renderMenu();
      applyStoreConfig();
    }

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
setupProductInteractions();
renderCategories();
renderAllProductSections();
renderLooks();
loadFirebaseData();
