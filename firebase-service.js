const FIREBASE_VERSION = "10.12.5";
const config = window.FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.projectId && config.appId);

let app = null;
let auth = null;
let db = null;
let storage = null;
let firebaseModules = null;
let initPromise = null;

async function ensureFirebase() {
  if (!configured) {
    throw new Error("Firebase ainda nao configurado.");
  }

  if (initPromise) return initPromise;

  initPromise = Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-storage.js`),
  ]).then(([appModule, authModule, firestoreModule, storageModule]) => {
    firebaseModules = {
      initializeApp: appModule.initializeApp,
      getAuth: authModule.getAuth,
      onAuthStateChanged: authModule.onAuthStateChanged,
      signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
      signOut: authModule.signOut,
      addDoc: firestoreModule.addDoc,
      collection: firestoreModule.collection,
      deleteDoc: firestoreModule.deleteDoc,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      getFirestore: firestoreModule.getFirestore,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      serverTimestamp: firestoreModule.serverTimestamp,
      setDoc: firestoreModule.setDoc,
      updateDoc: firestoreModule.updateDoc,
      getDownloadURL: storageModule.getDownloadURL,
      getStorage: storageModule.getStorage,
      ref: storageModule.ref,
      uploadBytes: storageModule.uploadBytes,
    };

    app = firebaseModules.initializeApp(config);
    auth = firebaseModules.getAuth(app);
    db = firebaseModules.getFirestore(app);
    storage = firebaseModules.getStorage(app);
  });

  return initPromise;
}

function productsCollection() {
  return firebaseModules.collection(db, "products");
}

function identitiesCollection() {
  return firebaseModules.collection(db, "storeIdentities");
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stockKey(label) {
  return normalizeKey(label) === "unico" ? "Unico" : label;
}

function storeConfigDoc() {
  return firebaseModules.doc(db, "settings", "store");
}

function normalizeStoreConfig(data = {}) {
  const instagramUser = String(data.instagramUser || "").replace(/^@/, "").trim();
  const instagramUrl = data.instagramUrl || (instagramUser ? `https://www.instagram.com/${instagramUser}/` : "");

  return {
    storeName: data.storeName || "",
    logoInitials: data.logoInitials || "",
    logoImage: data.logoImage || "",
    whatsappNumber: data.whatsappNumber || "",
    instagramUser,
    instagramUrl,
    city: data.city || "",
    deliveryText: data.deliveryText || "",
    paymentMethods: data.paymentMethods || "",
    whatsappDefaultMessage: data.whatsappDefaultMessage || "",
    heroTitle: data.heroTitle || "",
    heroSubtitle: data.heroSubtitle || "",
  };
}

function normalizeProduct(docSnapshot) {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    codigo: data.codigo || "",
    nome: data.nome || "",
    categoria: data.categoria || "",
    subcategoria: data.subcategoria || "",
    sizeType: data.sizeType === "calcados" ? "calcas_shorts" : data.sizeType || "",
    tamanhos: data.tamanhos || data.sizesStock || "",
    sizesStock: data.sizesStock || data.tamanhos || {},
    cor: data.cor || "",
    tecido: data.tecido || "",
    preco: data.preco || "",
    precoAntigo: data.precoAntigo || "",
    imagem: data.imagem || "",
    imagens: Array.isArray(data.imagens) ? data.imagens : [],
    status: data.status || "Disponível",
    destaque: Boolean(data.destaque),
    maisVendido: Boolean(data.maisVendido || data.destaque),
    promocao: Boolean(data.promocao),
    descricao: data.descricao || "",
  };
}

function normalizeIdentity(docSnapshot) {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    title: data.title || "",
    description: data.description || "",
    buttonText: data.buttonText || "Quero esse look",
    targetCategory: data.targetCategory || "",
    image: data.image || "",
    active: data.active !== false,
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
  };
}

async function fetchProducts() {
  if (!configured) return [];
  await ensureFirebase();
  const snapshot = await firebaseModules.getDocs(
    firebaseModules.query(productsCollection(), firebaseModules.orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map(normalizeProduct);
}

async function fetchStoreIdentities() {
  if (!configured) return [];
  await ensureFirebase();
  const snapshot = await firebaseModules.getDocs(
    firebaseModules.query(identitiesCollection(), firebaseModules.orderBy("order", "asc"))
  );
  return snapshot.docs.map(normalizeIdentity);
}

function sizesStockFromProduct(product) {
  const sizes = product.sizesStock || product.tamanhos || {};

  if (Array.isArray(sizes)) {
    return sizes.reduce((stock, size) => {
      const label = String(size.label || size.tamanho || "").trim();
      if (label) stock[stockKey(label)] = Math.max(0, Number(size.estoque) || 0);
      return stock;
    }, {});
  }

  if (sizes && typeof sizes === "object") {
    return Object.entries(sizes).reduce((stock, [label, value]) => {
      const key = String(label).trim();
      if (key) stock[stockKey(key)] = Math.max(0, Number(value) || 0);
      return stock;
    }, {});
  }

  return {};
}

function safeFileNamePart(value, fallback = "produto") {
  return String(value || fallback)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

async function uploadProductImages(imageFiles, productCode) {
  if (!storage) {
    console.error("[Vitrine Moda] Firebase Storage nao inicializado.", { configured, config });
    const error = new Error("UPLOAD_ERROR");
    error.uploadError = true;
    throw error;
  }

  const files = Array.isArray(imageFiles) ? imageFiles : [];
  const timestamp = Date.now();
  const safeCode = safeFileNamePart(productCode);
  const uploads = [];
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  for (const item of files) {
    const file = item?.file || item;
    if (!file) continue;
    if (file.type && !allowedTypes.includes(file.type)) {
      console.error("[Vitrine Moda] Tipo de imagem nao permitido.", { name: file.name, type: file.type });
      const error = new Error("UPLOAD_ERROR");
      error.uploadError = true;
      throw error;
    }

    const index = Number.isFinite(Number(item?.index)) ? Number(item.index) : uploads.length;
    const imageNumber = index + 1;
    const imageRef = firebaseModules.ref(storage, `products/${safeCode}-${timestamp}-${imageNumber}.jpg`);
    try {
      await firebaseModules.uploadBytes(imageRef, file, {
        contentType: file.type || "image/jpeg",
      });
      uploads.push({
        index,
        url: await firebaseModules.getDownloadURL(imageRef),
      });
    } catch (error) {
      console.error("[Vitrine Moda] Erro ao enviar foto para Firebase Storage.", {
        path: `products/${safeCode}-${timestamp}-${imageNumber}.jpg`,
        name: file.name,
        type: file.type,
        error,
      });
      const uploadError = new Error("UPLOAD_ERROR");
      uploadError.uploadError = true;
      uploadError.cause = error;
      throw uploadError;
    }
  }

  return uploads;
}

async function uploadIdentityImage(imageFile, identityTitle) {
  const file = imageFile?.file || imageFile;
  if (!file) return "";

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (file.type && !allowedTypes.includes(file.type)) {
    const error = new Error("UPLOAD_ERROR");
    error.uploadError = true;
    throw error;
  }

  const timestamp = Date.now();
  const safeTitle = safeFileNamePart(identityTitle, "identidade");
  const imageRef = firebaseModules.ref(storage, `identities/${timestamp}-${safeTitle}.jpg`);

  try {
    await firebaseModules.uploadBytes(imageRef, file, {
      contentType: file.type || "image/jpeg",
    });
    return firebaseModules.getDownloadURL(imageRef);
  } catch (error) {
    const uploadError = new Error("UPLOAD_ERROR");
    uploadError.uploadError = true;
    uploadError.cause = error;
    throw uploadError;
  }
}

async function fetchStoreConfig() {
  if (!configured) return null;
  await ensureFirebase();
  const snapshot = await firebaseModules.getDoc(storeConfigDoc());
  return snapshot.exists() ? normalizeStoreConfig(snapshot.data()) : null;
}

async function saveStoreConfig(storeConfig) {
  await ensureFirebase();
  await firebaseModules.setDoc(
    storeConfigDoc(),
    {
      ...normalizeStoreConfig(storeConfig),
      updatedAt: firebaseModules.serverTimestamp(),
    },
    { merge: true }
  );
}

async function saveProduct(product, imageFiles = [], existingId = null) {
  await ensureFirebase();
  const sizesStock = sizesStockFromProduct(product);

  const payload = {
    codigo: product.codigo,
    nome: product.nome,
    categoria: product.categoria,
    subcategoria: product.subcategoria || "",
    sizeType: product.sizeType || "",
    tamanhos: product.tamanhos,
    sizesStock,
    cor: product.cor,
    tecido: product.tecido,
    preco: product.preco,
    precoAntigo: product.precoAntigo,
    descricao: product.descricao,
    status: product.status,
    destaque: Boolean(product.destaque),
    maisVendido: Boolean(product.maisVendido || product.destaque),
    promocao: Boolean(product.promocao),
    imagem: product.imagem || "",
    imagens: Array.isArray(product.imagens) ? product.imagens : [],
    updatedAt: firebaseModules.serverTimestamp(),
  };

  const imageSlots = Array.isArray(product.imagens) ? [...product.imagens] : [];
  if (product.imagem && !imageSlots[0]) imageSlots[0] = product.imagem;
  const uploadedImages = await uploadProductImages(imageFiles, product.codigo);
  uploadedImages.forEach(({ index, url }) => {
    imageSlots[index] = url;
  });

  payload.imagem = imageSlots.find(Boolean) || "";
  payload.imagens = imageSlots.filter(Boolean).filter((image, index, list) => list.indexOf(image) === index);

  if (existingId) {
    try {
      await firebaseModules.updateDoc(firebaseModules.doc(db, "products", existingId), payload);
    } catch (error) {
      console.error("[Vitrine Moda] Erro ao atualizar produto no Firestore.", { existingId, payload, error });
      throw error;
    }
    return existingId;
  }

  payload.createdAt = firebaseModules.serverTimestamp();
  let created;
  try {
    created = await firebaseModules.addDoc(productsCollection(), payload);
  } catch (error) {
    console.error("[Vitrine Moda] Erro ao criar produto no Firestore.", { payload, error });
    throw error;
  }
  return created.id;
}

async function saveStoreIdentity(identity, imageFile = null, existingId = null) {
  await ensureFirebase();

  const uploadedImage = await uploadIdentityImage(imageFile, identity.title);
  const payload = {
    title: identity.title || "",
    description: identity.description || "",
    buttonText: identity.buttonText || "Quero esse look",
    targetCategory: identity.targetCategory || "",
    image: uploadedImage || identity.image || "",
    active: identity.active !== false,
    order: Number.isFinite(Number(identity.order)) ? Number(identity.order) : 0,
    updatedAt: firebaseModules.serverTimestamp(),
  };

  if (existingId) {
    await firebaseModules.updateDoc(firebaseModules.doc(db, "storeIdentities", existingId), payload);
    return existingId;
  }

  payload.createdAt = firebaseModules.serverTimestamp();
  const created = await firebaseModules.addDoc(identitiesCollection(), payload);
  return created.id;
}

async function updateStoreIdentityActive(id, active) {
  await ensureFirebase();
  await firebaseModules.updateDoc(firebaseModules.doc(db, "storeIdentities", id), {
    active: Boolean(active),
    updatedAt: firebaseModules.serverTimestamp(),
  });
}

async function deleteStoreIdentity(id) {
  await ensureFirebase();
  await firebaseModules.deleteDoc(firebaseModules.doc(db, "storeIdentities", id));
}

async function updateProductStatus(id, status) {
  await ensureFirebase();
  await firebaseModules.updateDoc(firebaseModules.doc(db, "products", id), {
    status,
    updatedAt: firebaseModules.serverTimestamp(),
  });
}

async function deleteProduct(id) {
  await ensureFirebase();
  await firebaseModules.deleteDoc(firebaseModules.doc(db, "products", id));
}

function watchAuth(callback) {
  if (!configured) {
    callback(null);
    return () => {};
  }

  let unsubscribe = () => {};
  ensureFirebase()
    .then(() => {
      unsubscribe = firebaseModules.onAuthStateChanged(auth, callback);
    })
    .catch(() => callback(null));

  return () => unsubscribe();
}

async function login(email, password) {
  await ensureFirebase();
  return firebaseModules.signInWithEmailAndPassword(auth, email, password);
}

async function logout() {
  if (!configured) return;
  await ensureFirebase();
  await firebaseModules.signOut(auth);
}

window.PrimeFirebase = {
  isConfigured: () => configured,
  fetchProducts,
  fetchStoreIdentities,
  fetchStoreConfig,
  saveStoreConfig,
  saveProduct,
  saveStoreIdentity,
  updateStoreIdentityActive,
  deleteStoreIdentity,
  updateProductStatus,
  deleteProduct,
  watchAuth,
  login,
  logout,
};
