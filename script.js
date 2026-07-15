const WHATSAPP_NUMBER = STORE_CONFIG.whatsappNumber;

const sectionLinks = {
  Início: "#inicio",
  Novidades: "#novidades",
  Catálogo: "#catalogo",
  Promoções: "#promocoes",
  Looks: "#looks",
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

let activeFilter = "Todos";

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
  return value.trim().startsWith("R$") ? value : `R$ ${value}`;
}

function productMessage(product) {
  return replaceVars(STORE_CONFIG.whatsappProductMessage, {
    codigo: product.codigo,
    nome: product.nome,
  });
}

function isSold(product) {
  return product.status.toLowerCase() === "vendido";
}

function imageMarkup(src, alt) {
  const hasImage = Boolean(src && src.trim());
  const image = hasImage
    ? `<img src="${src}" alt="${alt}" onerror="this.closest('.product-photo').classList.add('photo-missing'); this.remove();">`
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
  const price = product.promocao
    ? `<div class="price-row"><span class="old-price">${formatPrice(product.precoAntigo)}</span><strong>${formatPrice(product.preco)}</strong></div>`
    : `<div class="price-row"><strong>${formatPrice(product.preco)}</strong></div>`;
  const action = sold
    ? `<button class="btn product-buy btn-disabled" type="button" disabled>${SITE_CONTENT.buttons.sold}</button>`
    : `<a class="btn product-buy btn-whatsapp" href="${whatsappUrl(productMessage(product))}" target="_blank" rel="noopener">${SITE_CONTENT.buttons.buyWhatsapp}</a>`;

  return `
    <article class="product-card">
      <div class="product-image">
        ${imageMarkup(product.imagem, product.nome)}
        ${product.promocao ? '<span class="badge badge-promo">Promoção</span>' : ""}
        <span class="badge badge-status ${sold ? "sold" : "available"}">${product.status}</span>
      </div>
      <div class="product-info">
        <span class="product-code">${product.codigo}</span>
        <h3>${product.nome}</h3>
        <p class="product-description">${product.descricao || ""}</p>
        <dl>
          <div><dt>Categoria</dt><dd>${product.categoria}</dd></div>
          <div><dt>Tamanho</dt><dd>${product.tamanhos}</dd></div>
          <div><dt>Cor</dt><dd>${product.cor}</dd></div>
          <div><dt>Tecido</dt><dd>${product.tecido}</dd></div>
        </dl>
        ${price}
        ${action}
      </div>
    </article>
  `;
}

function filteredProducts(filter) {
  if (filter === "Todos") return PRODUCTS;
  if (filter === "Novidades") return PRODUCTS.filter((product) => product.destaque);
  if (filter === "Promoções") return PRODUCTS.filter((product) => product.promocao);
  return PRODUCTS.filter((product) => product.categoria === filter);
}

function setActiveFilter(filter) {
  activeFilter = filter;
  renderCatalog();
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMenu() {
  const menuItems = SITE_CONTENT.nav
    .map((label) => `<a href="${sectionLinks[label] || "#inicio"}">${label}</a>`)
    .join("");
  const mobileWhatsapp = `<a class="nav-mobile-whatsapp" data-whatsapp-general href="#" target="_blank" rel="noopener">${SITE_CONTENT.buttons.whatsapp}</a>`;
  navLinks.innerHTML = menuItems + mobileWhatsapp;
}

function renderCategories() {
  categoryGrid.innerHTML = CATEGORIES.map(
    (category) => `
      <button class="category-card" type="button" data-category="${category}">
        <span>${category}</span>
        <small>${SITE_CONTENT.sections.categoryAction}</small>
      </button>
    `
  ).join("");

  categoryGrid.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => setActiveFilter(button.dataset.category));
  });
}

function renderFilters() {
  filterBar.innerHTML = CATALOG_FILTERS.map(
    (filter) => `
      <button class="filter-button ${filter === activeFilter ? "active" : ""}" type="button" data-filter="${filter}">
        ${filter}
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
  catalogProducts.innerHTML = products.map(renderProductCard).join("");
}

function renderFeaturedProducts() {
  featuredProducts.innerHTML = PRODUCTS.filter((product) => product.destaque)
    .slice(0, 4)
    .map(renderProductCard)
    .join("");
}

function renderPromoProducts() {
  promoProducts.innerHTML = PRODUCTS.filter((product) => product.promocao)
    .slice(0, 4)
    .map(renderProductCard)
    .join("");
}

function renderLooks() {
  lookGrid.innerHTML = LOOKS.map((look) => {
    const message = `Olá, gostei do ${look.nome}. Você pode me ajudar a montar esse look?`;
    return `
      <article class="look-card">
        <img src="${look.imagem}" alt="${look.nome}" onerror="this.closest('.look-card').classList.add('look-no-image'); this.remove();">
        <div>
          <h3>${look.nome}</h3>
          <p>${look.descricao}</p>
          <a class="btn btn-outline" href="${whatsappUrl(message)}" target="_blank" rel="noopener">
            ${SITE_CONTENT.buttons.wantLook}
          </a>
        </div>
      </article>
    `;
  }).join("");
}

function applyStoreConfig() {
  const generalMessage = replaceVars(STORE_CONFIG.whatsappDefaultMessage, {
    storeName: STORE_CONFIG.storeName,
  });

  document.title = `${STORE_CONFIG.storeName} | Catálogo de Moda Feminina`;
  document.querySelector("#meta-description").setAttribute("content", SITE_CONTENT.metaDescription);
  document.querySelector("#header-brand").setAttribute("aria-label", `${STORE_CONFIG.storeName} - Início`);

  document.querySelectorAll("[data-store-name]").forEach((element) => {
    element.textContent = STORE_CONFIG.storeName;
  });
  document.querySelectorAll(".brand-mark").forEach((element) => {
    element.textContent = STORE_CONFIG.logoInitials || "NL";
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
    .map((badge) => `<span>${badge}</span>`)
    .join("");

  setText("#categories-eyebrow", SITE_CONTENT.sections.categoriesEyebrow);
  setText("#categorias-title", SITE_CONTENT.sections.categoriesTitle);
  setText("#news-eyebrow", SITE_CONTENT.sections.newsEyebrow);
  setText("#novidades-title", SITE_CONTENT.sections.newsTitle);
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
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("open");
    });
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

renderMenu();
applyStoreConfig();
setupMenu();
setupPromoLinks();
renderCategories();
renderFeaturedProducts();
renderCatalog();
renderPromoProducts();
renderLooks();
