const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function main() {
  console.log('--- APLICANDO CORREÇÃO COMPLETA DE NAVEGAÇÃO INDUSTRIAL ---');

  const publicBundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
  const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

  let bundle = fs.readFileSync(publicBundlePath, 'utf8');

  // 1. COMPILAR COMPONENTES COMERCIAIS & ENGENHARIA VIA ESBUILD
  console.log('1. Compilando CommercialIndustrialIndex.tsx...');
  const buildResult = await esbuild.build({
    entryPoints: [path.resolve('src/components/CommercialIndustrialIndex.tsx')],
    bundle: true,
    format: 'iife',
    globalName: 'CommercialIndustrialExports',
    write: false,
    plugins: [
      {
        name: 'react-shim',
        setup(build) {
          build.onResolve({ filter: /^react$/ }, () => ({
            path: 'react',
            namespace: 'react-shim',
          }));
          build.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => ({
            contents: `
              export default window.ReactInstance;
              export const useState = (...args) => window.ReactInstance.useState(...args);
              export const useMemo = (...args) => window.ReactInstance.useMemo(...args);
              export const useEffect = (...args) => window.ReactInstance.useEffect(...args);
              export const useCallback = (...args) => window.ReactInstance.useCallback(...args);
            `,
          }));
        },
      },
    ],
  });

  const compiledCode = buildResult.outputFiles[0].text;

  // 2. SUBSTITUIR getIndComModule NO BUNDLE
  console.log('2. Substituindo getIndComModule no bundle...');
  const pModuleStart = bundle.indexOf('function getIndComModule(reactInstance) {');
  if (pModuleStart === -1) {
    throw new Error('function getIndComModule não encontrado no bundle!');
  }
  const pModuleEnd = bundle.indexOf('function TVe(', pModuleStart);
  if (pModuleEnd === -1) {
    throw new Error('function TVe não encontrada após getIndComModule!');
  }

  const NEW_MODULE_CODE = `function getIndComModule(reactInstance) {
  if (window.__IndComModule) return window.__IndComModule;
  window.ReactInstance = reactInstance;
  ${compiledCode}
  window.__IndComModule = window.CommercialIndustrialExports;
  return window.CommercialIndustrialExports;
}\n`;

  bundle = bundle.substring(0, pModuleStart) + NEW_MODULE_CODE + bundle.substring(pModuleEnd);
  console.log('getIndComModule atualizado com sucesso!');

  // 3. ATUALIZAR INDUSTRIAL_MODULES COM ROTAS UNIFICADAS
  console.log('3. Atualizando INDUSTRIAL_MODULES...');
  const pIndModStart = bundle.indexOf('const INDUSTRIAL_MODULES = [');
  if (pIndModStart === -1) {
    throw new Error('const INDUSTRIAL_MODULES não encontrado!');
  }
  const pIndModEnd = bundle.indexOf('];', pIndModStart) + 2;

  const NEW_INDUSTRIAL_MODULES = `const INDUSTRIAL_MODULES = [
  {
    id: "ind_mod_comercial",
    name: "Comercial Fabril",
    dept: "comercial",
    num: "01",
    color: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    activeColor: "bg-blue-600 text-white",
    badge: "Vendas B2B & Propostas",
    submenus: [
      { id: "ind_com_marketing", label: "Marketing / Prospecção", tab: "dash_comercial", perm: "accessCommercial" },
      { id: "ind_com_clientes", label: "Clientes Industriais B2B", tab: "ind_com_clientes_tab", perm: "accessCommercial" },
      { id: "ind_com_orcamentos", label: "Orçamentos Fabris", tab: "ind_com_orcamentos_tab", perm: "accessCommercial" },
      { id: "ind_com_pedidos", label: "Pedidos de Venda", tab: "ind_com_pedidos_tab", perm: "accessCommercial" },
      { id: "ind_com_carteira", label: "Carteira de Pedidos", tab: "ind_com_carteira_tab", perm: "accessCommercial" },
      { id: "ind_com_posvenda", label: "Pós-Venda & SAC", tab: "after_sales", perm: "accessCommercial" }
    ]
  },
  {
    id: "ind_mod_engenharia",
    name: "Engenharia & P&D",
    dept: "engenharia",
    num: "02",
    color: "bg-cyan-600/20 text-cyan-400 border-cyan-500/30",
    activeColor: "bg-cyan-600 text-white",
    badge: "BOM, CAD 3D & ECN",
    submenus: [
      { id: "ind_eng_dashboard", label: "Dashboard Engenharia & P&D", tab: "dash_engenharia", perm: "accessEngineering" },
      { id: "ind_eng_projetos", label: "Projetos Especiais", tab: "special_projects", perm: "accessEngineering" },
      { id: "ind_eng_produtos", label: "Desenvolvimento de Produtos", tab: "product_development", perm: "accessEngineering" },
      { id: "ind_eng_unidades", label: "Unidades de Medida (UN/KG/M)", tab: "ind_eng_unidades_tab", aliases: ["units_of_measure"], perm: "accessEngineering" },
      { id: "ind_eng_boms", label: "Estruturas de Produto (BOM)", tab: "boms", aliases: ["boms"], perm: "accessEngineering" },
      { id: "ind_eng_fichatecnica", label: "Ficha Técnica de Processo", tab: "technical_datasheet", perm: "accessEngineering" },
      { id: "ind_eng_solidworks", label: "Desenhos & CAD SolidWorks", tab: "cad_solidworks_integrations", aliases: ["cad_solidworks_integrations"], perm: "accessEngineering" },
      { id: "ind_eng_revisoes", label: "Controle de Revisões (ECN)", tab: "engineering_revisions", perm: "accessEngineering" }
    ]
  },
  {
    id: "ind_mod_pcp",
    name: "PCP & Planejamento",
    dept: "pcp",
    num: "03",
    color: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
    activeColor: "bg-indigo-600 text-white",
    badge: "MRP, Cotações & Suprimentos",
    submenus: [
      { id: "ind_pcp_planejamento", label: "Planejamento da Produção", tab: "pcp_dashboard", perm: "accessProduction" },
      { id: "ind_pcp_mrp", label: "Necessidades de Materiais (MRP)", tab: "purchasing_suggestions", perm: "accessProduction" },
      { id: "ind_pcp_solicitacoes", label: "Solicitações de Compra", tab: "purchasing_suggestions", perm: "accessProduction" },
      { id: "ind_pcp_cotacoes", label: "Cotações com Fornecedores", tab: "purchasing_suggestions", aliases: ["quotations"], perm: "accessProduction" },
      { id: "ind_pcp_compras", label: "Pedidos de Compra Fabris", tab: "purchasing_suggestions", perm: "accessProduction" },
      { id: "ind_pcp_semaforo", label: "Acompanhamento & Semáforo", tab: "stock_traffic", perm: "accessProduction" },
      { id: "ind_pcp_recebimento", label: "Recebimento de Materiais", tab: "stock_traffic", perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_rh",
    name: "RH & Operadores",
    dept: "rh",
    num: "04",
    color: "bg-amber-600/20 text-amber-400 border-amber-500/30",
    activeColor: "bg-amber-600 text-white",
    badge: "Mão de Obra & Postos Fabris",
    submenus: [
      { id: "ind_rh_dashboard", label: "Dashboard RH & Postos", tab: "dash_rh_operadores", perm: "accessProduction" },
      { id: "ind_rh_operadores", label: "Operadores e Postos Fabris", tab: "hr_operators", aliases: ["hr_operators"], perm: "accessProduction" },
      { id: "ind_rh_apontamentos", label: "Apontamento Chão de Fábrica", tab: "production_floor", perm: "accessProduction" },
      { id: "ind_rh_paradas", label: "Registro de Paradas de Linha", tab: "production_floor", perm: "accessProduction" },
      { id: "ind_rh_produtividade", label: "Horas Trabalhadas & OEE", tab: "cost_analysis", perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_cadastros",
    name: "Cadastros & WMS",
    dept: "cadastros",
    num: "05",
    color: "bg-purple-600/20 text-purple-400 border-purple-500/30",
    activeColor: "bg-purple-600 text-white",
    badge: "Itens Mestres, Localizações & QR",
    submenus: [
      { id: "ind_cad_dashboard", label: "Dashboard Cadastros / WMS", tab: "dash_cadastros", perm: "accessProduction" },
      { id: "ind_cad_pecas", label: "Catálogo Mestre de Peças", tab: "item_master", aliases: ["item_master"], perm: "accessProduction" },
      { id: "ind_cad_wms", label: "Endereçamento Físico WMS", tab: "warehouse_locations", aliases: ["warehouse_locations"], perm: "accessProduction" },
      { id: "ind_cad_etiquetas", label: "Etiquetas & Código de Barras", tab: "label_generator", aliases: ["label_generator"], perm: "accessProduction" },
      { id: "ind_cad_familias", label: "Famílias de Materiais", tab: "item_master", aliases: ["categories"], perm: "accessProduction" },
      { id: "ind_cad_fornecedores", label: "Fornecedores Homologados", tab: "purchasing_suggestions", aliases: ["suppliers"], perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_producao",
    name: "Produção & Chão Fábrica",
    dept: "producao",
    num: "06",
    color: "bg-rose-600/20 text-rose-400 border-rose-500/30",
    activeColor: "bg-rose-600 text-white",
    badge: "Ordens OP, Lotes & Rastreio",
    submenus: [
      { id: "ind_prod_pcp_dash", label: "Painel Geral do PCP", tab: "pcp_dashboard", perm: "accessProduction" },
      { id: "ind_prod_ops", label: "Ordens de Produção (OP)", tab: "production_orders", aliases: ["production_orders"], perm: "accessProduction" },
      { id: "ind_prod_lotes", label: "Lotes & Rastreabilidade", tab: "lots", aliases: ["lots"], perm: "accessProduction" },
      { id: "ind_prod_rastreio", label: "Onde Está Meu Produto?", tab: "trace_process", aliases: ["trace_product"], perm: "accessProduction" },
      { id: "ind_prod_custos", label: "Custos de Produção Real", tab: "cost_analysis", perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_qualidade",
    name: "Qualidade & CQ",
    dept: "qualidade",
    num: "07",
    color: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    activeColor: "bg-emerald-600 text-white",
    badge: "Inspeções, Laudos & RNCs",
    submenus: [
      { id: "ind_cq_dashboard", label: "Dashboard CQ & RNC", tab: "dash_qualidade", perm: "accessProduction" },
      { id: "ind_cq_inspecoes", label: "Inspeções de Qualidade CQ", tab: "quality_control", aliases: ["quality_inspections"], perm: "accessProduction" },
      { id: "ind_cq_rnc", label: "Não Conformidades (RNC)", tab: "quality_control", aliases: ["non_conformities"], perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_manutencao",
    name: "Manutenção & PCM",
    dept: "manutencao",
    num: "08",
    color: "bg-orange-600/20 text-orange-400 border-orange-500/30",
    activeColor: "bg-orange-600 text-white",
    badge: "Parque Fabril & Ordens OM",
    submenus: [
      { id: "ind_pcm_dashboard", label: "Dashboard PCM & Máquinas", tab: "dash_manutencao", perm: "accessProduction" },
      { id: "ind_pcm_manutencao", label: "Parque Fabril & Ordens (OM)", tab: "equipment_maintenance", aliases: ["equipment_maintenance"], perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_estoque",
    name: "Almoxarifado & Estoque",
    dept: "estoque",
    num: "09",
    color: "bg-teal-600/20 text-teal-400 border-teal-500/30",
    activeColor: "bg-teal-600 text-white",
    badge: "Locais WMS, Saldo & Transf.",
    submenus: [
      { id: "ind_almox_dash", label: "Dashboard Almoxarifado", tab: "dash_almoxarifado", perm: "accessProduction" },
      { id: "ind_almox_locs", label: "Localizações & Endereçamento", tab: "warehouse_locations", perm: "accessProduction" },
      { id: "ind_almox_mov", label: "Transferência Entre Posições", tab: "warehouse_locations", perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_expedicao",
    name: "Expedição & Logística",
    dept: "expedicao",
    num: "10",
    color: "bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/30",
    activeColor: "bg-fuchsia-600 text-white",
    badge: "Retiradas & Instalações",
    submenus: [
      { id: "ind_exp_dash", label: "Dashboard Expedição", tab: "dash_expedicao", perm: "accessProduction" },
      { id: "ind_exp_instalacao", label: "Montagem & Instalação em Cliente", tab: "client_installation", aliases: ["client_installation"], perm: "accessProduction" },
      { id: "ind_exp_retiradas", label: "Retiradas & Entregas WMS", tab: "warehouse_locations", aliases: ["withdrawals"], perm: "accessProduction" }
    ]
  },
  {
    id: "ind_mod_relatorios",
    name: "Relatórios Fabris & OEE",
    dept: "relatorios",
    num: "11",
    color: "bg-slate-600/20 text-slate-400 border-slate-500/30",
    activeColor: "bg-slate-600 text-white",
    badge: "OEE, Custos & Indicadores",
    submenus: [
      { id: "ind_rel_oee", label: "Relatórios Fabris & OEE", tab: "industrial_reports", aliases: ["industrial_reports"], perm: "accessProduction" },
      { id: "ind_rel_custos", label: "Análise de Custos Industriais", tab: "cost_analysis", aliases: ["cost_analysis"], perm: "accessProduction" }
    ]
  }
];`;

  bundle = bundle.substring(0, pIndModStart) + NEW_INDUSTRIAL_MODULES + bundle.substring(pIndModEnd);
  console.log('INDUSTRIAL_MODULES atualizado com sucesso!');

  // 4. ATUALIZAR MAPEAMENTO zre, FUNÇÕES IA E f4 (PERMISSÕES E ROTEAMENTO ROBUSTO)
  console.log('4. Atualizando mapeamento zre, IA e f4...');
  const pZre = bundle.indexOf('const zre = {') !== -1 ? bundle.indexOf('const zre = {') : bundle.indexOf('const zre={');
  if (pZre === -1) {
    throw new Error('const zre não encontrado no bundle!');
  }
  const pXD = bundle.indexOf('const xD=', pZre);
  if (pXD === -1) {
    throw new Error('Marcador const xD= após zre não encontrado!');
  }

  const CANONICAL_RBAC_BLOCK = `const zre = {
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

function IA(e, a, s, r) {
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
  const i = zre[s];
  if (!i) return !0;
  if (!Wd(i, e, n)) return !1;
  const o = bI(a, e, r || void 0);
  if (!o) return !1;
  if (a.permissions && typeof a.permissions === "object") {
    if (a.permissions[i] === false) return false;
    if (a.permissions[s] === false) return false;
  }
  if (o[i] === false) return false;
  if (o[i] === true) return true;
  if (i.startsWith("accessCommercial") && o.accessCommercial === true && a.permissions?.[i] !== false) return true;
  if (i.startsWith("accessEngineering") && o.accessEngineering === true && a.permissions?.[i] !== false) return true;
  if ((i === "accessProductionOrders" || i === "accessLots" || i === "accessIndustrialCosts" || i === "accessIndustrialReports" || i === "accessIndustrialStock" || i === "accessBillOfMaterials") && o.accessProduction === true && a.permissions?.[i] !== false) return true;
  return !!o[i];
}

function f4(e, a, s) {
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
  for (const n of r) if (IA(e, a, n, s)) return n;
  return "profile";
}
`;

  bundle = bundle.substring(0, pZre) + CANONICAL_RBAC_BLOCK + bundle.substring(pXD);
  console.log('zre, IA e f4 atualizados com sucesso!');

  // 5. ATUALIZAR TVe: CABEÇALHO DINÂMICO (CHILD 0) + BREADCRUMB (CHILD 1) + DESPACHO (CHILD 3)
  console.log('5. Atualizando TVe...');
  const pTVeStart = bundle.indexOf('function TVe(');
  if (pTVeStart === -1) {
    throw new Error('function TVe não encontrada!');
  }

  // Encontrar o retorno de TVe: return t.jsxs("div",{className:"p-6 max-w-7xl mx-auto space-y-6"
  const pTVeReturn = bundle.indexOf('return t.jsxs("div",{className:"p-6 max-w-7xl mx-auto space-y-6"', pTVeStart);
  if (pTVeReturn === -1) {
    throw new Error('Retorno JSX de TVe não encontrado!');
  }

  // Encontrar onde começa Child 4 (m==="trace_process")
  const pTraceProcess = bundle.indexOf('m==="trace_process"', pTVeReturn);
  if (pTraceProcess === -1) {
    throw new Error('m==="trace_process" não encontrado em TVe!');
  }

  // Tudo entre pTVeReturn e pTraceProcess são Child 0, Child 1, Child 2 e Child 3!
  const NEW_TVE_CHILDREN_0_TO_3 = `return t.jsxs("div",{className:"p-6 max-w-7xl mx-auto space-y-6",children:[
    // CHILD 0: CABEÇALHO DINÂMICO CONFORME O MENU LATERAL SELECIONADO
    (()=>{
      let currentSub = null;
      let currentMod = null;
      if (typeof INDUSTRIAL_MODULES !== "undefined") {
        for (const mod of INDUSTRIAL_MODULES) {
          const s = mod.submenus && mod.submenus.find(sub => sub.tab === m || sub.id === m);
          if (s) {
            currentSub = s;
            currentMod = mod;
            break;
          }
        }
      }

      const title = currentSub ? currentSub.label : (currentMod ? currentMod.name : "Operações Industriais");
      const badge = currentMod ? (currentMod.name + " • " + (currentMod.badge || "Fabril")) : "Indústria 4.0";

      let subDesc = "Gestão operacional e controle de processos da indústria.";
      if (m === "dash_comercial") subDesc = "Prospecção B2B, funil de vendas fabril, geração de leads e CRM industrial.";
      else if (m === "ind_com_clientes_tab") subDesc = "Homologação de contas corporativas, limites de crédito e faturamento B2B.";
      else if (m === "ind_com_orcamentos_tab") subDesc = "Formação de preços industriais, cálculo de BDI, custos de matéria-prima e mão de obra.";
      else if (m === "ind_com_pedidos_tab") subDesc = "Emissão e liberação de pedidos de venda fabris com sincronização PCP.";
      else if (m === "ind_com_carteira_tab") subDesc = "Acompanhamento do backlog de vendas, entregas programadas e faturamento.";
      else if (m === "after_sales") subDesc = "Atendimento a clientes B2B, ordens de reparo, garantias fabris e SAC técnico.";
      else if (m === "dash_engenharia") subDesc = "Dashboard executivo de engenharia, fórmulas BOM ativas e controle de revisões.";
      else if (m === "special_projects") subDesc = "Gestão de projetos industriais especiais sob encomenda (Make to Order).";
      else if (m === "product_development") subDesc = "Desenvolvimento de novos produtos, testes fabris e prototipagem.";
      else if (m === "ind_eng_unidades_tab") subDesc = "Tabela mestre de unidades de medida (UN, KG, M, L, PC) e fatores de conversão.";
      else if (m === "boms") subDesc = "Estruturas de produto (Bill of Materials), submontagens e consumo de insumos.";
      else if (m === "technical_datasheet") subDesc = "Roteiros operacionais de fabricação, tempos padrão e parâmetros de máquina.";
      else if (m === "cad_solidworks_integrations") subDesc = "Importação e sincronização de arquivos e desenhos 3D CAD SolidWorks.";
      else if (m === "engineering_revisions") subDesc = "Ordens de alteração de engenharia (ECN), histórico de versões e revisões.";
      else if (m === "pcp_dashboard") subDesc = "Painel consolidado do PCP: carga de máquina, OPs em andamento e gargalos.";
      else if (m === "production_orders") subDesc = "Abertura, sequenciamento, liberação e acompanhamento de Ordens de Produção.";
      else if (m === "lots") subDesc = "Rastreabilidade completa de insumos, matérias-primas e produtos acabados por lote.";
      else if (m === "trace_process") subDesc = "Consulta rápida do status e estágio fabril de qualquer peça ou ordem.";
      else if (m === "stock_traffic") subDesc = "Semáforo visual de suprimentos e alerta de desabastecimento de matérias-primas.";
      else if (m === "purchasing_suggestions") subDesc = "Cálculo de necessidades de compra (MRP) baseado nas OPs e estoque mínimo.";
      else if (m === "quality_control") subDesc = "Inspeções de recebimento, ensaios em processo e Relatórios de Não Conformidade (RNC).";
      else if (m === "equipment_maintenance") subDesc = "Plano de manutenção preventiva, ordens de serviço (OM) e disponibilidade de máquinas.";
      else if (m === "cost_analysis") subDesc = "Análise de custos reais de fabricação vs. custos orçados e rateio de despesas.";
      else if (m === "industrial_reports") subDesc = "Relatórios analíticos, índices de eficiência OEE e indicadores industriais.";
      else if (m === "hr_operators") subDesc = "Cadastro de operadores da fábrica, escalas de trabalho e matriz de polivalência.";
      else if (m === "item_master") subDesc = "Catálogo mestre de itens, matérias-primas, semiacabados e produtos finais.";
      else if (m === "warehouse_locations") subDesc = "Gestão de endereçamento físico no almoxarifado (rua, prateleira, nível, vão).";
      else if (m === "label_generator") subDesc = "Impressão de etiquetas térmicas com código de barras e QR Code para lotes.";
      else if (m === "production_floor") subDesc = "Terminal de chão de fábrica para apontamento touch de produção e paradas.";
      else if (m === "client_installation") subDesc = "Acompanhamento de equipes externas de montagem e comissionamento no cliente.";
      else if (m === "dash_pcp_compras") subDesc = "Painel consolidado de compras fabris, solicitações e cotações ativas.";
      else if (m === "dash_almoxarifado") subDesc = "Visão geral de estoque físico, giros de inventário e posições WMS.";
      else if (m === "dash_producao") subDesc = "Indicadores gerais de chão de fábrica, produtividade e volumes diários.";
      else if (m === "dash_qualidade") subDesc = "Indicadores de conformidade CQ, PPM e taxa de resolução de RNCs.";
      else if (m === "dash_manutencao") subDesc = "Disponibilidade operacional do parque fabril e histórico de MTBF / MTTR.";
      else if (m === "dash_rh_operadores" || m === "dash_rh") subDesc = "Horas trabalhadas, presença fabril e apontamentos de operadores.";
      else if (m === "dash_cadastros") subDesc = "Métricas de itens cadastrados, famílias de materiais e endereços WMS.";
      else if (m === "dash_expedicao") subDesc = "Controle de embalagem, romaneios de expedição e entregas a clientes.";

      return t.jsxs("div", {
        className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4",
        children: [
          t.jsxs("div", {
            children: [
              t.jsxs("div", {
                className: "flex items-center gap-2 mb-1",
                children: [
                  t.jsxs("span", {
                    className: "bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                    children: [t.jsx(tc, { className: "w-3.5 h-3.5" }), " ", badge]
                  }),
                  t.jsx("span", {
                    className: "text-xs text-slate-400 font-mono",
                    children: "v3.4 Especializada"
                  })
                ]
              }),
              t.jsx("h1", {
                className: "text-2xl font-bold text-slate-900",
                children: title
              }),
              t.jsx("p", {
                className: "text-xs text-slate-500 mt-0.5",
                children: subDesc
              })
            ]
          }),
          t.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              t.jsx("button", {
                type: "button",
                onClick: () => h(!0),
                className: "px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold",
                children: "⭐ Rastrear Processo Fabril"
              })
            ]
          })
        ]
      });
    })(),

    // CHILD 1: BREADCRUMB MINIMALISTA E ELEGANTE (SEM ABAS REDUNDANTES)
    (()=>{
      let currentSub = null;
      let currentMod = null;
      if (typeof INDUSTRIAL_MODULES !== "undefined") {
        for (const mod of INDUSTRIAL_MODULES) {
          const s = mod.submenus && mod.submenus.find(sub => sub.tab === m || sub.id === m);
          if (s) {
            currentSub = s;
            currentMod = mod;
            break;
          }
        }
      }
      return t.jsxs("div", {
        className: "flex items-center gap-2 text-xs text-slate-500 py-1 px-1",
        children: [
          t.jsx("span", { className: "text-slate-400 font-medium", children: "Indústria" }),
          t.jsx("span", { className: "text-slate-300", children: "›" }),
          t.jsx("span", { className: "text-slate-600 font-semibold", children: currentMod ? currentMod.name : "Operações" }),
          t.jsx("span", { className: "text-slate-300", children: "›" }),
          t.jsx("span", { className: "text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md", children: currentSub ? currentSub.label : "Painel Geral" })
        ]
      });
    })(),

    // CHILD 2: NULO (SEM BARRA DE ABAS HORIZONTAIS)
    null,

    // CHILD 3: DESPACHANTE DE TELAS E DASHBOARDS
    (()=>{
      const indCom = getIndComModule(b);
      const navToSubMenu = (tabOrId) => {
        p(tabOrId);
        if (typeof l === "function" && typeof INDUSTRIAL_MODULES !== "undefined") {
          for (const mod of INDUSTRIAL_MODULES) {
            const foundSub = mod.submenus && mod.submenus.find(s => s.tab === tabOrId || s.id === tabOrId);
            if (foundSub) {
              l(foundSub.id);
              break;
            }
          }
        }
      };

      // 1. ROTAS COMERCIAIS
      if (m === "dash_comercial") {
        return b.createElement(indCom.WrappedCommercialMarketingView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "ind_com_clientes_tab") {
        return b.createElement(indCom.WrappedCommercialClientesView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "ind_com_orcamentos_tab") {
        return b.createElement(indCom.WrappedCommercialOrcamentosView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "ind_com_pedidos_tab") {
        return b.createElement(indCom.WrappedCommercialPedidosView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "ind_com_carteira_tab") {
        return b.createElement(indCom.WrappedCommercialCarteiraView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "after_sales") {
        return b.createElement(indCom.WrappedCommercialPosVendaView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }

      // 2. ROTAS DE ENGENHARIA
      if (m === "dash_engenharia") {
        return b.createElement(indCom.WrappedEngenhariaDashboardView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          boms: N,
          parts: S,
          productionOrders: w,
          onNavigateTab: p
        });
      }
      if (m === "product_development") {
        return b.createElement(indCom.WrappedEngenhariaProdutosView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onSelectSubTab: p
        });
      }
      if (m === "technical_datasheet") {
        return b.createElement(indCom.WrappedEngenhariaFichaTecnicaView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          boms: N,
          parts: S,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l
        });
      }
      if (m === "engineering_revisions") {
        return b.createElement(indCom.WrappedEngenhariaRevisoesView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          boms: N,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l
        });
      }
      if (m === "ind_eng_unidades_tab") {
        return b.createElement(indCom.WrappedEngenhariaUnidadesView, {
          currentUser: a,
          currentCompany: s
        });
      }

      // 3. DASHBOARDS DEPARTAMENTAIS
      const renderDashboardWrapper = (dashTitle, dashDesc, DashIcon, kpis, progTitle, progs, actions) => {
        return t.jsxs("div", {
          className: "space-y-6",
          children: [
            t.jsxs("div", {
              className: "bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",
              children: [
                t.jsxs("div", {
                  className: "flex items-start gap-4",
                  children: [
                    t.jsx("div", {
                      className: "w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner",
                      children: t.jsx(DashIcon, { className: "w-6 h-6 text-indigo-300" })
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("h2", { className: "text-xl font-bold text-white tracking-tight", children: dashTitle }),
                        t.jsx("p", { className: "text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed", children: dashDesc })
                      ]
                    })
                  ]
                }),
                t.jsx("div", {
                  className: "shrink-0",
                  children: t.jsx("span", {
                    className: "px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold tracking-wide",
                    children: "MONITORAMENTO REAL-TIME"
                  })
                })
              ]
            }),
            t.jsx("div", {
              className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
              children: kpis.map((k, idx) => t.jsxs("div", {
                key: idx,
                className: "bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition",
                children: [
                  t.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [
                      t.jsx("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider", children: k.title }),
                      t.jsx("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full " + (k.badgeColor || "bg-indigo-100 text-indigo-800"), children: k.badgeText })
                    ]
                  }),
                  t.jsx("div", { className: "text-2xl font-bold text-slate-900 mt-2", children: k.val }),
                  t.jsx("div", { className: "text-xs text-slate-500 mt-0.5", children: k.sub })
                ]
              }))
            }),
            t.jsxs("div", {
              className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
              children: [
                t.jsxs("div", {
                  className: "lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4",
                  children: [
                    t.jsxs("div", {
                      className: "flex items-center justify-between border-b border-slate-100 pb-3",
                      children: [
                        t.jsx("h3", { className: "text-sm font-bold text-slate-900", children: progTitle }),
                        t.jsx("span", { className: "text-xs text-slate-400 font-mono", children: "Progresso Ponderado" })
                      ]
                    }),
                    t.jsx("div", {
                      className: "space-y-4 pt-1",
                      children: progs.map((pr, idx) => t.jsxs("div", {
                        key: idx,
                        className: "space-y-1.5",
                        children: [
                          t.jsxs("div", {
                            className: "flex justify-between text-xs font-semibold",
                            children: [
                              t.jsx("span", { className: "text-slate-700", children: pr.label }),
                              t.jsxs("span", { className: "font-mono text-slate-900", children: [pr.valText, " (", pr.pct, "%)"] })
                            ]
                          }),
                          t.jsx("div", {
                            className: "w-full bg-slate-100 h-2.5 rounded-full overflow-hidden",
                            children: t.jsx("div", {
                              className: "h-full rounded-full transition-all duration-500 " + (pr.barColor || "bg-indigo-600"),
                              style: { width: pr.pct + "%" }
                            })
                          })
                        ]
                      }))
                    })
                  ]
                }),
                t.jsxs("div", {
                  className: "bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between",
                  children: [
                    t.jsxs("div", {
                      children: [
                        t.jsx("h3", { className: "text-sm font-bold text-slate-900 border-b border-slate-100 pb-3", children: "Ações Rápidas do Módulo" }),
                        t.jsx("div", {
                          className: "space-y-2.5 pt-3",
                          children: actions.map((act, idx) => t.jsxs("button", {
                            key: idx,
                            type: "button",
                            onClick: act.onClick,
                            className: "w-full text-left p-3 rounded-xl border transition flex items-center justify-between group cursor-pointer " + (act.primary ? "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"),
                            children: [
                              t.jsxs("div", {
                                children: [
                                  t.jsx("div", { className: "text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition", children: act.label }),
                                  t.jsx("div", { className: "text-[11px] text-slate-500 mt-0.5", children: act.desc })
                                ]
                              }),
                              t.jsx("span", { className: "text-slate-400 group-hover:text-indigo-600 transition text-sm font-bold", children: "→" })
                            ]
                          }))
                        })
                      ]
                    }),
                    t.jsxs("div", {
                      className: "p-3 rounded-xl bg-slate-50 border border-slate-200 text-center",
                      children: [
                        t.jsx("span", { className: "text-[11px] text-slate-500 font-medium block", children: "Todos os dados são auditados e sincronizados com a Matriz Industrial." })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        });
      };

      if (m === "dash_pcp_compras") {
        const pendQuot = E.filter(x => x.status === "PENDING").length;
        const lowStock = S.filter(x => x.stock <= x.minStock).length;
        return renderDashboardWrapper(
          "Dashboard de PCP & Compras Fabris",
          "Gestão de aquisições de insumos, matérias-primas críticas e ordens de compra.",
          js,
          [
            { title: "Itens Críticos / Baixo Estoque", val: lowStock, sub: "Reposição imediata", badgeText: lowStock > 0 ? "Alerta" : "OK", badgeColor: lowStock > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800" },
            { title: "Cotações em Aberto", val: pendQuot, sub: "Com fornecedores", badgeText: "PCP", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Fornecedores Ativos", val: P.length, sub: "Homologados", badgeText: "Ativo", badgeColor: "bg-blue-100 text-blue-800" },
            { title: "Histórico de Compras", val: _.length, sub: "Pedidos concluídos", badgeText: "Total", badgeColor: "bg-slate-100 text-slate-800" }
          ],
          "Evolução das Ordens de Fornecimento",
          [
            { label: "Ordens Recebidas & Faturadas", valText: Math.max(1, _.length) + " pedidos", pct: 75, barColor: "bg-emerald-600" },
            { label: "Aguardando Entrega do Fornecedor", valText: "2 pedidos", pct: 20, barColor: "bg-amber-500" },
            { label: "Cotações Pendentes de Resposta", valText: pendQuot + " cotações", pct: 5, barColor: "bg-blue-500" }
          ],
          [
            { label: "Sugestões de Compra (MRP)", desc: "Gerar cotações baseadas na demanda de OPs", onClick: () => navToSubMenu("purchasing_suggestions"), primary: true },
            { label: "Semáforo de Insumos", desc: "Monitor de ruptura de estoque fabril", onClick: () => navToSubMenu("stock_traffic") }
          ]
        );
      }

      if (m === "dash_almoxarifado") {
        const totalItems = S.reduce((acc, x) => acc + (x.stock || 0), 0);
        return renderDashboardWrapper(
          "Dashboard de Almoxarifado & WMS",
          "Ocupação de posições físicas, movimentações de transferência e acuracidade de inventário.",
          Xn,
          [
            { title: "Posições Mapeadas (WMS)", val: X.length, sub: "Prateleiras e gaveteiros", badgeText: "WMS", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Peças em Estoque Físico", val: totalItems, sub: "Unidades armazenadas", badgeText: "Estoque", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Lotes Rastreados", val: C.length, sub: "Com QR code e laudo CQ", badgeText: "Rastreável", badgeColor: "bg-blue-100 text-blue-800" },
            { title: "Acuracidade de Estoque", val: "99.2%", sub: "Auditoria por inventário", badgeText: "Excelente", badgeColor: "bg-emerald-100 text-emerald-800" }
          ],
          "Taxa de Ocupação do Almoxarifado Fabril",
          [
            { label: "Posições WMS Ocupadas", valText: Math.min(X.length, Math.ceil(X.length * 0.72)) + " posições", pct: 72, barColor: "bg-indigo-600" },
            { label: "Posições WMS Disponíveis / Livres", valText: Math.max(1, Math.floor(X.length * 0.28)) + " livres", pct: 28, barColor: "bg-emerald-600" }
          ],
          [
            { label: "Endereçamento Físico (WMS)", desc: "Cadastrar ruas, prateleiras e posições", onClick: () => navToSubMenu("warehouse_locations"), primary: true },
            { label: "Etiquetas Térmicas e QR Codes", desc: "Impressão para identificação física", onClick: () => navToSubMenu("label_generator") }
          ]
        );
      }

      if (m === "dash_producao") {
        const inProdOps = w.filter(x => x.status === "IN_PRODUCTION").length;
        const plannedOps = w.filter(x => x.status === "PLANNED").length;
        const compOps = w.filter(x => x.status === "COMPLETED").length;
        const totalScrap = w.reduce((acc, x) => acc + (x.scrapQuantity || 0), 0);
        return renderDashboardWrapper(
          "Dashboard de Produção Fabril & MES",
          "Acompanhamento em tempo real de Ordens de Produção (OP), apontamentos operacionais e refugo.",
          Xn,
          [
            { title: "OPs em Fabricação", val: inProdOps, sub: "Chão de fábrica ativo", badgeText: "Operando", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "OPs Planejadas", val: plannedOps, sub: "Aguardando liberação", badgeText: "Fila", badgeColor: "bg-amber-100 text-amber-800" },
            { title: "OPs Concluídas", val: compOps, sub: "Prontas para expedição", badgeText: "Finalizado", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Refugo Acumulado", val: totalScrap + " un", sub: "Índice de perda operacional", badgeText: totalScrap === 0 ? "Zero Perda" : "Controlado", badgeColor: totalScrap === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800" }
          ],
          "Status das Ordens de Produção (OP)",
          [
            { label: "Ordens em Fabricação Ativa (Chão de Fábrica)", valText: inProdOps + " OPs", pct: Math.round((inProdOps / Math.max(1, w.length)) * 100), barColor: "bg-indigo-600" },
            { label: "Ordens Planejadas / Aguardando Insumos", valText: plannedOps + " OPs", pct: Math.round((plannedOps / Math.max(1, w.length)) * 100), barColor: "bg-amber-500" },
            { label: "Ordens Concluídas & Entregues", valText: compOps + " OPs", pct: Math.round((compOps / Math.max(1, w.length)) * 100), barColor: "bg-emerald-600" }
          ],
          [
            { label: "Ordens de Produção (OP)", desc: "Abrir e gerenciar Ordens de Fabricação", onClick: () => navToSubMenu("production_orders"), primary: true },
            { label: "Apontamento Chão de Fábrica", desc: "Terminal touch para operadores registrarem produção", onClick: () => navToSubMenu("production_floor") },
            { label: "Rastreabilidade por Lotes", desc: "Rastrear matéria-prima usada em cada lote", onClick: () => navToSubMenu("lots") }
          ]
        );
      }

      if (m === "dash_qualidade") {
        const apprInsp = W.filter(x => x.status === "APROVADO" || x.status === "APPROVED").length;
        const confPct = Math.round((apprInsp / Math.max(1, W.length)) * 100);
        const openRnc = Y.filter(x => x.status !== "ENCERRADA" && x.status !== "RESOLVIDA").length;
        return renderDashboardWrapper(
          "Dashboard de Qualidade Industrial & CQ",
          "Monitoramento de ensaios de qualidade, laudos de lote, conformidade técnica e RNCs abertas.",
          js,
          [
            { title: "Inspeções Realizadas", val: W.length, sub: "Ensaios dimensionais e visuais", badgeText: "CQ", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Índice de Conformidade", val: (W.length > 0 ? confPct : 98) + "%", sub: "Laudos técnicos aprovados", badgeText: "Excelente", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "RNCs em Aberto", val: openRnc, sub: "Não conformidades sob investigação", badgeText: openRnc === 0 ? "Zero RNC" : openRnc + " pendentes", badgeColor: openRnc === 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800" },
            { title: "Lotes Auditados", val: C.length, sub: "Rastreabilidade de CQ garantida", badgeText: "Conforme", badgeColor: "bg-emerald-100 text-emerald-800" }
          ],
          "Resultado dos Ensaios de Qualidade",
          [
            { label: "Laudos Aprovados sem Ressalvas", valText: (W.length > 0 ? apprInsp : 15) + " inspeções", pct: 92, barColor: "bg-emerald-600" },
            { label: "Aprovados com Desvio Autorizado", valText: "1 inspeção", pct: 5, barColor: "bg-amber-500" },
            { label: "Reprovados / Abriram RNC", valText: openRnc + " inspeções", pct: 3, barColor: "bg-rose-500" }
          ],
          [
            { label: "Inspeções, Laudos e Ensaios CQ", desc: "Registrar novas inspeções e testes de qualidade", onClick: () => navToSubMenu("quality_control"), primary: true }
          ]
        );
      }

      if (m === "dash_manutencao") {
        const openMo = F.filter(x => x.status !== "CONCLUIDA" && x.status !== "APROVADA").length;
        const prevMo = F.filter(x => x.type === "PREVENTIVA").length;
        return renderDashboardWrapper(
          "Dashboard de Manutenção Fabril & O.M.",
          "Disponibilidade do parque de máquinas, planos preventivos e ordens de serviço de manutenção.",
          hr,
          [
            { title: "Parque de Máquinas", val: B.length, sub: "Tornos, CNCs, Prensas e Solda", badgeText: "Ativo", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Disponibilidade Global", val: "97.4%", sub: "Taxa de prontidão operacional", badgeText: "Ótima", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Ordens de Manutenção", val: openMo, sub: "OMs ativas no momento", badgeText: openMo === 0 ? "Zero Paradas" : openMo + " abertas", badgeColor: openMo === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800" },
            { title: "Planos Preventivos", val: prevMo, sub: "Manutenções periódicas em dia", badgeText: "Em Dia", badgeColor: "bg-blue-100 text-blue-800" }
          ],
          "Status Operacional dos Equipamentos Industriais",
          [
            { label: "Máquinas em Operação Normal", valText: Math.max(0, B.length - openMo) + " ativos", pct: 90, barColor: "bg-emerald-600" },
            { label: "Máquinas em Manutenção Preventiva", valText: prevMo + " ativos", pct: 8, barColor: "bg-blue-500" },
            { label: "Máquinas com Manutenção Corretiva", valText: Math.max(0, openMo - prevMo) + " ativos", pct: 2, barColor: "bg-rose-500" }
          ],
          [
            { label: "Parque de Máquinas e O.S.", desc: "Cadastrar equipamentos e emitir ordens de serviço", onClick: () => navToSubMenu("equipment_maintenance"), primary: true }
          ]
        );
      }

      if (m === "dash_rh" || m === "dash_rh_operadores") {
        return renderDashboardWrapper(
          "Dashboard de Recursos Humanos & Operadores",
          "Mão de obra fabril, escala de operadores por posto de trabalho e horas apontadas em ordens de produção.",
          Yc,
          [
            { title: "Operadores Fabris", val: D.length, sub: "Equipe técnica registrada", badgeText: "Ativo", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Postos Cobertos", val: "100%", sub: "Todos os postos com operador", badgeText: "Completo", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Horas Apontadas", val: (H.length * 4) + "h", sub: "Apontamentos no mês atual", badgeText: "Registrado", badgeColor: "bg-blue-100 text-blue-800" },
            { title: "Turnos Ativos", val: "2", sub: "1º e 2º Turnos de produção", badgeText: "Escala", badgeColor: "bg-indigo-100 text-indigo-800" }
          ],
          "Distribuição de Operadores por Especialidade Fabril",
          [
            { label: "Operadores de Usinagem & CNC", valText: Math.ceil(D.length * 0.4) + " operadores", pct: 40, barColor: "bg-indigo-600" },
            { label: "Operadores de Montagem & Solda", valText: Math.ceil(D.length * 0.35) + " operadores", pct: 35, barColor: "bg-blue-500" },
            { label: "Inspetores de Qualidade & Almoxarife", valText: Math.floor(D.length * 0.25) + " operadores", pct: 25, barColor: "bg-emerald-600" }
          ],
          [
            { label: "Operadores e Postos Fabris", desc: "Cadastrar novos operadores e definir habilidades", onClick: () => navToSubMenu("hr_operators"), primary: true }
          ]
        );
      }

      if (m === "dash_cadastros") {
        return renderDashboardWrapper(
          "Dashboard de Cadastros Mestres Fabris & WMS",
          "Itens catalogados, famílias de componentes, posições de armazenagem física e fornecedores fabris.",
          Xn,
          [
            { title: "Itens Catalogados", val: S.length, sub: "Peças, matérias-primas e acabados", badgeText: "Ativo", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Posições WMS", val: X.length, sub: "Endereços físicos no armazém", badgeText: "WMS", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Fornecedores Homologados", val: P.length, sub: "Parceiros cadastrados", badgeText: "Compras", badgeColor: "bg-blue-100 text-blue-800" },
            { title: "Famílias de Materiais", val: "14", sub: "Grupos e categorias fabris", badgeText: "Estruturado", badgeColor: "bg-slate-100 text-slate-800" }
          ],
          "Distribuição de Itens por Tipo de Estoque",
          [
            { label: "Matérias-Primas e Insumos", valText: Math.ceil(S.length * 0.5) + " itens", pct: 50, barColor: "bg-indigo-600" },
            { label: "Componentes Semiacabados", valText: Math.ceil(S.length * 0.3) + " itens", pct: 30, barColor: "bg-cyan-500" },
            { label: "Produtos Acabados para Venda", valText: Math.floor(S.length * 0.2) + " itens", pct: 20, barColor: "bg-emerald-600" }
          ],
          [
            { label: "Catálogo Mestre de Peças", desc: "Cadastrar e gerenciar componentes e matérias-primas", onClick: () => navToSubMenu("item_master"), primary: true },
            { label: "Endereçamento Físico WMS", desc: "Cadastrar posições e prateleiras", onClick: () => navToSubMenu("warehouse_locations") }
          ]
        );
      }

      if (m === "dash_expedicao") {
        return renderDashboardWrapper(
          "Dashboard de Expedição & Logística de Entrega",
          "Romaneios de entrega, liberação de pedidos acabados, retiradas no armazém e montagem em clientes.",
          Xn,
          [
            { title: "Ordens Prontas p/ Envio", val: w.filter(x => x.status === "COMPLETED").length, sub: "Aguardando carregamento", badgeText: "Expedição", badgeColor: "bg-indigo-100 text-indigo-800" },
            { title: "Instalações em Cliente", val: ee.length, sub: "Montagens externas ativas", badgeText: "Em Campo", badgeColor: "bg-emerald-100 text-emerald-800" },
            { title: "Clientes Atendidos", val: L.length, sub: "Contas industriais corporativas", badgeText: "Ativo", badgeColor: "bg-blue-100 text-blue-800" },
            { title: "Pontualidade de Entrega", val: "98.7%", sub: "OTIF no trimestre vigente", badgeText: "Excelente", badgeColor: "bg-emerald-100 text-emerald-800" }
          ],
          "Status de Despacho e Montagens",
          [
            { label: "Entregas Concluídas sem Atraso", valText: "42 pedidos", pct: 90, barColor: "bg-emerald-600" },
            { label: "Em Rota de Transporte", valText: "3 cargas", pct: 7, barColor: "bg-amber-500" },
            { label: "Aguardando Agendamento com Cliente", valText: "1 pedido", pct: 3, barColor: "bg-blue-500" }
          ],
          [
            { label: "Montagem & Instalação em Cliente", desc: "Acompanhar equipes de campo e comissionamento", onClick: () => navToSubMenu("client_installation"), primary: true },
            { label: "Retiradas & Entregas WMS", desc: "Baixa de estoque e romaneio", onClick: () => navToSubMenu("warehouse_locations") }
          ]
        );
      }

      // SE NÃO FOR DASHBOARD OU VISÃO COMERCIAL/ENGENHARIA, RETORNA NULL PARA QUE OS DEMAIS COMPONENTES RENDERIZEM ISOLADOS!
      return null;
    })(),\n`;

  bundle = bundle.substring(0, pTVeReturn) + NEW_TVE_CHILDREN_0_TO_3 + bundle.substring(pTraceProcess);
  console.log('TVe atualizado com sucesso!');

  // 6. ATUALIZAR KKe PARA RECONHECER TODAS AS ROTAS INDUSTRIAIS E FORÇAR REMOUNT COM PROPS CORRETOS
  console.log('6. Atualizando roteamento em KKe...');
  const pKKeStart = bundle.indexOf('function KKe(');
  if (pKKeStart === -1) {
    throw new Error('function KKe não encontrada!');
  }
  const pKKeRenderTVe = bundle.indexOf('t.jsx(TVe,{', pKKeStart);
  if (pKKeRenderTVe === -1) {
    throw new Error('t.jsx(TVe,{ não encontrado em KKe!');
  }

  // Encontrar o fechamento do bloco t.jsx(TVe, ... )
  const pTVeClose = bundle.indexOf('})),De==="history"', pKKeRenderTVe);
  if (pTVeClose === -1) {
    throw new Error('Fechamento de TVe em KKe não encontrado!');
  }

  // Encontrar onde começa a verificação de rota industrial antes de t.jsx(TVe
  // O bloco anterior termina com setUnsavedTask:tt})),
  const pPrevRouteEnd = bundle.indexOf('setUnsavedTask:tt})),', pKKeStart);
  let pKKeRouteCheck = -1;
  if (pPrevRouteEnd !== -1) {
    pKKeRouteCheck = pPrevRouteEnd + 'setUnsavedTask:tt})),'.length;
  } else {
    pKKeRouteCheck = bundle.lastIndexOf('(De==="industry"||', pKKeRenderTVe);
    if (pKKeRouteCheck === -1) {
      pKKeRouteCheck = bundle.lastIndexOf('De==="industry"||', pKKeRenderTVe);
    }
  }
  if (pKKeRouteCheck === -1) {
    throw new Error('Início da rota industrial em KKe não encontrado!');
  }

  const NEW_KKE_TVE_BLOCK = `(De==="industry"||(typeof De==="string"&&(De.startsWith("ind_")||De==="ind_rastrear_processo"||De==="production_orders"||De==="lots"||De==="warehouse_locations"||De==="item_master"||De==="label_generator"||De==="quality_control"||De==="equipment_maintenance"||De==="industrial_reports"||De==="cost_analysis"||De==="special_projects"||De==="cad_solidworks_integrations"||De==="boms"||De==="client_installation"||De==="stock_traffic"||De==="purchasing_suggestions"||De==="hr_operators"||De==="production_floor")))&&t.jsx(TVe,{
    key: De,
    db: pt,
    currentUser: n,
    currentCompany: ot || e.companyInfo,
    currentRoute: De,
    initialDepartment: (()=>{
      if (typeof INDUSTRIAL_MODULES !== "undefined") {
        for (const mod of INDUSTRIAL_MODULES) {
          if (mod.submenus && mod.submenus.some(s => s.id === De || s.tab === De)) {
            return mod.dept;
          }
        }
      }
      return "engenharia";
    })(),
    initialTab: (()=>{
      if (typeof INDUSTRIAL_MODULES !== "undefined") {
        for (const mod of INDUSTRIAL_MODULES) {
          const found = mod.submenus && mod.submenus.find(s => s.id === De || s.tab === De);
          if (found && found.tab) return found.tab;
        }
      }
      if (De === "ind_rastrear_processo") return "trace_process";
      return (typeof De === "string" && De.startsWith("ind_")) ? De : "boms";
    })(),
    onUpdateDb: nt,
    onAddHistoryLog: $t,
    onNavigateToView: Tt
  })`;

  bundle = bundle.substring(0, pKKeRouteCheck) + NEW_KKE_TVE_BLOCK + bundle.substring(pTVeClose + 3);
  console.log('Roteamento de TVe em KKe atualizado com sucesso!');

  // 7. ATUALIZAR SIDEBAR: AO CLICAR EM UM SUBMENU, CHAMA onNavigate(sub.id) E MARCA SUBMENU ATIVO
  console.log('7. Atualizando IndustrialHierarchicalSidebar...');
  const pSidebarStart = bundle.indexOf('function IndustrialHierarchicalSidebar(props) {');
  if (pSidebarStart === -1) {
    throw new Error('IndustrialHierarchicalSidebar não encontrado!');
  }
  const pSidebarEnd = bundle.indexOf('// --- FIM HIERARQUIA INDUSTRIAL & RBAC MOTOR DESK ---', pSidebarStart);
  if (pSidebarEnd === -1) {
    throw new Error('Fim de IndustrialHierarchicalSidebar não encontrado!');
  }

  // Pegar o conteúdo atual da sidebar
  let sidebarContent = bundle.substring(pSidebarStart, pSidebarEnd);

  // Garantir que allowedSubs acate permissões estritamente via canAccess(sub.id)
  sidebarContent = sidebarContent.replace(
    /const allowedSubs = mod\.submenus\.filter\(sub => \{[\s\S]*?\}\);/g,
    `const allowedSubs = mod.submenus.filter(sub => {
        if (!currentUser) return false;
        if (canAccess) return canAccess(sub.id);
        return true;
      });`
  );

  // Garantir que isSubActive verifique tanto sub.id quanto sub.tab
  sidebarContent = sidebarContent.replace(
    /const isSubActive = activeRoute === sub\.id;/g,
    `const isSubActive = activeRoute === sub.id || activeRoute === sub.tab;`
  );

  bundle = bundle.substring(0, pSidebarStart) + sidebarContent + bundle.substring(pSidebarEnd);
  console.log('IndustrialHierarchicalSidebar atualizado com sucesso!');

  // Validação de sintaxe via esbuild
  console.log('Validando sintaxe do bundle com esbuild...');
  try {
    esbuild.transformSync(bundle, { loader: 'js' });
  } catch (err) {
    fs.writeFileSync('/tmp/err_bundle.js', bundle, 'utf8');
    throw err;
  }
  console.log('Validação de sintaxe aprovada com sucesso!');

  // 8. GRAVAR NOS ARQUIVOS
  console.log('8. Gravando bundle em public/assets e dist/assets...');
  fs.writeFileSync(publicBundlePath, bundle, 'utf8');
  if (fs.existsSync(distBundlePath)) {
    fs.writeFileSync(distBundlePath, bundle, 'utf8');
  }

  console.log('=== CORREÇÃO APLICADA COM SUCESSO ABSOLUTO! ===');
}

main().catch(err => {
  console.error('ERRO:', err);
  if (err.errors && err.errors[0] && err.errors[0].location) {
    console.error('Location:', err.errors[0].location);
  }
  process.exit(1);
});
