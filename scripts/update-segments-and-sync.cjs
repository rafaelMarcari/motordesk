const fs = require('fs');
const path = require('path');

console.log('--- Aplicando inclusão do menu Financeiro no menu normal do Segmento Indústria ---');

const bundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

let bundle = fs.readFileSync(bundlePath, 'utf8');

// =========================================================================
// 1. CORREÇÃO DE Id: Reconhecimento robusto de INDÚSTRIA em todas as variações
// =========================================================================
const idTarget = `function Id(e,a){const s=String(e||"").trim().toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,""),r=String(a||"").trim().toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");return s==="INDUSTRIA"||s==="INDUSTRIAL"||s==="FABRICA"||s==="MANUFATURA"||s==="METALURGICA"||s==="PRODUCAO"||r.includes("INDUSTRIA")||r.includes("METALURGICA")||r.includes("FABRICACAO")||r.includes("MANUFATURA")||r.includes("USINAGEM")?"INDUSTRIA":s==="COMERCIO"||s==="COMERCIO / AUTOPECAS"||s==="LOJA"||s==="BALCAO"||s==="DISTRIBUIDORA"||r.includes("DISTRIBUIDORA")||r.includes("AUTO PECAS")||r.includes("AUTOPECAS")?"COMERCIO":s==="OFICINA_COMERCIO"||s==="OFICINA + COMERCIO"||s==="HIBRIDO"||s==="OFICINA_E_COMERCIO"||r.includes("OFICINA")&&(r.includes("COMERCIO")||r.includes("LOJA"))?"OFICINA_COMERCIO":s==="SERVICOS"||s==="SERVICO"?"SERVICOS":s==="OUTROS"||s==="OUTRO"?"OUTROS":"OFICINA"}`;

const idReplacement = `function Id(e,a){const s=String(e||"").trim().toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,""),r=String(a||"").trim().toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");return s==="INDUSTRIA"||s==="INDUSTRIAL"||s==="FABRICA"||s==="MANUFATURA"||s==="METALURGICA"||s==="PRODUCAO"||s.includes("INDUSTRIA")||s.includes("FABRIC")||s.includes("MANUFAT")||s.includes("METALURG")||s.includes("PRODUC")||s.includes("USINAGEM")||s.includes("PCP")||r.includes("INDUSTRIA")||r.includes("METALURGICA")||r.includes("FABRICACAO")||r.includes("MANUFATURA")||r.includes("USINAGEM")?"INDUSTRIA":s==="OFICINA_COMERCIO"||s==="OFICINA + COMERCIO"||s==="HIBRIDO"||s==="OFICINA_E_COMERCIO"||s==="OFICINA E COMERCIO"||(s.includes("OFICINA")&&s.includes("COMERC"))||(r.includes("OFICINA")&&(r.includes("COMERCIO")||r.includes("LOJA")))?"OFICINA_COMERCIO":s==="COMERCIO"||s==="COMERCIO / AUTOPECAS"||s==="LOJA"||s==="BALCAO"||s==="DISTRIBUIDORA"||s.includes("COMERC")||s.includes("AUTOPEC")||s.includes("DISTRIB")||s.includes("BALCAO")||r.includes("DISTRIBUIDORA")||r.includes("AUTO PECAS")||r.includes("AUTOPECAS")?"COMERCIO":s==="SERVICOS"||s==="SERVICO"?"SERVICOS":s==="OUTROS"||s==="OUTRO"?"OUTROS":"OFICINA"}`;

if (bundle.includes(idTarget)) {
  bundle = bundle.replace(idTarget, idReplacement);
  console.log('[1] Função Id atualizada com detecção de variações de Indústria e Híbrido!');
} else {
  console.log('[1] idTarget já atualizado ou não encontrado diretamente.');
}

// =========================================================================
// 2. CORREÇÃO DA RENDERIZAÇÃO DO MENU HIERÁRQUICO INDUSTRIAL:
// Deve renderizar EXCLUSIVAMENTE quando o segmento for INDUSTRIA ou OFICINA_COMERCIO
// =========================================================================
const indSideTarget = `((Te==="INDUSTRIA"||(we&&((we.modules&&we.modules.industry)||(we.globalModules&&we.globalModules.industry)||(we.contractModules&&we.contractModules.industry))))&&($e("accessProduction")||$e("industry")||(n&&n.permissions&&(n.permissions.accessProduction||n.permissions.industry||n.permissions.accessProductionPCP))||(n&&(n.role==="admin"||n.role==="qa"))))&&t.jsx(IndustrialHierarchicalSidebar`;

const indSideReplacement = `((Te==="INDUSTRIA"||Te==="OFICINA_COMERCIO")&&($e("accessProduction")||$e("industry")||(n&&n.permissions&&(n.permissions.accessProduction||n.permissions.industry||n.permissions.accessProductionPCP))||(n&&(n.role==="admin"||n.role==="qa"))))&&t.jsx(IndustrialHierarchicalSidebar`;

if (bundle.includes(indSideTarget)) {
  bundle = bundle.replace(indSideTarget, indSideReplacement);
  console.log('[2] IndustrialHierarchicalSidebar restrito estritamente a Indústria e Híbrido!');
} else {
  console.log('[2] indSideTarget já atualizado ou não encontrado diretamente.');
}

// =========================================================================
// 3. INCLUSÃO DO MÓDULO 12: FINANCEIRO / FISCAL DENTRO DE INDUSTRIAL_MODULES
// =========================================================================
const modRelatoriosEnd = `      { id: "cost_analysis", label: "Análise de Custos Industriais", perm: "accessPCP", tab: "cost_analysis" }\n    ]\n  }\n];`;

const modFinanceiroAddition = `      { id: "cost_analysis", label: "Análise de Custos Industriais", perm: "accessPCP", tab: "cost_analysis" }\n    ]\n  },\n  {\n    id: "ind_mod_financeiro",\n    dept: "financeiro_fiscal",\n    num: "12",\n    name: "Financeiro / Fiscal",\n    badge: "Controladoria",\n    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",\n    activeColor: "bg-emerald-600 text-white",\n    iconChar: "💰",\n    submenus: [\n      { id: "financial", label: "Caixa & DRE", perm: "accessFinancial", tab: "cash_flow" },\n      { id: "accounts_receivable", label: "Contas a Receber", perm: "accessAccountsReceivable", tab: "receivables" },\n      { id: "accounts_payable", label: "Contas a Pagar", perm: "accessAccountsPayable", tab: "payables" },\n      { id: "fiscal", label: "Fiscal, Boletos & SEFAZ", perm: "accessFiscal", tab: "fiscal_invoicing" },\n      { id: "fiscal_conference", label: "Fila de Conferência", perm: "accessFiscal", tab: "fiscal_conference" },\n      { id: "tax_obligations", label: "Obrigações & Guias Fiscais", perm: "accessFiscal", tab: "tax_guides" },\n      { id: "price_calculation", label: "Formação de Preço", perm: "accessFinancial", tab: "pricing" },\n      { id: "fiscal_xml_extraction", label: "Extração XML & SPED", perm: "accessFiscal", tab: "xml_sped" }\n    ]\n  }\n];`;

if (bundle.includes(modRelatoriosEnd) && !bundle.includes('id: "ind_mod_financeiro"')) {
  bundle = bundle.replace(modRelatoriosEnd, modFinanceiroAddition);
  console.log('[3] Módulo 12 (Financeiro / Fiscal) incluído com sucesso dentro de INDUSTRIAL_MODULES!');
} else {
  console.log('[3] Módulo 12 já presente ou modRelatoriosEnd não encontrado.');
}

// =========================================================================
// 4. ATUALIZAR ÍCONES EM MODULE_ICONS_MAP E SUBMENU_ICONS_MAP
// =========================================================================
const modIconsTarget = `ind_mod_bi: "📈"\n};`;
const modIconsReplacement = `ind_mod_bi: "📈",\n  ind_mod_relatorios: "📊",\n  ind_mod_financeiro: "💰"\n};`;

if (bundle.includes(modIconsTarget)) {
  bundle = bundle.replace(modIconsTarget, modIconsReplacement);
  console.log('[4] MODULE_ICONS_MAP atualizado com ind_mod_financeiro!');
}

const subIconsTarget = `cost_analysis: "💰"};`;
const subIconsReplacement = `cost_analysis: "💰",\n  financial: "📊",\n  accounts_receivable: "💰",\n  accounts_payable: "💳",\n  fiscal: "📑",\n  fiscal_conference: "📋",\n  tax_obligations: "🏛️",\n  price_calculation: "💲",\n  fiscal_xml_extraction: "📦"\n};`;

if (bundle.includes(subIconsTarget)) {
  bundle = bundle.replace(subIconsTarget, subIconsReplacement);
  console.log('[4] SUBMENU_ICONS_MAP atualizado com ícones financeiros!');
}

// =========================================================================
// 5. ATUALIZAR BADGE DE "11 Módulos" PARA "12 Módulos"
// =========================================================================
if (bundle.includes('children: "11 Módulos"')) {
  bundle = bundle.replace(/children:\s*"11 Módulos"/g, 'children: "12 Módulos"');
  console.log('[5] Badge do ERP atualizado de 11 para 12 Módulos!');
}

// =========================================================================
// 6. OCULTAR O SidebarTreeMenu FLUTUANTE/DESLOCADO NO SEGMENTO INDUSTRIA
// No segmento Indústria, o Financeiro fica integrado no menu normal (Módulo 12)
// No segmento Oficina e Comércio, o SidebarTreeMenu continua no lugar normal
// =========================================================================
const standaloneTreeMenuTarget = `($e("financial")||$e("accounts_receivable")||$e("accounts_payable")||$e("fiscal")||$e("fiscal_conference")||$e("tax_obligations"))&&t.jsx(SidebarTreeMenu,{id:"financial"`;
const standaloneTreeMenuReplacement = `(Te!=="INDUSTRIA")&&($e("financial")||$e("accounts_receivable")||$e("accounts_payable")||$e("fiscal")||$e("fiscal_conference")||$e("tax_obligations"))&&t.jsx(SidebarTreeMenu,{id:"financial"`;

if (bundle.includes(standaloneTreeMenuTarget)) {
  bundle = bundle.replace(standaloneTreeMenuTarget, standaloneTreeMenuReplacement);
  console.log('[6] SidebarTreeMenu flutuante oculto em Indústria (integrado como Módulo 12 no menu normal)!');
} else {
  console.log('[6] standaloneTreeMenuTarget já atualizado ou não encontrado.');
}

// =========================================================================
// 7. OCULTAR O BOTÃO DE DASHBOARD FORA DOS MENUS NO SEGMENTO INDÚSTRIA
// No segmento Indústria, ficam somente os 12 módulos existentes
// =========================================================================
const extDashboardTarget = `children:[$e("dashboard")&&t.jsx("button",{id:"menu-btn-dashboard",onClick:()=>Tt("dashboard"),title:Te==="INDUSTRIA"?"Dashboard Geral Industrial":"Dashboard KPI"`;
const extDashboardReplacement = `children:[(Te!=="INDUSTRIA")&&$e("dashboard")&&t.jsx("button",{id:"menu-btn-dashboard",onClick:()=>Tt("dashboard"),title:Te==="INDUSTRIA"?"Dashboard Geral Industrial":"Dashboard KPI"`;

if (bundle.includes(extDashboardTarget)) {
  bundle = bundle.replace(extDashboardTarget, extDashboardReplacement);
  console.log('[7] Dashboard externo fora dos menus removido com sucesso no segmento Indústria!');
} else {
  console.log('[7] extDashboardTarget já atualizado ou não encontrado diretamente.');
}

// =========================================================================
// 8. Salvar bundles public e dist e copiar scripts auxiliares
// =========================================================================
fs.writeFileSync(bundlePath, bundle, 'utf8');
if (fs.existsSync(distBundlePath)) {
  fs.writeFileSync(distBundlePath, bundle, 'utf8');
}

const contactFieldsSrc = path.resolve('public/enhanced-contact-fields.js');
const contactFieldsDist = path.resolve('dist/enhanced-contact-fields.js');
if (fs.existsSync(contactFieldsSrc)) {
  fs.copyFileSync(contactFieldsSrc, contactFieldsDist);
}

console.log('--- Todas as atualizações salvas com sucesso nos bundles ---');
