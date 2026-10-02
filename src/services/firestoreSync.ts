import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: any = null;
let firestoreDbId: string = '';
let isConnected = false;

export function initFirestore(): any {
  if (firestoreInstance) return firestoreInstance;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firestore] firebase-applet-config.json não encontrado');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firestoreDbId = config.firestoreDatabaseId || '';

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreInstance = getFirestore(app, firestoreDbId);
    isConnected = true;
    console.log(`[Firestore] Conectado ao Google Cloud Firestore (${firestoreDbId})`);
    return firestoreInstance;
  } catch (err: any) {
    console.warn('[Firestore] Falha ao inicializar Google Cloud Firestore:', err.message);
    isConnected = false;
    return null;
  }
}

export function isFirestoreConnected(): boolean {
  return isConnected && firestoreInstance !== null;
}

export function getFirestoreDatabaseId(): string {
  return firestoreDbId;
}

// Salva um registro individual diretamente no Google Cloud Firestore (< 1 KB)
export async function saveSingleDocumentToFirestore(collectionName: string, id: string, data: any): Promise<boolean> {
  const db = initFirestore();
  if (!db || !collectionName || !id || !data) return false;

  try {
    const docRef = doc(db, collectionName, String(id));
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] Falha ao salvar documento em ${collectionName}/${id}:`, err.message);
    return false;
  }
}

export const ALL_SYSTEM_COLLECTIONS = [
  'registeredCompanies',
  'users',
  'clients',
  'suppliers',
  'vehicles',
  'parts',
  'services',
  'budgets',
  'serviceOrders',
  'sales',
  'goodsWithdrawals',
  'quotations',
  'supplierPartPrices',
  'accountsReceivable',
  'accountsPayable',
  'financialTransactions',
  'bankStatements',
  'paymentMethods',
  'fiscalDocuments',
  'boletos',
  'boms',
  'billOfMaterials',
  'productionOrders',
  'productLots',
  'operationalAlerts',
  'alertSettings',
  'notifications',
  'unitsOfMeasure',
  'carriers',
  'accessGroups',
  'history',
  'loginHistory',
  'solidworksProjects',
  'materialSeparations',
  'factoryOperators',
  'interBranchSales',
  'stockMovements',
  'maintenanceLogs',
  'shopFloorEntries',
  'purchaseHistory',
  'xmlImportRecords',
  'installedEquipment',
  'qualityInspections',
  'technicalDocuments',
  'warehouseLocations',
  'productionScrapLogs',
  'productionReworkLogs',
  'taxRules',
  'taxObligationGuides',
  'taxOperationNatures',
  'nonConformityReports',
  'billingClosings',
  'monthlyAccountingClosings',
  'equipmentMaintenancePlans',
  'equipmentMaintenanceOrders',
  'pendingPriceRevisions',
  'priceChangeHistory',
  'priceCalculationHistory',
  'representedCompanies',
  'representativeOrders',
  'representativeFactoryOrders',
  'factoryInvoices',
  'representativeCommissions',
];

// Carrega todas as coleções diretamente do Google Cloud Firestore
export async function loadDatabaseFromFirestore(): Promise<any | null> {
  const db = initFirestore();
  if (!db) return null;

  try {
    const result: Record<string, any> = {};
    for (const colName of ALL_SYSTEM_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          result[colName] = snap.docs.map(d => d.data());
        }
      } catch (colErr: any) {
        // Coleção vazia ou em criação
      }
    }

    // Carregar metadados do sistema
    try {
      const metaDocs = ['companyInfo', 'sefazConfig', 'contractModules', 'alertSettings'];
      for (const mId of metaDocs) {
        const mSnap = await getDoc(doc(db, 'system_meta', mId));
        if (mSnap.exists()) {
          result[mId] = mSnap.data();
        }
      }
    } catch {}

    return result;
  } catch (err: any) {
    console.warn('[Firestore] Falha ao carregar banco do Firestore:', err.message);
    return null;
  }
}

// Salva os dados de uma empresa diretamente no Firestore
export async function saveCompanyToFirestore(company: any): Promise<boolean> {
  const db = initFirestore();
  if (!db || !company || !company.id) return false;
  try {
    const docRef = doc(db, 'registeredCompanies', String(company.id));
    await setDoc(docRef, { ...company, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] Erro ao salvar empresa ${company.id} no Firestore:`, err.message);
    return false;
  }
}

// Define o estado da empresa ativa para o operador no Firestore
export async function setActiveCompanyInFirestore(userOrToken: string, companyId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db || !userOrToken || !companyId) return false;
  try {
    const cleanKey = String(userOrToken).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'active_company_states', cleanKey);
    await setDoc(docRef, {
      userOrToken,
      activeCompanyId: companyId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Erro ao gravar empresa ativa no Firestore:', err.message);
    return false;
  }
}

// Recupera o estado da empresa ativa do operador no Firestore
export async function getActiveCompanyFromFirestore(userOrToken: string): Promise<string | null> {
  const db = initFirestore();
  if (!db || !userOrToken) return null;
  try {
    const cleanKey = String(userOrToken).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'active_company_states', cleanKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return data?.activeCompanyId || null;
    }
  } catch (err: any) {
    console.warn('[Firestore] Erro ao buscar empresa ativa no Firestore:', err.message);
  }
  return null;
}

// Sincroniza em lote as coleções modificadas para o Google Cloud Firestore
export async function syncDatabaseCollectionsToFirestore(data: any): Promise<boolean> {
  const db = initFirestore();
  if (!db || !data || typeof data !== 'object') return false;

  try {
    // Sincronizar coleções conhecidas e quaisquer arrays adicionais presentes em data
    const allCollections = Array.from(new Set([...ALL_SYSTEM_COLLECTIONS, ...Object.keys(data).filter(k => Array.isArray(data[k]))]));

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

    // Sincronizar objetos estruturais em system_meta
    const metaKeys = ['companyInfo', 'sefazConfig', 'contractModules', 'alertSettings'];
    for (const mKey of metaKeys) {
      if (data[mKey] && typeof data[mKey] === 'object') {
        await setDoc(doc(db, 'system_meta', mKey), data[mKey], { merge: true });
      }
    }

    return true;
  } catch (err: any) {
    console.warn('[Firestore] Falha na sincronização em lote com Firestore:', err.message);
    return false;
  }
}
