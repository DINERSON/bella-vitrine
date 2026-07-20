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
const adminSearch = document.querySelector("#admin-search");
const adminStatusFilter = document.querySelector("#admin-status-filter");
const refreshProductsButton = document.querySelector("#refresh-products");
const imagePreviewGrid = document.querySelector("#image-preview-grid");
const sizeTypeSelect = document.querySelector("#size-type-select");
const stockGrid = document.querySelector("#stock-grid");
const customSizeRow = document.querySelector("#custom-size-row");
const identityForm = document.querySelector("#identity-form");
const identityFormMessage = document.querySelector("#identity-form-message");
const clearIdentityFormButton = document.querySelector("#clear-identity-form");
const identityCategorySelect = document.querySelector("#identity-category-select");
const identityImagePreview = document.querySelector("#identity-image-preview");
const identityList = document.querySelector("#admin-identity-list");
const refreshIdentitiesButton = document.querySelector("#refresh-identities");

let products = [];
let identities = [];

const STOCK_FIELDS = [
  { label: "P", field: "stock_P" },
  { label: "M", field: "stock_M" },
  { label: "G", field: "stock_G" },
  { label: "GG", field: "stock_GG" },
  { label: "XL", field: "stock_XL" },
  { label: "Único", field: "stock_Unico" },
];

const SIZE_GRIDS = {
  roupas: ["P", "M", "G", "GG", "XL"],
  calcas_shorts: ["32", "33", "34", "35", "36", "37", "38", "39", "40", "42", "44", "46", "48"],
  infantil: ["1", "2", "3", "4", "6", "8", "10", "12", "14", "16"],
  unico: ["Unico"],
  personalizado: [],
  sem_tamanho: [],
};

const PHOTO_FIELDS = [
  { file: "foto1", current: "imagemPrincipal", remove: "removeFoto1", label: "Foto principal" },
  { file: "foto2", current: "imagem2", remove: "removeFoto2", label: "Foto 2" },
  { file: "foto3", current: "imagem3", remove: "removeFoto3", label: "Foto 3" },
  { file: "foto4", current: "imagem4", remove: "removeFoto4", label: "Foto 4" },
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

function normalizeSizeType(sizeType) {
  const value = normalizeKey(sizeType).replace(/-/g, "_");
  if (value === "calcados") return "calcas_shorts";
  if (value === "calcas_e_shorts") return "calcas_shorts";
  return SIZE_GRIDS[value] ? value : "roupas";
}

function stockFieldName(label) {
  return `stock_${stockKey(label)}`;
}

function fieldsForSizeType(sizeType, product = null) {
  const normalized = normalizeSizeType(sizeType);
  if (normalized === "personalizado") {
    const customSizes = normalizeSizes(product || {});
    return customSizes.length ? customSizes.map((size) => size.label) : [];
  }
  const defaultFields = SIZE_GRIDS[normalized] || SIZE_GRIDS.roupas;
  const savedFields = normalizeSizes(product || {}).map((size) => size.label);
  return [...defaultFields, ...savedFields].filter((label, index, list) => list.indexOf(label) === index);
}

function inferSizeType(product) {
  const savedType = normalizeSizeType(product?.sizeType);
  if (product?.sizeType) return savedType;

  const labels = normalizeSizes(product).map((size) => size.label);
  if (!labels.length) return "roupas";
  if (labels.every((label) => /^\d+$/.test(label))) return "calcas_shorts";
  if (labels.length === 1 && normalizeKey(labels[0]) === "unico") return "unico";
  return "roupas";
}

function renderStockGrid(sizeType = "roupas", product = null) {
  if (!stockGrid) return;

  const normalized = normalizeSizeType(sizeType);
  const fields =
    normalized === "personalizado" && !product
      ? customSizeLabels(new FormData(productForm))
      : fieldsForSizeType(normalized, product);
  const currentSizes = normalizeSizes(product || {});
  const stockByLabel = currentSizes.reduce((stock, size) => {
    stock[normalizeKey(size.label)] = size.estoque;
    return stock;
  }, {});

  if (customSizeRow) customSizeRow.hidden = normalized !== "personalizado";

  if (normalized === "sem_tamanho") {
    stockGrid.innerHTML = '<div class="empty-state">Produto sem controle de tamanho ou numeração.</div>';
    return;
  }

  stockGrid.innerHTML = fields
    .map((label) => {
      const value = stockByLabel[normalizeKey(label)];
      return `
        <label>
          ${escapeHtml(label)}
          <input name="${escapeHtml(stockFieldName(label))}" type="number" min="0" step="1" placeholder="0" value="${value ?? ""}" />
        </label>
      `;
    })
    .join("");
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
    storeName: STORE_CONFIG.storeName || "Vitrine Moda",
    logoImage: STORE_CONFIG.logoImage || "assets/brand/logo-vitrine-moda.svg",
    slogan: STORE_CONFIG.slogan || "Moda que realça você",
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

function cleanBrandText(value) {
  const text = String(value || "").trim();
  const oldA = ["vitrine", "prime"].join(" ");
  const oldB = ["prime", "vitrine"].join(" ");
  return new RegExp(`^(${oldA}|${oldB})$`, "i").test(text) ? "Vitrine Moda" : text;
}

function fillStoreConfigForm(config = {}) {
  const merged = { ...defaultStoreConfig(), ...config };
  merged.storeName = cleanBrandText(merged.storeName);
  merged.heroTitle = cleanBrandText(merged.heroTitle);
  merged.slogan = merged.slogan || "Moda que realça você";
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
    logoInitials: "VM",
    logoImage: String(data.get("logoImage") || "").trim(),
    slogan: String(data.get("slogan") || "").trim(),
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

function customSizeLabels(data) {
  return String(data.get("customSizes") || "")
    .split(/[\/,|;]+/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function sizesFromForm(data, sizeType) {
  const normalized = normalizeSizeType(sizeType);
  const labels = normalized === "personalizado" ? customSizeLabels(data) : fieldsForSizeType(normalized);

  if (normalized === "sem_tamanho") return [];

  return labels.map((label) => {
    const rawValue = String(data.get(stockFieldName(label)) || "").trim();
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
  if (productForm.elements.customSizes) productForm.elements.customSizes.value = "";
  renderStockGrid(sizeTypeSelect?.value || "roupas");
}

function fillStockFields(product) {
  const sizeType = inferSizeType(product);
  if (sizeTypeSelect) sizeTypeSelect.value = sizeType;
  if (productForm.elements.customSizes && sizeType === "personalizado") {
    productForm.elements.customSizes.value = normalizeSizes(product).map((size) => size.label).join(", ");
  }
  renderStockGrid(sizeType, product);
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
  return PHOTO_FIELDS.map(({ current, remove }) => {
    if (String(data.get(remove) || "") === "1") return "";
    return String(data.get(current) || "").trim();
  });
}

function imageFilesFromForm() {
  return PHOTO_FIELDS.map(({ file }, index) => ({
    file: productForm.elements[file]?.files?.[0] || null,
    index,
  })).filter((item) => item.file);
}

function clearImageFields() {
  PHOTO_FIELDS.forEach(({ file, current, remove }) => {
    productForm.elements[current].value = "";
    productForm.elements[remove].value = "";
    if (productForm.elements[file]) productForm.elements[file].value = "";
  });
}

function renderImagePreview() {
  if (!imagePreviewGrid) return;

  const data = new FormData(productForm);
  const images = PHOTO_FIELDS.map(({ file, current, remove }) => {
    const selectedFile = productForm.elements[file]?.files?.[0];
    if (selectedFile) return URL.createObjectURL(selectedFile);
    if (String(data.get(remove) || "") === "1") return "";
    return String(data.get(current) || "").trim();
  });

  imagePreviewGrid.innerHTML = PHOTO_FIELDS
    .map(({ file, current, remove, label }, index) => {
      const image = images[index];
      if (!image) {
        return `
          <div class="image-preview-card missing" data-photo-index="${index}">
            <span>${escapeHtml(label)}</span>
          </div>
        `;
      }

      return `
        <div class="image-preview-card" data-photo-index="${index}">
          <img src="${escapeHtml(image)}" alt="Previa da foto ${index + 1}" onerror="this.closest('.image-preview-card').classList.add('missing'); this.remove();">
          <span>${escapeHtml(label)}</span>
          <button class="remove-photo-button" type="button" data-remove-photo="${index}" aria-label="Remover ${escapeHtml(label)}">Remover foto</button>
        </div>
      `;
    })
    .join("");
}

function fillImageFields(product) {
  clearImageFields();
  const images = normalizeImages(product);
  PHOTO_FIELDS.forEach(({ current }, index) => {
    productForm.elements[current].value = images[index] || "";
  });
}

function fillCategoryOptions() {
  const productCategories = CATEGORIES.filter((category) => category !== "Mais Vendidos");
  categorySelect.innerHTML = productCategories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  if (identityCategorySelect) {
    identityCategorySelect.innerHTML = CATALOG_FILTERS.filter((category) => category !== "Todos")
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
  }
}

function identityImageFileFromForm() {
  return identityForm?.elements.identityImageFile?.files?.[0] || null;
}

function identityFromForm() {
  const data = new FormData(identityForm);
  const removeImage = String(data.get("removeIdentityImage") || "") === "1";
  return {
    firestoreId: data.get("firestoreId"),
    title: String(data.get("title") || "").trim(),
    description: String(data.get("description") || "").trim(),
    buttonText: String(data.get("buttonText") || "").trim() || "Quero esse look",
    targetCategory: String(data.get("targetCategory") || "").trim(),
    image: removeImage ? "" : String(data.get("image") || "").trim(),
    active: data.get("active") !== "false",
    order: Number(data.get("order")) || 0,
  };
}

function normalizeIdentityImage(identity) {
  return String(identity?.image || identity?.imagem || "").trim();
}

function renderIdentityImagePreview() {
  if (!identityImagePreview || !identityForm) return;

  const selectedFile = identityImageFileFromForm();
  const removed = identityForm.elements.removeIdentityImage.value === "1";
  const image = selectedFile ? URL.createObjectURL(selectedFile) : removed ? "" : String(identityForm.elements.image.value || "").trim();

  identityImagePreview.innerHTML = image
    ? `
      <div class="image-preview-card">
        <img src="${escapeHtml(image)}" alt="Previa da identidade" onerror="this.closest('.image-preview-card').classList.add('missing'); this.remove();">
        <span>Imagem da identidade</span>
        <button class="remove-photo-button" type="button" data-remove-identity-image aria-label="Remover imagem da identidade">Remover foto</button>
      </div>
    `
    : '<div class="image-preview-card missing"><span>Imagem em breve</span></div>';
}

function resetIdentityForm() {
  if (!identityForm) return;
  identityForm.reset();
  identityForm.elements.firestoreId.value = "";
  identityForm.elements.buttonText.value = "Quero esse look";
  identityForm.elements.active.value = "true";
  identityForm.elements.image.value = "";
  identityForm.elements.removeIdentityImage.value = "";
  setMessage(identityFormMessage, "");
  renderIdentityImagePreview();
}

function fillIdentityForm(identity) {
  if (!identityForm) return;
  identityForm.elements.firestoreId.value = identity.firestoreId || identity.id || "";
  identityForm.elements.title.value = identity.title || "";
  identityForm.elements.description.value = identity.description || "";
  identityForm.elements.buttonText.value = identity.buttonText || "Quero esse look";
  identityForm.elements.targetCategory.value = identity.targetCategory || "Masculino";
  identityForm.elements.order.value = Number.isFinite(Number(identity.order)) ? Number(identity.order) : 0;
  identityForm.elements.active.value = identity.active === false ? "false" : "true";
  identityForm.elements.image.value = normalizeIdentityImage(identity);
  identityForm.elements.removeIdentityImage.value = "";
  if (identityForm.elements.identityImageFile) identityForm.elements.identityImageFile.value = "";
  setMessage(identityFormMessage, `Editando ${identity.title || "identidade"}.`);
  renderIdentityImagePreview();
  identityForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function identityCard(identity) {
  const id = identity.firestoreId || identity.id;
  const imageSrc = normalizeIdentityImage(identity);
  const image = imageSrc
    ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(identity.title)}" onerror="this.closest('.admin-product-image').classList.add('missing'); this.remove();">`
    : "";
  const statusText = identity.active === false ? "Inativo" : "Ativo";
  const toggleText = identity.active === false ? "Ativar" : "Desativar";

  return `
    <article class="admin-product" data-identity-id="${escapeHtml(id)}">
      <div class="admin-product-image ${imageSrc ? "" : "missing"}">
        ${image}
        <span>Imagem em breve</span>
      </div>
      <div class="admin-product-info">
        <span>Ordem ${escapeHtml(identity.order || 0)} · ${escapeHtml(identity.targetCategory || "Sem destino")}</span>
        <h3>${escapeHtml(identity.title)}</h3>
        <p>${escapeHtml(identity.buttonText || "Quero esse look")}</p>
        <small>${escapeHtml(identity.description || "Sem descricao.")}</small>
        <small>Status: ${escapeHtml(statusText)}</small>
      </div>
      <div class="admin-product-actions">
        <button class="btn btn-outline" type="button" data-identity-action="edit">Editar</button>
        <button class="btn btn-light" type="button" data-identity-action="toggle">${escapeHtml(toggleText)}</button>
        <button class="btn danger-button" type="button" data-identity-action="delete">Excluir</button>
      </div>
    </article>
  `;
}

function renderIdentities() {
  if (!identityList) return;
  const listedIdentities = [...identities].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  identityList.innerHTML = listedIdentities.length
    ? listedIdentities.map(identityCard).join("")
    : '<div class="empty-state">Nenhuma identidade cadastrada ainda. A vitrine usa os tres cards padrao enquanto isso.</div>';
}

async function loadIdentities() {
  if (!identityList) return;
  identityList.innerHTML = '<div class="empty-state">Carregando identidades...</div>';

  if (!isFirebaseReady()) {
    identities = [];
    renderIdentities();
    return;
  }

  try {
    identities = await firebase.fetchStoreIdentities();
    renderIdentities();
  } catch (error) {
    identityList.innerHTML = '<div class="empty-state">Nao foi possivel carregar as identidades agora.</div>';
  }
}

function productFromForm() {
  const data = new FormData(productForm);
  const imagens = imagesFromForm(data);
  const sizeType = normalizeSizeType(data.get("sizeType"));
  const tamanhos = sizesFromForm(data, sizeType);
  return {
    firestoreId: data.get("firestoreId"),
    codigo: data.get("codigo").trim(),
    nome: data.get("nome").trim(),
    categoria: data.get("categoria"),
    subcategoria: data.get("subcategoria").trim(),
    sizeType,
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
    imagem: imagens.find(Boolean) || "",
    imagens,
  };
}

function resetForm() {
  productForm.reset();
  if (sizeTypeSelect) sizeTypeSelect.value = "roupas";
  clearStockFields();
  clearImageFields();
  productForm.elements.firestoreId.value = "";
  productForm.elements.imagem.value = "";
  formTitle.textContent = "Cadastrar produto";
  setMessage(formMessage, "");
  renderImagePreview();
}

function handleRemoveProductPhoto(event) {
  const button = event.target.closest("[data-remove-photo]");
  if (!button) return;

  const index = Number(button.dataset.removePhoto);
  const field = PHOTO_FIELDS[index];
  if (!field) return;

  if (productForm.elements[field.file]) productForm.elements[field.file].value = "";
  productForm.elements[field.current].value = "";
  productForm.elements[field.remove].value = "1";
  renderImagePreview();
}

function handleRemoveIdentityImage(event) {
  const button = event.target.closest("[data-remove-identity-image]");
  if (!button || !identityForm) return;

  if (identityForm.elements.identityImageFile) identityForm.elements.identityImageFile.value = "";
  identityForm.elements.image.value = "";
  identityForm.elements.removeIdentityImage.value = "1";
  renderIdentityImagePreview();
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
  renderImagePreview();
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStats() {
  document.querySelector("#stat-total").textContent = products.length;
  document.querySelector("#stat-available").textContent = products.filter((item) => !isUnavailable(item)).length;
  document.querySelector("#stat-sold").textContent = products.filter(isUnavailable).length;
  document.querySelector("#stat-promo").textContent = products.filter((item) => item.promocao).length;
}

function filteredProducts() {
  const search = normalizeKey(adminSearch?.value || "");
  const statusFilter = adminStatusFilter?.value || "Todos";

  return products.filter((product) => {
    const haystack = normalizeKey(
      [product.codigo, product.nome, product.categoria, product.subcategoria, product.cor, product.tecido].join(" ")
    );
    const unavailable = isUnavailable(product);
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus =
      statusFilter === "Todos" ||
      (statusFilter === "Disponivel" && !unavailable) ||
      (statusFilter === "Vendido" && String(product.status || "").toLowerCase() === "vendido") ||
      (statusFilter === "Esgotado" && unavailable) ||
      (statusFilter === "Promocao" && product.promocao) ||
      (statusFilter === "MaisVendidos" && (product.maisVendido || product.destaque));

    return matchesSearch && matchesStatus;
  });
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
  const listedProducts = filteredProducts();
  productList.innerHTML = listedProducts.length
    ? listedProducts.map(productCard).join("")
    : '<div class="empty-state">Nenhum produto encontrado para esse filtro.</div>';
}

async function loadProducts() {
  productList.innerHTML = '<div class="empty-state">Carregando produtos...</div>';
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
    const uploadFailed = error?.message === "UPLOAD_ERROR" || error?.uploadError;
    setMessage(
      formMessage,
      uploadFailed ? "Erro ao enviar foto. Tente novamente." : "Não foi possível salvar. Confira sua internet e tente novamente.",
      "error"
    );
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
    await loadStoreConfig();
  } catch (error) {
    setMessage(storeConfigMessage, "Nao foi possivel salvar as configuracoes. Tente novamente.", "error");
  } finally {
    saveStoreConfigButton.disabled = false;
  }
}

async function handleSaveIdentity(event) {
  event.preventDefault();

  if (!isFirebaseReady()) {
    setMessage(identityFormMessage, "Configure o Firebase antes de salvar identidades.", "error");
    return;
  }

  const identity = identityFromForm();
  const imageFile = identityImageFileFromForm();
  const existingId = identity.firestoreId || null;

  setMessage(identityFormMessage, "Salvando identidade...");
  identityForm.querySelector("#save-identity").disabled = true;

  try {
    await firebase.saveStoreIdentity(identity, imageFile, existingId);
    resetIdentityForm();
    setMessage(identityFormMessage, "Identidade salva com sucesso.", "success");
    await loadIdentities();
  } catch (error) {
    const uploadFailed = error?.message === "UPLOAD_ERROR" || error?.uploadError;
    setMessage(
      identityFormMessage,
      uploadFailed ? "Erro ao enviar imagem. Tente novamente." : "Nao foi possivel salvar a identidade. Tente novamente.",
      "error"
    );
  } finally {
    identityForm.querySelector("#save-identity").disabled = false;
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
      const confirmed = window.confirm(`Tem certeza que deseja excluir ${product.codigo} - ${product.nome}?`);
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

async function handleIdentityAction(event) {
  const button = event.target.closest("[data-identity-action]");
  if (!button) return;

  const card = button.closest("[data-identity-id]");
  const id = card?.dataset.identityId;
  const identity = identities.find((item) => (item.firestoreId || item.id) === id);
  if (!identity) return;

  const action = button.dataset.identityAction;

  if (action === "edit") {
    fillIdentityForm(identity);
    return;
  }

  try {
    button.disabled = true;
    if (action === "toggle") {
      await firebase.updateStoreIdentityActive(id, identity.active === false);
    }
    if (action === "delete") {
      const confirmed = window.confirm(`Tem certeza que deseja excluir ${identity.title}?`);
      if (!confirmed) return;
      await firebase.deleteStoreIdentity(id);
    }
    await loadIdentities();
  } catch (error) {
    window.alert("Nao foi possivel concluir a acao. Tente novamente.");
  } finally {
    button.disabled = false;
  }
}

function showLoggedIn() {
  loginView.hidden = true;
  adminApp.hidden = false;
  loadStoreConfig();
  loadProducts();
  loadIdentities();
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
identityForm?.addEventListener("submit", handleSaveIdentity);
clearFormButton.addEventListener("click", resetForm);
clearIdentityFormButton?.addEventListener("click", resetIdentityForm);
productList.addEventListener("click", handleProductAction);
identityList?.addEventListener("click", handleIdentityAction);
logoutButton.addEventListener("click", () => firebase.logout());
adminSearch?.addEventListener("input", renderProducts);
adminStatusFilter?.addEventListener("change", renderProducts);
refreshProductsButton?.addEventListener("click", loadProducts);
refreshIdentitiesButton?.addEventListener("click", loadIdentities);
PHOTO_FIELDS.forEach(({ file }) => {
  productForm.elements[file]?.addEventListener("change", renderImagePreview);
});
imagePreviewGrid?.addEventListener("click", handleRemoveProductPhoto);
identityForm?.elements.identityImageFile?.addEventListener("change", renderIdentityImagePreview);
identityImagePreview?.addEventListener("click", handleRemoveIdentityImage);
sizeTypeSelect?.addEventListener("change", () => {
  if (productForm.elements.customSizes) productForm.elements.customSizes.value = "";
  renderStockGrid(sizeTypeSelect.value);
});
productForm.elements.customSizes?.addEventListener("input", () => {
  renderStockGrid("personalizado");
});

if (isFirebaseReady()) {
  firebase.watchAuth((user) => {
    if (user) showLoggedIn();
    else showLoggedOut();
  });
} else {
  showLoggedOut();
}

loadStoreConfig();
renderImagePreview();
renderIdentityImagePreview();
renderStockGrid("roupas");
