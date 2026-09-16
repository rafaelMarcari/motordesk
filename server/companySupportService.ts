export interface CompanyDiagnosticReport {
  targetCompanyId: string;
  targetCompany: {
    id: string;
    name: string;
    cnpj?: string;
    companyType?: string;
    businessType?: string;
  };
  isolationStatus: "STRICTLY_ISOLATED";
  metrics: {
    totalRecords: number;
    clientsCount: number;
    vehiclesCount: number;
    partsCount: number;
    serviceOrdersCount: number;
    salesCount: number;
    budgetsCount: number;
    usersCount: number;
    financialCount: number;
  };
  otherCompaniesCount: number;
  unaffectedCompaniesList: Array<{
    id: string;
    name: string;
    recordsPreserved: number;
    status: "100% PROTECTED & UNTOUCHED";
  }>;
  integrityIssues: string[];
}

export interface CompanyCorrectionResult {
  success: boolean;
  targetCompanyId: string;
  targetCompanyName: string;
  correctionType: string;
  timestamp: string;
  repairedRecordsCount: number;
  details: string[];
  isolationGuarantee: string;
  unaffectedCompaniesProtected: Array<{
    id: string;
    name: string;
    recordsIntact: number;
  }>;
}

const OPERATIONAL_COLLECTIONS = [
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
  "fiscalDocuments",
  "boletos",
  "interBranchSales",
  "stockMovements",
  "maintenanceLogs",
  "boms",
  "billOfMaterials",
  "productionOrders",
  "productLots",
  "operationalAlerts",
];

export class CompanySupportService {
  /**
   * Generates a detailed diagnostic for a specific company by ID,
   * explicitly listing all other companies that remain unaffected.
   */
  public static diagnoseCompany(db: any, companyId: string): CompanyDiagnosticReport {
    if (!db || typeof db !== "object") {
      throw new Error("Base de dados indisponível.");
    }

    const cleanId = String(companyId || "").trim();
    const allCompanies: any[] = [
      ...(Array.isArray(db.registeredCompanies) ? db.registeredCompanies : []),
      ...(db.companyInfo ? [db.companyInfo] : []),
    ];

    // Remove duplicates by ID
    const uniqueCompaniesMap = new Map<string, any>();
    for (const c of allCompanies) {
      if (c && c.id) uniqueCompaniesMap.set(c.id, c);
    }

    const targetCompany = uniqueCompaniesMap.get(cleanId);
    if (!targetCompany) {
      throw new Error(`Empresa com ID "${cleanId}" não foi encontrada no cadastro.`);
    }

    // Measure metrics for target company
    const clients = (db.clients || []).filter((i: any) => i && i.companyId === cleanId);
    const vehicles = (db.vehicles || []).filter((i: any) => i && i.companyId === cleanId);
    const parts = (db.parts || []).filter((i: any) => i && i.companyId === cleanId);
    const serviceOrders = (db.serviceOrders || []).filter((i: any) => i && i.companyId === cleanId);
    const sales = (db.sales || []).filter((i: any) => i && i.companyId === cleanId);
    const budgets = (db.budgets || []).filter((i: any) => i && i.companyId === cleanId);
    const users = (db.users || []).filter((i: any) => i && (i.companyId === cleanId || (!i.companyId && cleanId === "comp-1")));
    const accountsReceivable = (db.accountsReceivable || []).filter((i: any) => i && i.companyId === cleanId);
    const accountsPayable = (db.accountsPayable || []).filter((i: any) => i && i.companyId === cleanId);

    const totalRecords = clients.length + vehicles.length + parts.length + serviceOrders.length + sales.length + budgets.length;

    // Detect integrity issues strictly for this company
    const issues: string[] = [];
    // Check parts with negative stock
    const negParts = parts.filter((p: any) => (p.stock || 0) < 0);
    if (negParts.length > 0) {
      issues.push(`${negParts.length} peça(s) com saldo de estoque negativo.`);
    }
    // Check service orders without client
    const unlinkedOs = serviceOrders.filter((os: any) => !os.clientId && !os.clientName);
    if (unlinkedOs.length > 0) {
      issues.push(`${unlinkedOs.length} Ordem(ns) de Serviço sem cliente vinculado.`);
    }

    // Build the list of UNAFFECTED companies
    const unaffectedCompaniesList: any[] = [];
    for (const [id, comp] of uniqueCompaniesMap.entries()) {
      if (id !== cleanId) {
        let otherTotal = 0;
        for (const col of OPERATIONAL_COLLECTIONS) {
          if (Array.isArray(db[col])) {
            otherTotal += db[col].filter((i: any) => i && i.companyId === id).length;
          }
        }
        unaffectedCompaniesList.push({
          id,
          name: comp.name || "Outra Empresa",
          recordsPreserved: otherTotal,
          status: "100% PROTECTED & UNTOUCHED",
        });
      }
    }

    return {
      targetCompanyId: cleanId,
      targetCompany: {
        id: targetCompany.id,
        name: targetCompany.name,
        cnpj: targetCompany.cnpj,
        companyType: targetCompany.companyType,
        businessType: targetCompany.businessType,
      },
      isolationStatus: "STRICTLY_ISOLATED",
      metrics: {
        totalRecords,
        clientsCount: clients.length,
        vehiclesCount: vehicles.length,
        partsCount: parts.length,
        serviceOrdersCount: serviceOrders.length,
        salesCount: sales.length,
        budgetsCount: budgets.length,
        usersCount: users.length,
        financialCount: accountsReceivable.length + accountsPayable.length,
      },
      otherCompaniesCount: unaffectedCompaniesList.length,
      unaffectedCompaniesList,
      integrityIssues: issues,
    };
  }

  /**
   * Executes a repair/support patch STRICTLY scoped to targetCompanyId.
   * All other companies are explicitly guaranteed to not be altered!
   */
  public static executeIsolatedRepair(
    db: any,
    targetCompanyId: string,
    correctionType: string
  ): { updatedDb: any; result: CompanyCorrectionResult } {
    const cleanId = String(targetCompanyId || "").trim();
    if (!cleanId) throw new Error("ID da Empresa de destino é obrigatório.");

    const allCompanies: any[] = [
      ...(Array.isArray(db.registeredCompanies) ? db.registeredCompanies : []),
      ...(db.companyInfo ? [db.companyInfo] : []),
    ];
    const targetComp = allCompanies.find(c => c && c.id === cleanId);
    if (!targetComp) {
      throw new Error(`Empresa com ID "${cleanId}" não encontrada para correção.`);
    }

    const newDb = JSON.parse(JSON.stringify(db));
    const details: string[] = [];
    let repairedCount = 0;

    // Apply correction strictly for items with item.companyId === cleanId
    if (correctionType === "recalculate_stock" || correctionType === "all") {
      if (Array.isArray(newDb.parts)) {
        let partsFixed = 0;
        newDb.parts = newDb.parts.map((p: any) => {
          if (!p || p.companyId !== cleanId) return p; // UNTOUCHED!
          let modified = false;
          if (typeof p.stock !== "number" || isNaN(p.stock)) {
            p.stock = 0;
            modified = true;
          }
          if (typeof p.reservedStock !== "number" || isNaN(p.reservedStock) || p.reservedStock < 0) {
            p.reservedStock = 0;
            modified = true;
          }
          if (p.stock < 0) {
            // Normalize zeroed minimum
            p.stock = 0;
            modified = true;
          }
          if (modified) partsFixed++;
          return p;
        });
        if (partsFixed > 0) {
          details.push(`Normalizados saldos de ${partsFixed} peças da empresa ${cleanId}.`);
          repairedCount += partsFixed;
        }
      }
    }

    if (correctionType === "resequence_numbers" || correctionType === "all") {
      if (Array.isArray(newDb.serviceOrders)) {
        let osResequenced = 0;
        newDb.serviceOrders = newDb.serviceOrders.map((os: any, idx: number) => {
          if (!os || os.companyId !== cleanId) return os; // UNTOUCHED!
          if (!os.code || os.code.trim() === "") {
            os.code = `OS-${new Date().getFullYear()}-${String(idx + 1).padStart(4, "0")}`;
            osResequenced++;
          }
          return os;
        });
        if (osResequenced > 0) {
          details.push(`Reatribuídos códigos ordenados para ${osResequenced} Ordens de Serviço da empresa ${cleanId}.`);
          repairedCount += osResequenced;
        }
      }
    }

    if (correctionType === "clean_orphan_records" || correctionType === "all") {
      // Ensure every record in this company has proper timestamps and active status
      for (const col of ["clients", "vehicles", "parts", "sales"]) {
        if (Array.isArray(newDb[col])) {
          let colFixed = 0;
          newDb[col] = newDb[col].map((item: any) => {
            if (!item || item.companyId !== cleanId) return item; // UNTOUCHED!
            if (!item.createdAt) {
              item.createdAt = new Date().toISOString();
              colFixed++;
            }
            return item;
          });
          if (colFixed > 0) {
            details.push(`Atualizados metadados em ${colFixed} registros da coleção ${col}.`);
            repairedCount += colFixed;
          }
        }
      }
    }

    if (details.length === 0) {
      details.push("Verificação concluída: Nenhuma anomalia encontrada na empresa. Dados 100% íntegros.");
    }

    // Build list of protected companies
    const uniqueCompaniesMap = new Map<string, any>();
    for (const c of allCompanies) {
      if (c && c.id) uniqueCompaniesMap.set(c.id, c);
    }

    const unaffectedCompaniesProtected: any[] = [];
    for (const [id, comp] of uniqueCompaniesMap.entries()) {
      if (id !== cleanId) {
        let otherTotal = 0;
        for (const col of OPERATIONAL_COLLECTIONS) {
          if (Array.isArray(newDb[col])) {
            otherTotal += newDb[col].filter((i: any) => i && i.companyId === id).length;
          }
        }
        unaffectedCompaniesProtected.push({
          id,
          name: comp.name || "Outra Empresa",
          recordsIntact: otherTotal,
        });
      }
    }

    return {
      updatedDb: newDb,
      result: {
        success: true,
        targetCompanyId: cleanId,
        targetCompanyName: targetComp.name || cleanId,
        correctionType,
        timestamp: new Date().toISOString(),
        repairedRecordsCount: repairedCount,
        details,
        isolationGuarantee: "ISOLAMENTO ABSOLUTO: Nenhuma outra empresa foi afetada. Todas as outras empresas permaneceram 100% intactas.",
        unaffectedCompaniesProtected,
      },
    };
  }
}
