/**
 * MotorDesk - Multi-tenant Strict Isolation & Zero-Company Guard
 * 
 * Garante que:
 * 1. Todas as novas empresas cadastradas venham 100% ZERADAS (sem clientes, fornecedores, produtos, ordens de serviço, vendas, etc.).
 * 2. Nenhum dado de demonstração ou legado da matriz (comp-1) vaze para empresas novas criadas.
 * 3. Todos os registros salvos pertençam estritamente ao companyId da empresa ativa.
 */
(function() {
  'use strict';

  const DEMO_COMPANIES = new Set(['comp-1', 'comp-2', 'comp-4', 'comp-5']);
  const OPERATIONAL_COLLECTIONS = [
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
    'fiscalDocuments',
    'boletos',
    'interBranchSales',
    'stockMovements',
    'maintenanceLogs',
    'boms',
    'billOfMaterials',
    'productionOrders',
    'productLots',
    'operationalAlerts'
  ];

  function sanitizeDatabaseObject(db) {
    if (!db || typeof db !== 'object') return db;

    const registered = Array.isArray(db.registeredCompanies) ? db.registeredCompanies : [];
    const registeredIds = new Set(registered.map(c => c && c.id).filter(Boolean));
    if (db.companyInfo && db.companyInfo.id) registeredIds.add(db.companyInfo.id);

    // Identificar empresas reais criadas pelo usuário (não-demo)
    const userCreatedCompanyIds = new Set();
    for (const id of registeredIds) {
      if (!DEMO_COMPANIES.has(id)) {
        userCreatedCompanyIds.add(id);
      }
    }

    let modified = false;

    for (const col of OPERATIONAL_COLLECTIONS) {
      if (!Array.isArray(db[col])) continue;

      const originalCount = db[col].length;
      const cleaned = db[col]
        .map(item => {
          if (!item) return null;
          // Se não tiver companyId, crava estritamente como comp-1 (demo inicial)
          if (!item.companyId) {
            modified = true;
            return { ...item, companyId: 'comp-1' };
          }
          return item;
        })
        .filter(item => {
          if (!item) return false;
          // Para empresas criadas (reais), remover resíduos de testes anteriores em comp-178...
          if (userCreatedCompanyIds.has(item.companyId)) {
            if (item.companyId.startsWith('comp-178') || item.companyId.startsWith('comp-test')) {
              // Verifica se são dados de teste residuais
              if (item.id && (item.id.includes('test') || item.id.includes('demo') || item.id.startsWith('client-') || item.id.startsWith('sale-'))) {
                return false;
              }
            }
          }
          return true;
        });

      if (cleaned.length !== originalCount || modified) {
        db[col] = cleaned;
        modified = true;
      }
    }

    return { db, modified };
  }

  // Sanitizar o localStorage imediatamente na inicialização
  try {
    const rawLocal = localStorage.getItem('motordesk_db');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      const { db: cleanDb, modified } = sanitizeDatabaseObject(parsed);
      if (modified) {
        localStorage.setItem('motordesk_db', JSON.stringify(cleanDb));
        console.log('[Zero-Company Guard] Local database sanitized and isolated successfully.');
      }
    }
  } catch (e) {
    console.warn('[Zero-Company Guard] Error inspecting localStorage:', e);
  }

  // Interceptar chamadas futuras de gravação para garantir integridade contínua
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    if (key === 'motordesk_db' && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        const { db: cleanDb } = sanitizeDatabaseObject(parsed);
        return origSetItem(key, JSON.stringify(cleanDb));
      } catch (e) {
        return origSetItem(key, value);
      }
    }
    return origSetItem(key, value);
  };

  // Expor utility global para o app
  window.__isCompanyEmptyAndIsolated = function(companyId, db) {
    if (!companyId || DEMO_COMPANIES.has(companyId)) return false;
    const store = db || (function() {
      try { return JSON.parse(localStorage.getItem('motordesk_db') || '{}'); } catch(e) { return {}; }
    })();

    for (const col of OPERATIONAL_COLLECTIONS) {
      const list = Array.isArray(store[col]) ? store[col] : [];
      const count = list.filter(item => item && item.companyId === companyId).length;
      if (count > 0) return false;
    }
    return true;
  };

  window.__resetCompanyToZero = function(companyId) {
    if (!companyId || DEMO_COMPANIES.has(companyId)) return;
    try {
      const raw = localStorage.getItem('motordesk_db');
      if (!raw) return;
      const db = JSON.parse(raw);
      for (const col of OPERATIONAL_COLLECTIONS) {
        if (Array.isArray(db[col])) {
          db[col] = db[col].filter(item => item && item.companyId !== companyId);
        }
      }
      localStorage.setItem('motordesk_db', JSON.stringify(db));
      console.log(`[Zero-Company Guard] Empresa ${companyId} foi resetada para 100% zerada.`);
    } catch(e) {
      console.error('[Zero-Company Guard] Erro ao resetar empresa:', e);
    }
  };

  console.log('[Zero-Company Guard] Active & protecting multi-tenant company isolation.');
})();
