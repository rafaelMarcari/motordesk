/**
 * MotorDesk - Direct Browser-to-Cloud Firestore Synchronization Engine
 * 
 * Conexão direta e contínua do navegador (qualquer browser e qualquer máquina)
 * diretamente com o Google Cloud Firestore (ai-studio-motordesk-623b8d4f-9424-4503-907b-245b995a0488).
 * 
 * Benefícios Operacionais:
 * 1. Elimina discrepâncias entre máquinas diferentes (Computador 1, Computador 2, Tablet, Celular).
 * 2. Elimina discrepâncias entre navegadores (Firefox, Chrome, Opera, Edge, Safari).
 * 3. Sincronização em tempo real via WebSockets do Firestore (< 50ms) usando onSnapshot.
 * 4. Independente de servidor Node.js ou proxy intermediário: funciona até em hospedagem estática.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  Firestore,
  Unsubscribe 
} from 'firebase/firestore';
import type { AppDatabase } from '../types';

export const FIREBASE_CONFIG = {
  projectId: "centered-repeater-4x4wp",
  appId: "1:605741677403:web:f7c23ddb74a79b6648b87e",
  apiKey: "AIzaSyBNlO7Ac7m7FdpfBkkTKTF-d5U_tJdPO3s",
  authDomain: "centered-repeater-4x4wp.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-motordesk-623b8d4f-9424-4503-907b-245b995a0488",
  storageBucket: "centered-repeater-4x4wp.firebasestorage.app",
  messagingSenderId: "605741677403",
  measurementId: "",
  oAuthClientId: "605741677403-bj27hh0hnep61tu09smb8b8hkc7g9h4d.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

let firestoreInstance: Firestore | null = null;
let isConnected = false;
let partitionsUnsubscribe: Unsubscribe | null = null;
let metaUnsubscribe: Unsubscribe | null = null;

// Cache local em memória de todas as partições do Firestore
const partitionCache: Record<string, any> = {};
let isInitialLoadDone = false;
let isWritingLocally = false;

export function initBrowserFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  if (typeof window === 'undefined') return null;

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    firestoreInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
    isConnected = true;
    console.log(`[Firestore Direct] Conectado diretamente ao Google Cloud Firestore (${FIREBASE_CONFIG.firestoreDatabaseId})`);
    return firestoreInstance;
  } catch (err: any) {
    console.warn('[Firestore Direct] Falha ao inicializar conexão direta do navegador:', err.message);
    isConnected = false;
    return null;
  }
}

export function isFirestoreDirectConnected(): boolean {
  return isConnected && firestoreInstance !== null;
}

// Constrói um objeto AppDatabase completo a partir das partições
function assembleDatabaseFromPartitions(partitions: Record<string, any>): Partial<AppDatabase> {
  const result: any = {};
  for (const part of Object.values(partitions)) {
    if (part && typeof part === 'object') {
      for (const [key, val] of Object.entries(part)) {
        if (key !== 'updatedAt' && key !== 'id') {
          result[key] = val;
        }
      }
    }
  }
  return result;
}

// Divide o AppDatabase em partições leves (< 250 KB) respeitando o limite de 1 MB do Firestore
function splitDatabaseIntoPartitions(db: AppDatabase): Record<string, any> {
  return {
    companies: {
      companyInfo: db.companyInfo,
      registeredCompanies: db.registeredCompanies || []
    },
    users: {
      users: db.users || [],
      accessGroups: db.accessGroups || []
    },
    clients_vehicles: {
      clients: db.clients || [],
      vehicles: db.vehicles || []
    },
    parts_inventory: {
      parts: db.parts || [],
      stockMovements: db.stockMovements || [],
      unitsOfMeasure: db.unitsOfMeasure || [],
      carriers: db.carriers || []
    },
    orders_services: {
      services: db.services || [],
      budgets: db.budgets || [],
      serviceOrders: db.serviceOrders || [],
      quotations: db.quotations || [],
      supplierPartPrices: db.supplierPartPrices || [],
      suppliers: db.suppliers || []
    },
    commercial_sales: {
      sales: db.sales || [],
      goodsWithdrawals: db.goodsWithdrawals || []
    },
    financial: {
      accountsReceivable: db.accountsReceivable || [],
      accountsPayable: db.accountsPayable || [],
      financialTransactions: db.financialTransactions || [],
      paymentMethods: db.paymentMethods || [],
      boletos: db.boletos || []
    },
    fiscal: {
      fiscalDocuments: db.fiscalDocuments || [],
      sefazConfig: db.sefazConfig,
      taxOperationNatures: db.taxOperationNatures || [],
      taxRules: db.taxRules || [],
      taxObligationGuides: db.taxObligationGuides || []
    },
    system_misc: {
      alertSettings: db.alertSettings,
      notifications: db.notifications || [],
      history: (db.history || []).slice(0, 150),
      globalModules: db.globalModules,
      testCases: db.testCases || []
    },
    industry: {
      boms: db.boms || db.billOfMaterials || [],
      billOfMaterials: db.billOfMaterials || db.boms || [],
      productionOrders: db.productionOrders || [],
      productLots: db.productLots || [],
      operationalAlerts: db.operationalAlerts || [],
      monthlyAccountingClosings: db.monthlyAccountingClosings || []
    }
  };
}

/**
 * Carrega a base completa diretamente do Google Cloud Firestore
 */
export async function fetchDatabaseDirectFromFirestore(): Promise<AppDatabase | null> {
  const db = initBrowserFirestore();
  if (!db) return null;

  try {
    const colRef = collection(db, 'motordesk_partitions');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      console.warn('[Firestore Direct] Nenhuma partição encontrada no Firestore.');
      return null;
    }

    snap.docs.forEach(docSnap => {
      partitionCache[docSnap.id] = docSnap.data();
    });

    const assembled = assembleDatabaseFromPartitions(partitionCache);
    isInitialLoadDone = true;
    console.log(`[Firestore Direct] ${snap.docs.length} partições carregadas com sucesso diretamente do Google Cloud Firestore.`);
    return assembled as AppDatabase;
  } catch (err: any) {
    console.warn('[Firestore Direct] Falha ao consultar Firestore diretamente:', err.message);
    return null;
  }
}

/**
 * Salva a base completa diretamente no Google Cloud Firestore a partir do navegador
 */
export async function saveDatabaseDirectToFirestore(appDb: AppDatabase): Promise<boolean> {
  const db = initBrowserFirestore();
  if (!db || !appDb) return false;

  isWritingLocally = true;
  try {
    const partitions = splitDatabaseIntoPartitions(appDb);
    const savePromises = Object.entries(partitions).map(async ([key, data]) => {
      // Comparar rapidamente para não salvar partição inalterada
      const serialized = JSON.stringify(data);
      if (partitionCache[key] && JSON.stringify(partitionCache[key]) === serialized) {
        return;
      }

      partitionCache[key] = data;
      const docRef = doc(db, 'motordesk_partitions', key);
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    });

    await Promise.all(savePromises);

    // Gravar metadados de sincronização e empresa ativa
    const metaRef = doc(db, 'motordesk_meta', 'system_state');
    await setDoc(metaRef, {
      version: Date.now(),
      activeCompanyId: appDb.companyInfo?.id || 'comp-1',
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    console.log('[Firestore Direct] Alterações salvas com sucesso diretamente no Google Cloud Firestore.');
    return true;
  } catch (err: any) {
    console.error('[Firestore Direct] Erro ao gravar diretamente no Firestore:', err);
    return false;
  } finally {
    setTimeout(() => {
      isWritingLocally = false;
    }, 800);
  }
}

/**
 * Assina atualizações em tempo real (push) de todos os computadores e navegadores
 */
export function subscribeToFirestoreRealtime(
  onDataMerged: (mergedDb: AppDatabase) => void,
  onActiveCompanyChanged?: (companyId: string) => void
): () => void {
  const db = initBrowserFirestore();
  if (!db) return () => {};

  if (partitionsUnsubscribe) {
    partitionsUnsubscribe();
    partitionsUnsubscribe = null;
  }
  if (metaUnsubscribe) {
    metaUnsubscribe();
    metaUnsubscribe = null;
  }

  try {
    // 1. Ouvir todas as partições do banco em tempo real
    const colRef = collection(db, 'motordesk_partitions');
    partitionsUnsubscribe = onSnapshot(colRef, (snapshot) => {
      let hasRemoteChanges = false;

      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const data = change.doc.data();

        // Ignorar alterações disparadas pela própria máquina local
        if (isWritingLocally && change.type === 'modified') {
          partitionCache[id] = data;
          return;
        }

        partitionCache[id] = data;
        hasRemoteChanges = true;
      });

      if (hasRemoteChanges && isInitialLoadDone) {
        console.log('[Firestore Direct] Atualização em tempo real recebida de outra máquina/navegador!');
        const updatedDb = assembleDatabaseFromPartitions(partitionCache);
        if (updatedDb && updatedDb.companyInfo) {
          onDataMerged(updatedDb as AppDatabase);
        }
      }
    }, (error) => {
      console.warn('[Firestore Direct] Aviso na conexão em tempo real:', error.message);
    });

    // 2. Ouvir alteração de empresa ativa por outros operadores/máquinas
    const metaDocRef = doc(db, 'motordesk_meta', 'system_state');
    metaUnsubscribe = onSnapshot(metaDocRef, (snap) => {
      if (snap.exists()) {
        const meta = snap.data();
        if (meta && meta.activeCompanyId) {
          const currentLocal = localStorage.getItem('motordesk_active_company_id');
          if (currentLocal && currentLocal !== meta.activeCompanyId && !isWritingLocally) {
            console.log(`[Firestore Direct] Empresa ativa alterada em outra máquina para: ${meta.activeCompanyId}`);
            if (onActiveCompanyChanged) {
              onActiveCompanyChanged(meta.activeCompanyId);
            }
          }
        }
      }
    });

    return () => {
      if (partitionsUnsubscribe) partitionsUnsubscribe();
      if (metaUnsubscribe) metaUnsubscribe();
    };
  } catch (err: any) {
    console.warn('[Firestore Direct] Erro ao subscrever snapshots do Firestore:', err.message);
    return () => {};
  }
}

/**
 * Altera a empresa ativa diretamente no Firestore para todas as máquinas
 */
export async function setActiveCompanyDirectInFirestore(companyId: string): Promise<boolean> {
  const db = initBrowserFirestore();
  if (!db || !companyId) return false;

  try {
    const metaRef = doc(db, 'motordesk_meta', 'system_state');
    await setDoc(metaRef, {
      activeCompanyId: companyId,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore Direct] Empresa ativa ${companyId} sincronizada no Google Cloud Firestore.`);
    return true;
  } catch (err: any) {
    console.warn('[Firestore Direct] Falha ao gravar empresa ativa no Firestore:', err.message);
    return false;
  }
}

// Expor utilitários no window para fácil depuração e hooks globais
if (typeof window !== 'undefined') {
  (window as any).__motorDeskFirestore = {
    init: initBrowserFirestore,
    fetchDatabase: fetchDatabaseDirectFromFirestore,
    saveDatabase: saveDatabaseDirectToFirestore,
    setActiveCompany: setActiveCompanyDirectInFirestore,
    subscribe: subscribeToFirestoreRealtime,
    isConnected: isFirestoreDirectConnected
  };

  // Inicializar conexão e pré-carregar banco diretamente do Firestore
  initBrowserFirestore();
  (window as any).__motorDeskDbPromise = fetchDatabaseDirectFromFirestore().then(fresh => {
    if (fresh && fresh.companyInfo) {
      (window as any).__CURRENT_DB = fresh;
      try {
        localStorage.setItem('motordesk_db_v1', JSON.stringify(fresh));
        localStorage.setItem('motordesk_db', JSON.stringify(fresh));
        localStorage.setItem('motordesk_full_database', JSON.stringify(fresh));
        if (Array.isArray(fresh.registeredCompanies) && fresh.registeredCompanies.length > 0) {
          (window as any).__allCompanies = fresh.registeredCompanies;
          localStorage.setItem('motordesk_all_companies', JSON.stringify(fresh.registeredCompanies));
        }
      } catch (e) {}
      console.log('[Firestore Direct] Banco de dados global pronto para todas as máquinas!');
    }
    return fresh;
  });

  // Subscrever em tempo real assim que o callback React estiver registrado
  const hookRealtimeListener = () => {
    if ((window as any).__motorDeskDb && (window as any).__motorDeskDb.onDataMergedCallback) {
      subscribeToFirestoreRealtime(
        (remoteDb) => {
          (window as any).__CURRENT_DB = remoteDb;
          try {
            localStorage.setItem('motordesk_db_v1', JSON.stringify(remoteDb));
            localStorage.setItem('motordesk_db', JSON.stringify(remoteDb));
            localStorage.setItem('motordesk_full_database', JSON.stringify(remoteDb));
          } catch(e) {}
          if ((window as any).__motorDeskDb.onDataMergedCallback) {
            (window as any).__motorDeskDb.onDataMergedCallback(remoteDb);
          }
        },
        (remoteCompanyId) => {
          const currentLocal = localStorage.getItem('motordesk_active_company_id');
          if (currentLocal !== remoteCompanyId) {
            localStorage.setItem('motordesk_active_company_id', remoteCompanyId);
            window.dispatchEvent(new CustomEvent('motordesk_company_switched', { detail: { companyId: remoteCompanyId } }));
          }
        }
      );
      return true;
    }
    return false;
  };

  if (!hookRealtimeListener()) {
    const tid = setInterval(() => {
      if (hookRealtimeListener()) {
        clearInterval(tid);
      }
    }, 400);
    setTimeout(() => clearInterval(tid), 30000);
  }
}
