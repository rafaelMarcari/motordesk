const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
let bundle = fs.readFileSync(bundlePath, "utf8");
console.log("Read bundle. Length:", bundle.length);

// =========================================================================
// 1. ATUALIZAR Cv COM AS PERMISSÕES COMERCIAIS INDUSTRIAIS
// =========================================================================
const commercialPermsInCv = `
  {key:"accessCommercialMarketing",label:"Comercial: Marketing & Prospecção B2B",category:"industrial",description:"Permite acessar o funil de prospecção de contas industriais e registrar interações."},
  {key:"accessCommercialBudgets",label:"Comercial: Orçamentos Fabris & Cotações",category:"industrial",description:"Permite formular propostas de fabricação, BDI, registrar negociações e aprovações."},
  {key:"accessCommercialOrders",label:"Comercial: Pedidos de Venda Fabris",category:"industrial",description:"Permite consultar pedidos confirmados, notas contratuais e liberação para PCP."},
  {key:"accessCommercialBacklog",label:"Comercial: Carteira de Pedidos & Backlog",category:"industrial",description:"Permite acompanhar prazos contratuais de entrega, aging e repactuar datas com clientes."},
  {key:"accessCommercialAfterSales",label:"Comercial: Pós-Venda & SAC Técnico",category:"industrial",description:"Permite gerenciar chamados de garantia, assistência técnica e tratativas pós-entrega."},
`;

if (!bundle.includes('"accessCommercialMarketing"')) {
  const pCv = bundle.indexOf('const Cv=[');
  if (pCv === -1) throw new Error("Cv definition not found");
  bundle = bundle.substring(0, pCv + 10) + commercialPermsInCv + bundle.substring(pCv + 10);
  console.log("Added commercial permissions to Cv array");
}

// =========================================================================
// 2. ATUALIZAR MATRIZ RBAC (H) NO MODAL DE GRUPOS DE ACESSO
// =========================================================================
const rbacCommercialBlock = `
{category:"INDUSTRIAL_COMMERCIAL",title:"Comercial Industrial & Vendas B2B",icon:t.jsx("span",{className:"text-base mr-1",children:"💼"}),keys:[
  {key:"accessCommercialMarketing",label:"Marketing / Prospecção B2B",description:"Pipeline de novas contas e registro de conversas"},
  {key:"accessCommercialBudgets",label:"Orçamentos Fabris & Cotações",description:"Composição de custos, BDI e negociações de propostas"},
  {key:"accessCommercialOrders",label:"Pedidos de Venda Fabris",description:"Contratos fechados, POs do cliente e liberação PCP"},
  {key:"accessCommercialBacklog",label:"Carteira de Pedidos (Backlog)",description:"Acompanhamento de prazos, semáforo de risco e repactuações"},
  {key:"accessCommercialAfterSales",label:"Pós-Venda & SAC Técnico",description:"Chamados técnicos, garantias e tratativas com clientes"}
]},
`;

if (!bundle.includes('"INDUSTRIAL_COMMERCIAL"')) {
  const pModal = bundle.indexOf("Criar Novo Grupo de Acesso");
  const pFunc = bundle.lastIndexOf("function ", pModal);
  const pH = bundle.indexOf(",H=[", pFunc);
  if (pH !== -1) {
    bundle = bundle.substring(0, pH + 4) + rbacCommercialBlock + bundle.substring(pH + 4);
    console.log("Added INDUSTRIAL_COMMERCIAL section to H array in RBAC modal");
  } else {
    console.warn("H array not found near RBAC modal");
  }
}

// =========================================================================
// 3. ATUALIZAR SUBMENUS DO MÓDULO COMERCIAL NO INDUSTRIAL_MODULES
// =========================================================================
const oldCommercialModule = `id: "ind_mod_comercial",    dept: "comercial",    num: "1",    name: "Comercial",    badge: "Vendas",    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",    activeColor: "bg-blue-600 text-white",    iconChar: "💼",    submenus: [      { id: "ind_com_marketing", label: "Marketing / Prospecção", perm: "accessCommercial", tab: "dash_comercial" },      { id: "clients", label: "Cadastro de Clientes", perm: "accessClients" },      { id: "ind_com_orcamentos", label: "Orçamentos Fabris", perm: "accessBudgets", tab: "commercial" },      { id: "ind_com_pedidos", label: "Pedidos de Venda", perm: "accessCommercial", tab: "commercial" },      { id: "ind_com_carteira", label: "Carteira de Pedidos", perm: "accessCommercial", tab: "commercial" },      { id: "ind_com_posvenda", label: "Pós-Venda & SAC", perm: "accessCommercial", tab: "after_sales" }    ]`;

const newCommercialModule = `id: "ind_mod_comercial",    dept: "comercial",    num: "1",    name: "Comercial",    badge: "Vendas",    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",    activeColor: "bg-blue-600 text-white",    iconChar: "💼",    submenus: [      { id: "ind_com_marketing", label: "Marketing / Prospecção", perm: "accessCommercialMarketing", tab: "dash_comercial" },      { id: "clients", label: "Cadastro de Clientes", perm: "accessClients" },      { id: "ind_com_orcamentos", label: "Orçamentos Fabris", perm: "accessCommercialBudgets", tab: "ind_com_orcamentos_tab" },      { id: "ind_com_pedidos", label: "Pedidos de Venda", perm: "accessCommercialOrders", tab: "ind_com_pedidos_tab" },      { id: "ind_com_carteira", label: "Carteira de Pedidos", perm: "accessCommercialBacklog", tab: "ind_com_carteira_tab" },      { id: "ind_com_posvenda", label: "Pós-Venda & SAC", perm: "accessCommercialAfterSales", tab: "after_sales" }    ]`;

if (bundle.includes(oldCommercialModule)) {
  bundle = bundle.replace(oldCommercialModule, newCommercialModule);
  console.log("Updated INDUSTRIAL_MODULES commercial submenus with dedicated tabs and unique perms");
} else {
  console.log("Checking if INDUSTRIAL_MODULES was already updated...");
}

// 4. Salvar teste parcial
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Part 1 passed!");
