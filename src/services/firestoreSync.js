import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
let firestoreInstance = null;
let firestoreDbId = "";
let isConnected = false;
function initFirestore() {
  if (firestoreInstance) return firestoreInstance;
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("[Firestore] firebase-applet-config.json n\xE3o encontrado");
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firestoreDbId = config.firestoreDatabaseId || "";
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreInstance = getFirestore(app, firestoreDbId);
    isConnected = true;
    console.log(`[Firestore] Conectado ao Google Cloud Firestore (${firestoreDbId})`);
    return firestoreInstance;
  } catch (err) {
    console.warn("[Firestore] Falha ao inicializar Google Cloud Firestore:", err.message);
    isConnected = false;
    return null;
  }
}
function isFirestoreConnected() {
  return isConnected && firestoreInstance !== null;
}
function getFirestoreDatabaseId() {
  return firestoreDbId;
}
async function saveSingleDocumentToFirestore(collectionName, id, data) {
  const db = initFirestore();
  if (!db || !collectionName || !id || !data) return false;
  try {
    const docRef = doc(db, collectionName, String(id));
    await setDoc(docRef, { ...data, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Falha ao salvar documento em ${collectionName}/${id}:`, err.message);
    return false;
  }
}
const ALL_SYSTEM_COLLECTIONS = [
  "registeredCompanies",
  "users",
  "clients",
  "suppliers",
  "vehicles",
  "parts",
  "services",
  "budgets",
  "serviceOrders",
  "sales",
  "goodsWithdrawals",
  "quotations",
  "supplierPartPrices",
  "accountsReceivable",
  "accountsPayable",
  "financialTransactions",
  "bankStatements",
  "paymentMethods",
  "fiscalDocuments",
  "boletos",
  "boms",
  "billOfMaterials",
  "productionOrders",
  "productLots",
  "operationalAlerts",
  "alertSettings",
  "notifications",
  "unitsOfMeasure",
  "carriers",
  "accessGroups",
  "history",
  "loginHistory",
  "solidworksProjects",
  "materialSeparations",
  "factoryOperators",
  "interBranchSales",
  "stockMovements",
  "maintenanceLogs",
  "shopFloorEntries",
  "purchaseHistory",
  "xmlImportRecords",
  "installedEquipment",
  "qualityInspections",
  "technicalDocuments",
  "warehouseLocations",
  "productionScrapLogs",
  "productionReworkLogs",
  "taxRules",
  "taxObligationGuides",
  "taxOperationNatures",
  "nonConformityReports",
  "billingClosings",
  "monthlyAccountingClosings",
  "equipmentMaintenancePlans",
  "equipmentMaintenanceOrders",
  "pendingPriceRevisions",
  "priceChangeHistory",
  "priceCalculationHistory",
  "representedCompanies",
  "representativeOrders",
  "representativeFactoryOrders",
  "factoryInvoices",
  "representativeCommissions"
];
async function loadDatabaseFromFirestore() {
  const db = initFirestore();
  if (!db) return null;
  try {
    const result = {};
    for (const colName of ALL_SYSTEM_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          result[colName] = snap.docs.map((d) => d.data());
        }
      } catch (colErr) {
      }
    }
    try {
      const metaDocs = ["companyInfo", "sefazConfig", "contractModules", "alertSettings"];
      for (const mId of metaDocs) {
        const mSnap = await getDoc(doc(db, "system_meta", mId));
        if (mSnap.exists()) {
          result[mId] = mSnap.data();
        }
      }
    } catch {
    }
    return result;
  } catch (err) {
    console.warn("[Firestore] Falha ao carregar banco do Firestore:", err.message);
    return null;
  }
}
async function saveCompanyToFirestore(company) {
  const db = initFirestore();
  if (!db || !company || !company.id) return false;
  try {
    const docRef = doc(db, "registeredCompanies", String(company.id));
    await setDoc(docRef, { ...company, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar empresa ${company.id} no Firestore:`, err.message);
    return false;
  }
}
async function setActiveCompanyInFirestore(userOrToken, companyId) {
  const db = initFirestore();
  if (!db || !userOrToken || !companyId) return false;
  try {
    const cleanKey = String(userOrToken).replace(/[^a-zA-Z0-9_-]/g, "_");
    const docRef = doc(db, "active_company_states", cleanKey);
    await setDoc(docRef, {
      userOrToken,
      activeCompanyId: companyId,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[Firestore] Erro ao gravar empresa ativa no Firestore:", err.message);
    return false;
  }
}
async function getActiveCompanyFromFirestore(userOrToken) {
  const db = initFirestore();
  if (!db || !userOrToken) return null;
  try {
    const cleanKey = String(userOrToken).replace(/[^a-zA-Z0-9_-]/g, "_");
    const docRef = doc(db, "active_company_states", cleanKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return data?.activeCompanyId || null;
    }
  } catch (err) {
    console.warn("[Firestore] Erro ao buscar empresa ativa no Firestore:", err.message);
  }
  return null;
}
async function syncDatabaseCollectionsToFirestore(data) {
  const db = initFirestore();
  if (!db || !data || typeof data !== "object") return false;
  try {
    const allCollections = Array.from(/* @__PURE__ */ new Set([...ALL_SYSTEM_COLLECTIONS, ...Object.keys(data).filter((k) => Array.isArray(data[k]))]));
    for (const colName of allCollections) {
      const items = data[colName];
      if (!Array.isArray(items) || items.length === 0) continue;
      let batch = writeBatch(db);
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const docId = String(item.id || item.code || item.documentNumber || `doc-${i}`);
        const docRef = doc(db, colName, docId);
        batch.set(docRef, item, { merge: true });
        count++;
        if (count >= 400 || i === items.length - 1) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }
    const metaKeys = ["companyInfo", "sefazConfig", "contractModules", "alertSettings"];
    for (const mKey of metaKeys) {
      if (data[mKey] && typeof data[mKey] === "object") {
        await setDoc(doc(db, "system_meta", mKey), data[mKey], { merge: true });
      }
    }
    return true;
  } catch (err) {
    console.warn("[Firestore] Falha na sincroniza\xE7\xE3o em lote com Firestore:", err.message);
    return false;
  }
}
export {
  ALL_SYSTEM_COLLECTIONS,
  getActiveCompanyFromFirestore,
  getFirestoreDatabaseId,
  initFirestore,
  isFirestoreConnected,
  loadDatabaseFromFirestore,
  saveCompanyToFirestore,
  saveSingleDocumentToFirestore,
  setActiveCompanyInFirestore,
  syncDatabaseCollectionsToFirestore
};
