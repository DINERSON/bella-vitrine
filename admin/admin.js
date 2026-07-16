const firebase = window.PrimeFirebase;
const loginView = document.querySelector("#login-view");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const configWarning = document.querySelector("#config-warning");
const logoutButton = document.querySelector("#logout-button");
const productForm = document.querySelector("#product-form");
const formTitle = document.querySelector("#form-title");
const formMessage = document.querySelector("#form-message");
const clearFormButton = document.querySelector("#clear-form");
const productList = document.querySelector("#admin-product-list");
const categorySelect = document.querySelector("#category-select");
const storeConfigForm = document.querySelector("#store-config-form");
const storeConfigMessage = document.querySelector("#store-config-message");
const saveStoreConfigButton = document.querySelector("#save-store-config");

let products = [];

const STOCK_FIELDS = [
  { label: "P", field: "stock_P" },
  { label: "M", field: "stock_M" },
  { label: "G", field: "stock_G" },
  { label: "GG", field: "stock_GG" },
  { label: "XG", field: "stock_XG" },
  { label: "Único", field: "stock_Unico" },
];

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stockKey(label) {
  return normalizeKey(label) === "unico" ? "Unico" : label;
}

function isFirebaseReady() {
  return Boolean(firebase && firebase.isConfigured());
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `form-message ${type}`.trim();
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

function defaultStoreConfig() {
  return {
    storeName: STORE_CONFIG.storeName || "Vitrine Prime",
    logoImage: STORE_CONFIG.logoImage || "assets/brand/vitrine-prime-logo.png",
    whatsappNumber: STORE_CONFIG.whatsappNumber || "",
    instagramUser: STORE_CONFIG.instagramUser || "",
    city: STORE_CONFIG.city || "",
    deliveryText: STORE_CONFIG.deliveryText || "",
    paymentMethods: STORE_CONFIG.paymentMethods || "",
    whatsappDefaultMessage: STORE_CONFIG.whatsappDefaultMessage || "",
    heroTitle: SITE_CONTENT.hero.title || STORE_CONFIG.storeName || "",
    heroSubtitle: SITE_CONTENT.hero.subtitle || "",
  };
}

function fillStoreConfigForm(config = {}) {
  const merged = { ...defaultStoreConfig(), ...config };
  Object.entries(merged).forEach(([field, value]) => {
    if (storeConfigForm.elements[field]) {
      storeConfigForm.elements[field].value = value || "";
    }
  });
}

function storeConfigFromForm() {
  const data = new FormData(storeConfigForm);
  const instagramUser = String(data.get("instagramUser") || "").replace(/^@/, "").trim();

  return {
    storeName: String(data.get("storeName") || "").trim(),
    logoInitials: "VP",
    logoImage: String(data.get("logoImage") || "").trim(),
    whatsappNumber: String(data.get("whatsappNumber") || "").replace(/\D/g, ""),
    instagramUser,
    instagramUrl: instagramUser ? `https://www.instagram.com/${instagramUser}/` : "",
    city: String(data.get("city") || "").trim(),
    deliveryText: String(data.get("deliveryText") || "").trim(),
    paymentMethods: String(data.get("paymentMethods") || "").trim(),
    whatsappDefaultMessage: String(data.get("whatsappDefaultMessage") || "").trim(),
    heroTitle: String(data.get("heroTitle") || "").trim(),
    heroSubtitle: String(data.get("heroSubtitle") || "").trim(),
  };
}

function isUnavailable(product) {
  const status = String(product.status || "").toLowerCase();
  const sizes = normalizeSizes(product);
  return status === "vendido" || status === "esgotado" || (sizes.length > 0 && sizes.every((size) => size.estoque <= 0));
}

function sizesFromForm(data) {
  return STOCK_FIELDS.map(({ label, field }) => {
    const rawValue = String(data.get(field) || "").trim();
    if (rawValue === "") return null;
    return {
      label,
      estoque: Math.max(0, Number(rawValue) || 0),
    };
  }).filter(Boolean);
}

function sizesStockFromSizes(sizes) {
  return sizes.reduce((stock, size) => {
    const key = stockKey(size.label);
    stock[key] = size.estoque;
    return stock;
  }, {});
}

function clearStockFields() {
  STOCK_FIELDS.forEach(({ field }) => {
    productForm.elements[field].value = "";
  });
}

function fillStockFields(product) {
  clearStockFields();
  normalizeSizes(product).forEach((size) => {
    const field = STOCK_FIELDS.find((item) => normalizeKey(item.label) === normalizeKey(size.label))?.field;
    if (field && productForm.elements[field]) {
      productForm.elements[field].value = size.estoque;
    }
  });
}

function sizesSummary(product) {
  const sizes = normalizeSizes(product);
  if (!sizes.length) return "Sem controle de tamanho";
  return sizes.map((size) => `${size.label}: ${size.estoque}`).join(" · ");
}

function normalizeImages(product) {
  const images = Array.isArray(product?.imagens) ? product.imagens : [];
  return [product?.imagem, ...images]
    .map((image) => String(image || "").trim())
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index);
}

function imagesFromForm(data) {
  return [
    data.get("imagemPrincipal"),
    data.get("imagem2"),
    data.get("imagem3"),
    data.get("imagem4"),
  ]
    .map((image) => String(image || "").trim())
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index);
}

function imageFilesFromForm() {
  return ["foto1", "foto2", "foto3", "foto4"]
    .map((field) => productForm.elements[field]?.files?.[0])
    .filter(Boolean);
}

function clearImageFields() {
  ["imagemPrincipal", "imagem2", "imagem3", "imagem4"].forEach((field) => {
    productForm.elements[field].value = "";
  });
}

function fillImageFields(product) {
  clearImageFields();
  const images = normalizeImages(product);
  productForm.elements.imagemPrincipal.value = images[0] || "";
  productForm.elements.imagem2.value = images[1] || "";
  productForm.elements.imagem3.value = images[2] || "";
  productForm.elements.imagem4.value = images[3] || "";
}

function fillCategoryOptions() {
  const productCategories = CATEGORIES.filter((category) => category !== "Mais Vendidos");
  categorySelect.innerHTML = productCategories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
}

function productFromForm() {
  const data = new FormData(productForm);
  const imagens = imagesFromForm(data);
  const tamanhos = sizesFromForm(data);
  return {
    firestoreId: data.get("firestoreId"),
    codigo: data.get("codigo").trim(),
    nome: data.get("nome").trim(),
    categoria: data.get("categoria"),
    subcategoria: data.get("subcategoria").trim(),
    tamanhos,
    sizesStock: sizesStockFromSizes(tamanhos),
    cor: data.get("cor").trim(),
    tecido: data.get("tecido").trim(),
    preco: data.get("preco").trim(),
    precoAntigo: data.get("precoAntigo").trim(),
    descricao: data.get("descricao").trim(),
    status: data.get("status"),
    destaque: data.get("destaque") === "on" || data.get("maisVendido") === "on",
    maisVendido: data.get("maisVendido") === "on",
    promocao: data.get("promocao") === "on",
    imagem: imagens[0] || data.get("imagem"),
    imagens,
  };
}

function resetForm() {
  productForm.reset();
  clearStockFields();
  clearImageFields();
  productForm.elements.firestoreId.value = "";
  productForm.elements.imagem.value = "";
  ["foto1", "foto2", "foto3", "foto4"].forEach((field) => {
    if (productForm.elements[field]) productForm.elements[field].value = "";
  });
  formTitle.textContent = "Cadastrar produto";
  setMessage(formMessage, "");
}

function fillForm(product) {
  productForm.elements.firestoreId.value = product.firestoreId || product.id;
  productForm.elements.imagem.value = product.imagem || "";
  fillImageFields(product);
  productForm.elements.codigo.value = product.codigo || "";
  productForm.elements.nome.value = product.nome || "";
  productForm.elements.categoria.value = product.categoria || "";
  productForm.elements.subcategoria.value = product.subcategoria || "";
  fillStockFields(product);
  productForm.elements.cor.value = product.cor || "";
  productForm.elements.tecido.value = product.tecido || "";
  productForm.elements.preco.value = product.preco || "";
  productForm.elements.precoAntigo.value = product.precoAntigo || "";
  productForm.elements.descricao.value = product.descricao || "";
  productForm.elements.status.value = product.status || "Disponível";
  productForm.elements.destaque.checked = Boolean(product.destaque);
  productForm.elements.maisVendido.checked = Boolean(product.maisVendido || product.destaque);
  productForm.elements.promocao.checked = Boolean(product.promocao);
  formTitle.textContent = `Editar ${product.codigo}`;
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStats() {
  document.querySelector("#stat-total").textContent = products.length;
  document.querySelector("#stat-available").textContent = products.filter((item) => !isUnavailable(item)).length;
  document.querySelector("#stat-sold").textContent = products.filter(isUnavailable).length;
  document.querySelector("#stat-promo").textContent = products.filter((item) => item.promocao).length;
}

function productCard(product) {
  const id = product.firestoreId || product.id;
  const images = normalizeImages(product);
  const imageSrc = images[0] || "";
  const currentStatus = product.status || "Disponível";
  const statusActions = [
    currentStatus !== "Disponível"
      ? '<button class="btn btn-light" type="button" data-action="available">Marcar disponível</button>'
      : "",
    currentStatus !== "Vendido"
      ? '<button class="btn btn-light" type="button" data-action="sold">Marcar vendido</button>'
      : "",
    currentStatus !== "Esgotado"
      ? '<button class="btn btn-light" type="button" data-action="exhausted">Marcar esgotado</button>'
      : "",
  ].join("");
  const image = imageSrc
    ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.nome)}" onerror="this.closest('.admin-product-image').classList.add('missing'); this.remove();">`
    : "";

  return `
    <article class="admin-product" data-id="${escapeHtml(id)}">
      <div class="admin-product-image ${imageSrc ? "" : "missing"}">
        ${image}
        <span>Foto em breve</span>
      </div>
      <div class="admin-product-info">
        <span>${escapeHtml(product.codigo)} · ${escapeHtml(product.categoria)}${product.subcategoria ? ` · ${escapeHtml(product.subcategoria)}` : ""}</span>
        <h3>${escapeHtml(product.nome)}</h3>
        <p>${formatPrice(product.preco)} ${product.promocao && product.precoAntigo ? `<del>${formatPrice(product.precoAntigo)}</del>` : ""}</p>
        <small>Status: ${escapeHtml(isUnavailable(product) ? "Esgotado" : product.status)}${product.destaque ? " · Mais Vendidos" : ""}${product.promocao ? " · Promoção" : ""}</small>
        <small>Estoque: ${escapeHtml(sizesSummary(product))}</small>
        <small>Fotos: ${images.length}</small>
      </div>
      <div class="admin-product-actions">
        <button class="btn btn-outline" type="button" data-action="edit">Editar</button>
        ${statusActions}
        <button class="btn danger-button" type="button" data-action="delete">Excluir</button>
      </div>
    </article>
  `;
}

function renderProducts() {
  renderStats();
  productList.innerHTML = products.length
    ? products.map(productCard).join("")
    : '<div class="empty-state">Nenhum produto cadastrado ainda.</div>';
}

async function loadProducts() {
  try {
    products = await firebase.fetchProducts();
    renderProducts();
  } catch (error) {
    productList.innerHTML = '<div class="empty-state">Não foi possível carregar os produtos agora.</div>';
  }
}

async function loadStoreConfig() {
  fillStoreConfigForm();

  if (!isFirebaseReady()) return;

  try {
    const config = await firebase.fetchStoreConfig();
    if (config) fillStoreConfigForm(config);
  } catch (error) {
    setMessage(storeConfigMessage, "Nao foi possivel carregar as configuracoes agora.", "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (!isFirebaseReady()) {
    setMessage(loginMessage, "Configure o Firebase antes de entrar no painel.", "error");
    return;
  }

  const data = new FormData(loginForm);
  setMessage(loginMessage, "Entrando...");

  try {
    await firebase.login(data.get("email"), data.get("password"));
    setMessage(loginMessage, "");
  } catch (error) {
    setMessage(loginMessage, "E-mail ou senha inválidos. Confira os dados e tente novamente.", "error");
  }
}

async function handleSaveProduct(event) {
  event.preventDefault();
  const product = productFromForm();
  const imageFiles = imageFilesFromForm();
  const existingId = product.firestoreId || null;

  setMessage(formMessage, "Salvando produto...");
  productForm.querySelector("#save-product").disabled = true;

  try {
    await firebase.saveProduct(product, imageFiles, existingId);
    resetForm();
    setMessage(formMessage, "Produto salvo com sucesso.", "success");
    await loadProducts();
  } catch (error) {
    setMessage(formMessage, "Não foi possível salvar. Confira sua internet e tente novamente.", "error");
  } finally {
    productForm.querySelector("#save-product").disabled = false;
  }
}

async function handleSaveStoreConfig(event) {
  event.preventDefault();

  if (!isFirebaseReady()) {
    setMessage(storeConfigMessage, "Configure o Firebase antes de salvar as configuracoes.", "error");
    return;
  }

  setMessage(storeConfigMessage, "Salvando configuracoes...");
  saveStoreConfigButton.disabled = true;

  try {
    await firebase.saveStoreConfig(storeConfigFromForm());
    setMessage(storeConfigMessage, "Configuracoes salvas. A vitrine publica sera atualizada automaticamente.", "success");
  } catch (error) {
    setMessage(storeConfigMessage, "Nao foi possivel salvar as configuracoes. Tente novamente.", "error");
  } finally {
    saveStoreConfigButton.disabled = false;
  }
}

async function handleProductAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const card = button.closest("[data-id]");
  const id = card.dataset.id;
  const product = products.find((item) => (item.firestoreId || item.id) === id);
  if (!product) return;

  const action = button.dataset.action;

  if (action === "edit") {
    fillForm(product);
    return;
  }

  try {
    button.disabled = true;
    if (action === "sold") await firebase.updateProductStatus(id, "Vendido");
    if (action === "available") await firebase.updateProductStatus(id, "Disponível");
    if (action === "exhausted") await firebase.updateProductStatus(id, "Esgotado");
    if (action === "delete") {
      const confirmed = window.confirm(`Excluir ${product.codigo} - ${product.nome}?`);
      if (!confirmed) return;
      await firebase.deleteProduct(id);
    }
    await loadProducts();
  } catch (error) {
    window.alert("Não foi possível concluir a ação. Tente novamente.");
  } finally {
    button.disabled = false;
  }
}

function showLoggedIn() {
  loginView.hidden = true;
  adminApp.hidden = false;
  loadProducts();
}

function showLoggedOut() {
  loginView.hidden = false;
  adminApp.hidden = true;
}

fillCategoryOptions();
configWarning.hidden = isFirebaseReady();
loginForm.addEventListener("submit", handleLogin);
productForm.addEventListener("submit", handleSaveProduct);
storeConfigForm.addEventListener("submit", handleSaveStoreConfig);
clearFormButton.addEventListener("click", resetForm);
productList.addEventListener("click", handleProductAction);
logoutButton.addEventListener("click", () => firebase.logout());

if (isFirebaseReady()) {
  firebase.watchAuth((user) => {
    if (user) showLoggedIn();
    else showLoggedOut();
  });
} else {
  showLoggedOut();
}

loadStoreConfig();
