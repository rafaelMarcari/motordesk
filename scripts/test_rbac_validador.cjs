const fs = require("fs");

const bundle = fs.readFileSync("public/assets/index-CUxTo0fH.js", "utf8");

function getFunction(name) {
  const marker = "function " + name + "(";
  const start = bundle.indexOf(marker);
  if (start === -1) throw new Error("Function not found: " + name);
  let depth = 0;
  let started = false;
  for (let i = start; i < bundle.length; i++) {
    if (bundle[i] === "{") {
      depth++;
      started = true;
    } else if (bundle[i] === "}") {
      depth--;
      if (started && depth === 0) {
        return bundle.substring(start, i + 1);
      }
    }
  }
  return "";
}

const idCode = getFunction("Id");
const giCode = getFunction("gI");
const rvCode = getFunction("rv");
const svCode = getFunction("sv");
const faCode = getFunction("FA");
const hcCode = getFunction("Hc");
const wdCode = getFunction("Wd");
const kaCode = getFunction("KA");
const biCode = getFunction("bI");

const pFA = bundle.indexOf("function FA(");
const pXD = bundle.lastIndexOf("const xD=", pFA);
const pXDEnd = bundle.indexOf("function FA(", pXD);
const xdCode = bundle.substring(pXD, pXDEnd);

// New canonical zre
const canonicalZre = {
  dashboard: "accessDashboard",
  sales: "accessSales",
  services: "accessServices",
  budgets: "accessBudgets",
  serviceOrders: "accessServiceOrders",
  clients: "accessClients",
  vehicles: "accessVehicles",
  parts: "accessParts",
  quotations: "accessQuotations",
  financial: "accessFinancial",
  fiscal: "accessFiscal",
  history: "accessHistory",
  reports: "accessReports",
  users: "accessUserManagement",
  withdrawals: "accessWithdrawals",
  carriers: "accessCarriers",
  qa_panel: "accessQAPanel",
  data_migration: "accessQAPanel",
  access_groups: "accessUserManagement",
  notifications_engine: "accessNotificationsEngine",
  representative_commerce: "accessRepresentativeCommerce",
  representative_orders: "accessRepresentativeOrders",
  representative_reconciliation: "accessRepresentativeCommerce",
  fiscal_conference: "accessFiscal",
  tax_obligations: "accessFiscal",
  accounts_receivable: "accessAccountsReceivable",
  accounts_payable: "accessAccountsPayable",
  units_of_measure: "accessUnitsOfMeasure",

  industry: "accessProduction",
  ind_com_marketing: "accessCommercialMarketing",
  dash_comercial: "accessCommercialMarketing",
  ind_com_clientes: "accessCommercial",
  ind_com_clientes_tab: "accessCommercial",
  ind_com_orcamentos: "accessCommercialBudgets",
  ind_com_orcamentos_tab: "accessCommercialBudgets",
  ind_com_pedidos: "accessCommercialOrders",
  ind_com_pedidos_tab: "accessCommercialOrders",
  ind_com_carteira: "accessCommercialBacklog",
  ind_com_carteira_tab: "accessCommercialBacklog",
  ind_com_posvenda: "accessCommercialAfterSales",
  after_sales: "accessCommercialAfterSales",

  ind_eng_dashboard: "accessEngineering",
  dash_engenharia: "accessEngineering",
  ind_eng_projetos: "accessEngineering",
  special_projects: "accessEngineering",
  ind_eng_produtos: "accessEngineering",
  product_development: "accessEngineering",
  ind_eng_unidades: "accessUnitsOfMeasure",
  ind_eng_unidades_tab: "accessUnitsOfMeasure",
  ind_eng_boms: "accessBillOfMaterials",
  boms: "accessBillOfMaterials",
  ind_eng_fichatecnica: "accessEngineering",
  technical_datasheet: "accessEngineering",
  ind_eng_solidworks: "accessEngineering",
  cad_solidworks_integrations: "accessEngineering",
  ind_eng_revisoes: "accessEngineering",
  engineering_revisions: "accessEngineering",

  ind_pcp_planejamento: "accessIndustrialDashboard",
  pcp_dashboard: "accessIndustrialDashboard",
  ind_pcp_mrp: "accessProduction",
  ind_pcp_solicitacoes: "accessPurchasing",
  ind_pcp_cotacoes: "accessQuotations",
  ind_pcp_compras: "accessPurchasing",
  purchasing_suggestions: "accessPurchasing",
  ind_pcp_semaforo: "accessProduction",
  stock_traffic: "accessProduction",
  ind_pcp_recebimento: "accessProduction",
  dash_pcp_compras: "accessPurchasing",

  ind_rh_dashboard: "accessProduction",
  dash_rh_operadores: "accessProduction",
  ind_rh_operadores: "accessProduction",
  hr_operators: "accessProduction",
  ind_rh_apontamentos: "accessProduction",
  ind_rh_paradas: "accessProduction",
  ind_rh_produtividade: "accessProduction",

  ind_cad_dashboard: "accessProduction",
  dash_cadastros: "accessProduction",
  ind_cad_pecas: "accessParts",
  item_master: "accessParts",
  ind_cad_wms: "accessIndustrialStock",
  warehouse_locations: "accessIndustrialStock",
  ind_cad_etiquetas: "accessProduction",
  label_generator: "accessProduction",
  ind_cad_familias: "accessParts",
  categories: "accessParts",
  ind_cad_fornecedores: "accessPurchasing",
  suppliers: "accessPurchasing",

  ind_prod_pcp_dash: "accessIndustrialDashboard",
  ind_prod_ops: "accessProductionOrders",
  production_orders: "accessProductionOrders",
  ind_prod_lotes: "accessLots",
  lots: "accessLots",
  ind_prod_rastreio: "accessProduction",
  trace_product: "accessProduction",
  ind_rastrear_processo: "accessProduction",
  ind_prod_custos: "accessIndustrialCosts",
  production_floor: "accessProduction",

  ind_cq_dashboard: "accessProduction",
  dash_qualidade: "accessProduction",
  ind_cq_inspecoes: "accessProduction",
  quality_inspections: "accessProduction",
  ind_cq_rnc: "accessProduction",
  non_conformities: "accessProduction",

  ind_pcm_dashboard: "accessMaintenance",
  dash_manutencao: "accessMaintenance",
  ind_pcm_manutencao: "accessMaintenance",
  equipment_maintenance: "accessMaintenance",

  ind_almox_dash: "accessIndustrialStock",
  dash_almoxarifado: "accessIndustrialStock",
  ind_almox_locs: "accessIndustrialStock",
  ind_almox_mov: "accessIndustrialStock",

  ind_exp_dash: "accessProduction",
  dash_expedicao: "accessProduction",
  ind_exp_instalacao: "accessProduction",
  client_installation: "accessProduction",
  ind_exp_retiradas: "accessWithdrawals",

  ind_rel_oee: "accessIndustrialReports",
  industrial_reports: "accessIndustrialReports",
  ind_rel_custos: "accessIndustrialCosts",
  cost_analysis: "accessIndustrialCosts"
};

// Proposed IA
function proposedIA(e, a, s, r) {
  if (!e || !a || a.active === !1 || a.isActive === !1 || a.isTerminated === !0 || a.status === "terminated") return !1;
  const _isM = (a.username && (a.username.toLowerCase() === "admin" || a.username.toLowerCase() === "validador")) || (Array.isArray(a.allowedCompanyIds) && a.allowedCompanyIds.includes("*"));
  if (!_isM) {
    const _uC = a.companyId || "comp-1";
    if (_uC !== e.id && !(Array.isArray(a.allowedCompanyIds) && a.allowedCompanyIds.includes(e.id))) return !1;
  }
  if (s === "profile") return !0;
  if (!gI(e)) return s === "users" && (a.role === "admin" || _isM);
  const n = Id(e.businessType);
  if (!FA(s, n)) return !1;
  const i = canonicalZre[s];
  if (!i) return !0;
  if (!Wd(i, e, n)) return !1;
  const o = bI(a, e, r || void 0);
  if (!o) return !1;
  // If user explicitly has this permission set to false in individual permissions, ACATAR:
  if (a.permissions && typeof a.permissions === "object") {
    if (a.permissions[i] === false) return false;
    if (a.permissions[s] === false) return false;
  }
  if (o[i] === false) return false;
  if (o[i] === true) return true;
  // Fallback check for parent modules if specific sub-perm isn't explicitly set in o:
  if (i.startsWith("accessCommercial") && o.accessCommercial === true && a.permissions?.[i] !== false) return true;
  if (i.startsWith("accessEngineering") && o.accessEngineering === true && a.permissions?.[i] !== false) return true;
  if ((i === "accessProductionOrders" || i === "accessLots" || i === "accessIndustrialCosts" || i === "accessIndustrialReports" || i === "accessIndustrialStock" || i === "accessBillOfMaterials") && o.accessProduction === true && a.permissions?.[i] !== false) return true;
  return !!o[i];
}

function proposedF4(e, a, s) {
  const r = [
    "dashboard",
    "industry",
    "ind_prod_ops",
    "ind_eng_boms",
    "ind_cad_pecas",
    "ind_pcp_planejamento",
    "sales",
    "serviceOrders",
    "budgets",
    "clients",
    "parts",
    "services",
    "representative_commerce",
    "financial",
    "history",
    "reports",
    "users",
    "profile"
  ];
  for (const n of r) if (proposedIA(e, a, n, s)) return n;
  return "profile";
}

const script = `
const Cv = [];
${idCode}
${giCode}
${rvCode}
${svCode}
${xdCode}
${faCode}
${hcCode}
${wdCode}
${kaCode}
${biCode}

const canonicalZre = ${JSON.stringify(canonicalZre, null, 2)};
const proposedIA = ${proposedIA.toString()};
const proposedF4 = ${proposedF4.toString()};

const validadorUser = {
  id: "usr-1789436070516",
  name: "Rafael Marcari (QA MotorDesk)",
  role: "qa",
  active: true,
  status: "active",
  groupId: "grp-admin",
  isActive: true,
  username: "validador",
  companyId: "comp-1788356473331",
  allowedCompanyIds: ["*"],
  permissions: {
    bomEdit: true,
    bomCreate: true,
    accessLots: true,
    accessParts: true,
    accessSales: false,
    accessFiscal: true,
    accessBudgets: false,
    accessClients: false,
    accessHistory: true,
    accessQAPanel: true,
    accessReports: true,
    accessCarriers: false,
    accessServices: false,
    accessVehicles: false,
    accessDashboard: false,
    accessEquipment: false,
    accessFinancial: false,
    accessProduction: true,
    accessPurchasing: false,
    accessQuotations: false,
    accessMaintenance: false,
    accessWithdrawals: false,
    accessServiceOrders: false,
    productionOrderEdit: true,
    accessUnitsOfMeasure: false,
    accessUserManagement: true,
    accessBillOfMaterials: true,
    accessIndustrialCosts: true,
    accessIndustrialStock: true,
    productionOrderCancel: true,
    productionOrderCreate: true,
    accessCommercialOrders: false,
    productionOrderApprove: true,
    accessCommercialBacklog: false,
    accessCommercialBudgets: false,
    accessIndustrialReports: true,
    accessProductionReports: true,
    productionOrderComplete: true,
    accessCommercialMarketing: false,
    accessIndustrialDashboard: true,
    accessCommercialAfterSales: false,
    accessRepresentativeOrders: false,
    accessRepresentativeCommerce: false
  }
};

const compIndustria = {
  id: "comp-1788356473331",
  name: "INDUSTRIA FABRICAÇÃO LTDA",
  businessType: "INDUSTRIA",
  globalModules: {
    accessParts: true,
    accessFiscal: true,
    accessBoletos: true,
    accessBudgets: true,
    accessClients: true,
    accessHistory: true,
    accessQAPanel: true,
    accessReports: true,
    accessServices: true,
    accessVehicles: true,
    accessDashboard: true,
    accessFinancial: false,
    accessProduction: true,
    accessQuotations: true,
    accessServiceOrders: true,
    accessUnitsOfMeasure: true,
    accessUserManagement: true,
    accessAccountsPayable: true,
    accessAccountsReceivable: true
  }
};

console.log("TEST RESULTS FOR VALIDADOR ON INDUSTRIA:");
const routesToTest = [
  "dashboard",
  "sales",
  "clients",
  "ind_com_marketing",
  "ind_pcm_manutencao",
  "ind_prod_ops",
  "ind_eng_boms",
  "ind_cad_pecas",
  "parts",
  "history",
  "reports",
  "users",
  "industry"
];

for (const r of routesToTest) {
  const allowed = proposedIA(compIndustria, validadorUser, r, { users: [validadorUser], companyInfo: compIndustria });
  console.log("  " + r + ": " + allowed);
}

const fallback = proposedF4(compIndustria, validadorUser, { users: [validadorUser], companyInfo: compIndustria });
console.log("\\nFallback route (f4): " + fallback);
`;

fs.writeFileSync("scripts/run_validador_eval.cjs", script);
console.log("Wrote scripts/run_validador_eval.cjs");
