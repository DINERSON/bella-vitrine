const FIREBASE_VERSION = "10.12.5";
const config = window.FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.projectId && config.appId);

let app = null;
let auth = null;
let db = null;
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
  ]).then(([appModule, authModule, firestoreModule]) => {
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
    };

    app = firebaseModules.initializeApp(config);
    auth = firebaseModules.getAuth(app);
    db = firebaseModules.getFirestore(app);
  });

  return initPromise;
}

function productsCollection() {
  return firebaseModules.collection(db, "products");
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

async function fetchProducts() {
  if (!configured) return [];
  await ensureFirebase();
  const snapshot = await firebaseModules.getDocs(
    firebaseModules.query(productsCollection(), firebaseModules.orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map(normalizeProduct);
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

async function saveProduct(product, existingId = null) {
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

  payload.imagens = [payload.imagem, ...payload.imagens].filter(Boolean).filter((image, index, list) => list.indexOf(image) === index);

  if (existingId) {
    await firebaseModules.updateDoc(firebaseModules.doc(db, "products", existingId), payload);
    return existingId;
  }

  payload.createdAt = firebaseModules.serverTimestamp();
  const created = await firebaseModules.addDoc(productsCollection(), payload);
  return created.id;
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
  fetchStoreConfig,
  saveStoreConfig,
  saveProduct,
  updateProductStatus,
  deleteProduct,
  watchAuth,
  login,
  logout,
};
