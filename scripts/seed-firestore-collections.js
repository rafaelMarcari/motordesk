import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

async function seedGranularFirestore() {
  console.log('🚀 Iniciando migração para coleções granulares no Google Cloud Firestore...');
  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(cfg);
  const db = getFirestore(app, cfg.firestoreDatabaseId);

  const localData = JSON.parse(fs.readFileSync('data/app_store.json', 'utf8'));

  const collections = [
    'registeredCompanies',
    'users',
    'clients',
    'vehicles',
    'parts',
    'services',
    'budgets',
    'serviceOrders',
    'suppliers',
    'quotations',
    'accountsReceivable',
    'accountsPayable',
    'financialTransactions',
    'fiscalDocuments',
    'boletos',
    'boms',
    'productLots',
    'operationalAlerts',
    'unitsOfMeasure'
  ];

  for (const colName of collections) {
    const items = localData[colName];
    if (!Array.isArray(items) || items.length === 0) continue;

    console.log(`📦 Migrando ${items.length} documentos para a coleção '${colName}'...`);
    
    // Firestore batch supports up to 500 operations
    let batch = writeBatch(db);
    let count = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const docId = String(item.id || item.code || `doc-${i}`);
      const docRef = doc(db, colName, docId);
      batch.set(docRef, item);
      count++;

      if (count === 400 || i === items.length - 1) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    console.log(`✅ Coleção '${colName}' sincronizada no Google Cloud!`);
  }

  // Gravar metadados do sistema
  if (localData.companyInfo) {
    await setDoc(doc(db, 'system_meta', 'companyInfo'), localData.companyInfo);
  }
  if (localData.sefazConfig) {
    await setDoc(doc(db, 'system_meta', 'sefazConfig'), localData.sefazConfig);
  }

  console.log('🎉 Todas as coleções foram salvas com sucesso no banco de dados do Google Cloud!');
  process.exit(0);
}

seedGranularFirestore().catch(err => {
  console.error('❌ Erro na migração para o Firestore:', err);
  process.exit(1);
});
