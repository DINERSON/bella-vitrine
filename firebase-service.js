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
      getDocs: firestoreModule.getDocs,
      getFirestore: firestoreModule.getFirestore,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      serverTimestamp: firestoreModule.serverTimestamp,
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

function normalizeProduct(docSnapshot) {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    codigo: data.codigo || "",
    nome: data.nome || "",
    categoria: data.categoria || "",
    subcategoria: data.subcategoria || "",
    tamanhos: data.tamanhos || "",
    cor: data.cor || "",
    tecido: data.tecido || "",
    preco: data.preco || "",
    precoAntigo: data.precoAntigo || "",
    imagem: data.imagem || "",
    status: data.status || "Disponível",
    destaque: Boolean(data.destaque),
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

async function saveProduct(product, imageFile, existingId = null) {
  await ensureFirebase();

  const payload = {
    codigo: product.codigo,
    nome: product.nome,
    categoria: product.categoria,
    subcategoria: product.subcategoria || "",
    tamanhos: product.tamanhos,
    cor: product.cor,
    tecido: product.tecido,
    preco: product.preco,
    precoAntigo: product.precoAntigo,
    descricao: product.descricao,
    status: product.status,
    destaque: Boolean(product.destaque),
    promocao: Boolean(product.promocao),
    imagem: product.imagem || "",
    updatedAt: firebaseModules.serverTimestamp(),
  };

  if (imageFile) {
    const safeName = imageFile.name.replace(/[^\w.-]+/g, "-").toLowerCase();
    const imageRef = firebaseModules.ref(storage, `products/${Date.now()}-${safeName}`);
    await firebaseModules.uploadBytes(imageRef, imageFile);
    payload.imagem = await firebaseModules.getDownloadURL(imageRef);
  }

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
  saveProduct,
  updateProductStatus,
  deleteProduct,
  watchAuth,
  login,
  logout,
};
