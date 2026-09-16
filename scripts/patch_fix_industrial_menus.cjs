const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const publicBundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");

console.log("=== INICIANDO PATCH COMPLETO DE MENUS INDUSTRIA E NAVEGAÇÃO ===");

let bundle = fs.readFileSync(publicBundlePath, "utf8");

// 1. ATUALIZAR INDUSTRIAL_MODULES COM TODOS OS SUBMENUS, DASHBOARDS E TABS CORRETAS
const pModStart = bundle.indexOf("const INDUSTRIAL_MODULES = [");
const pModEnd = bundle.indexOf("];", pModStart) + 2;

if (pModStart === -1 || pModEnd === -1) {
  console.error("ERRO: INDUSTRIAL_MODULES não encontrado no bundle!");
  process.exit(1);
}

const NEW_INDUSTRIAL_MODULES = `const INDUSTRIAL_MODULES = [
  {
    id: "ind_mod_comercial",
    dept: "comercial",
    num: "1",
    name: "Comercial",
    badge: "Vendas",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    activeColor: "bg-blue-600 text-white",
    iconChar: "💼",
    submenus: [
      { id: "ind_com_marketing", label: "Marketing / Prospecção", perm: "accessCommercial", tab: "dash_comercial" },
      { id: "clients", label: "Cadastro de Clientes", perm: "accessClients" },
      { id: "ind_com_orcamentos", label: "Orçamentos Fabris", perm: "accessBudgets", tab: "ind_com_orcamentos_tab" },
      { id: "ind_com_pedidos", label: "Pedidos de Venda", perm: "accessCommercial", tab: "ind_com_pedidos_tab" },
      { id: "ind_com_carteira", label: "Carteira de Pedidos", perm: "accessCommercial", tab: "ind_com_carteira_tab" },
      { id: "ind_com_posvenda", label: "Pós-Venda & SAC", perm: "accessCommercial", tab: "after_sales" }
    ]
  },
  {
    id: "ind_mod_engenharia",
    dept: "engenharia",
    num: "2",
    name: "Engenharia",
    badge: "SolidWorks",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    activeColor: "bg-cyan-600 text-white",
    iconChar: "📐",
    submenus: [
      { id: "ind_eng_dashboard", label: "Dashboard Engenharia & P&D", perm: "accessEngineering", tab: "dash_engenharia" },
      { id: "ind_eng_projetos", label: "Projetos Especiais", perm: "accessEngineering", tab: "special_projects" },
      { id: "ind_eng_produtos", label: "Desenvolvimento de Produtos", perm: "accessEngineering", tab: "item_master" },
      { id: "units_of_measure", label: "Unidades de Medida (UN/KG/M)", perm: "accessUnitsOfMeasure" },
      { id: "ind_eng_boms", label: "Estruturas de Produto (BOM)", perm: "accessBillOfMaterials", tab: "boms" },
      { id: "ind_eng_fichatecnica", label: "Ficha Técnica", perm: "accessEngineering", tab: "item_master" },
      { id: "ind_eng_solidworks", label: "Desenhos & CAD SolidWorks", perm: "accessCADSolidWorks", tab: "cad_solidworks_integrations" },
      { id: "ind_eng_revisoes", label: "Controle de Revisões", perm: "accessBillOfMaterials", tab: "boms" }
    ]
  },
  {
    id: "ind_mod_pcp",
    dept: "pcp_compras",
    num: "3",
    name: "PCP / Compras",
    badge: "MRP",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    activeColor: "bg-amber-600 text-white",
    iconChar: "📋",
    submenus: [
      { id: "ind_pcp_planejamento", label: "Planejamento da Produção", perm: "accessPCP", tab: "dash_pcp_compras" },
      { id: "ind_pcp_mrp", label: "Necessidades de Materiais (MRP)", perm: "accessMRP", tab: "purchasing_suggestions" },
      { id: "ind_pcp_solicitacoes", label: "Solicitações de Compra", perm: "accessIndustrialPurchasing", tab: "purchasing_suggestions" },
      { id: "quotations", label: "Cotações com Fornecedores", perm: "accessQuotations" },
      { id: "ind_pcp_compras", label: "Pedidos de Compra Fabris", perm: "accessIndustrialPurchasing", tab: "purchasing_suggestions" },
      { id: "ind_pcp_semaforo", label: "Acompanhamento & Semáforo", perm: "accessPCP", tab: "stock_traffic" },
      { id: "ind_pcp_recebimento", label: "Recebimento de Materiais", perm: "accessIndustrialPurchasing", tab: "stock_traffic" }
    ]
  },
  {
    id: "ind_mod_rh",
    dept: "rh",
    num: "4",
    name: "RH Operacional",
    badge: "Postos",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    activeColor: "bg-pink-600 text-white",
    iconChar: "👥",
    submenus: [
      { id: "ind_rh_dashboard", label: "Dashboard RH Fabril", perm: "accessIndustrialRH", tab: "dash_rh" },
      { id: "ind_rh_operadores", label: "Funcionários & Operadores", perm: "accessIndustrialRH", tab: "hr_operators" },
      { id: "ind_rh_postos", label: "Setores & Postos Fabris", perm: "accessIndustrialRH", tab: "hr_operators" },
      { id: "ind_rh_funcoes", label: "Funções & Competências", perm: "accessIndustrialRH", tab: "hr_operators" },
      { id: "ind_rh_turnos", label: "Turnos de Trabalho", perm: "accessIndustrialRH", tab: "hr_operators" },
      { id: "ind_rh_alocacao", label: "Alocação na Produção", perm: "accessIndustrialRH", tab: "hr_operators" }
    ]
  },
  {
    id: "ind_mod_producao",
    dept: "producao",
    num: "5",
    name: "Produção MES & WMS",
    badge: "Chão de Fábrica",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    activeColor: "bg-indigo-600 text-white",
    iconChar: "🏭",
    submenus: [
      { id: "ind_fab_dashboard", label: "Dashboard Produção MES", perm: "accessProductionOrders", tab: "dash_producao" },
      { id: "ind_almox_dash", label: "Dashboard Almoxarifado WMS", perm: "accessWarehouseLocations", tab: "dash_almoxarifado" },
      { id: "parts", label: "Almoxarifado: Estoque Físico", perm: "accessParts" },
      { id: "units_of_measure", label: "Almoxarifado: Unidades de Medida", perm: "accessUnitsOfMeasure" },
      { id: "ind_almox_wms", label: "Almoxarifado: Endereçamento WMS", perm: "accessWarehouseLocations", tab: "warehouse_locations" },
      { id: "ind_almox_movimentacoes", label: "Almoxarifado: Movimentações", perm: "accessIndustrialStock", tab: "warehouse_locations" },
      { id: "ind_almox_lotes", label: "Almoxarifado: Lotes & Validades", perm: "accessLots", tab: "lots" },
      { id: "ind_almox_separacao", label: "Almoxarifado: Separação (Picking)", perm: "accessMaterialSeparation", tab: "warehouse_locations" },
      { id: "ind_almox_etiquetas", label: "Almoxarifado: Etiquetas & QR", perm: "accessLabelGenerator", tab: "label_generator" },
      { id: "ind_fab_ops", label: "Fabricação: Ordens de Produção (OP)", perm: "accessProductionOrders", tab: "production_orders" },
      { id: "ind_fab_programacao", label: "Fabricação: Programação de Linhas", perm: "accessProductionOrders", tab: "dash_producao" },
      { id: "ind_fab_apontamentos", label: "Fabricação: Apontamentos (MES)", perm: "accessProductionFloor", tab: "production_floor" },
      { id: "ind_fab_consumo", label: "Fabricação: Consumo de Insumos", perm: "accessProductionFloor", tab: "production_floor" },
      { id: "ind_fab_refugo", label: "Fabricação: Refugos & Sucata", perm: "accessProductionFloor", tab: "production_floor" },
      { id: "ind_log_expedicao", label: "Expedição: Separação de Cargas", perm: "accessExpedition", tab: "production_orders" },
      { id: "ind_log_romaneios", label: "Expedição: Romaneios de Carga", perm: "accessExpedition", tab: "production_orders" },
      { id: "carriers", label: "Logística: Transportadoras & Fretes", perm: "accessCarriers" },
      { id: "ind_log_entregas", label: "Logística: Rastreio & Entregas", perm: "accessExpedition", tab: "client_installation" }
    ]
  },
  {
    id: "ind_mod_qualidade",
    dept: "qualidade",
    num: "6",
    name: "Qualidade & CQ",
    badge: "Laudos",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    activeColor: "bg-teal-600 text-white",
    iconChar: "🔬",
    submenus: [
      { id: "ind_cq_dashboard", label: "Dashboard Qualidade & CQ", perm: "accessQualityControl", tab: "dash_qualidade" },
      { id: "ind_cq_recebimento", label: "Inspeção de Recebimento", perm: "accessQualityControl", tab: "quality_control" },
      { id: "ind_cq_processo", label: "Inspeção de Processo", perm: "accessQualityControl", tab: "quality_control" },
      { id: "ind_cq_final", label: "Inspeção Final & Laudos", perm: "accessQualityControl", tab: "quality_control" },
      { id: "ind_cq_lotes", label: "Controle de Lotes Aprovados", perm: "accessLots", tab: "lots" },
      { id: "ind_cq_rnc", label: "Não Conformidades (RNC)", perm: "accessQualityControl", tab: "quality_control" },
      { id: "ind_cq_refugo", label: "Retrabalho & Descarte CQ", perm: "accessQualityControl", tab: "quality_control" },
      { id: "ind_cq_rastreabilidade", label: "Rastreabilidade Reversa", perm: "accessQualityControl", tab: "lots" }
    ]
  },
  {
    id: "ind_mod_manutencao",
    dept: "manutencao",
    num: "7",
    name: "Manutenção",
    badge: "Preventiva",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    activeColor: "bg-orange-600 text-white",
    iconChar: "🔧",
    submenus: [
      { id: "ind_manut_dashboard", label: "Dashboard Manutenção Fabril", perm: "accessMaintenance", tab: "dash_manutencao" },
      { id: "ind_manut_maquinas", label: "Equipamentos & Máquinas", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_preventiva", label: "Manutenção Preventiva", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_corretiva", label: "Manutenção Corretiva", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_ordens", label: "Ordens de Manutenção (OM)", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_planos", label: "Planos de Manutenção", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_pecas", label: "Peças Sobressalentes", perm: "accessMaintenance", tab: "equipment_maintenance" },
      { id: "ind_manut_historico", label: "Histórico & MTBF / MTTR", perm: "accessMaintenance", tab: "dash_manutencao" }
    ]
  },
  {
    id: "ind_mod_cliente",
    dept: "adm",
    num: "8",
    name: "Interface / Cliente",
    badge: "Portal",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    activeColor: "bg-sky-600 text-white",
    iconChar: "🌐",
    submenus: [
      { id: "ind_cli_portal", label: "Portal do Cliente", perm: "accessClientPortal", tab: "client_installation" },
      { id: "ind_cli_pedido", label: "Acompanhamento do Pedido", perm: "accessClientPortal", tab: "ind_com_pedidos_tab" },
      { id: "ind_cli_producao", label: "Status da Produção Fabril", perm: "accessClientPortal", tab: "client_installation" },
      { id: "ind_cli_docs", label: "Documentos & Certificados", perm: "accessClientPortal", tab: "client_installation" },
      { id: "ind_cli_entregas", label: "Agendamento de Entregas", perm: "accessClientPortal", tab: "client_installation" },
      { id: "ind_cli_posvenda", label: "Chamados de Pós-Venda", perm: "accessClientPortal", tab: "after_sales" }
    ]
  },
  {
    id: "ind_mod_fiscal",
    dept: "fiscal",
    num: "9",
    name: "Fiscal",
    badge: "SEFAZ",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    activeColor: "bg-purple-600 text-white",
    iconChar: "🧾",
    submenus: [
      { id: "fiscal", label: "Notas Fiscais (NF-e, NFS-e)", perm: "accessFiscal" },
      { id: "ind_fiscal_xml", label: "Importação de XML SEFAZ", perm: "accessFiscal" },
      { id: "fiscal_conference", label: "Fila de Conferência Fiscal", perm: "accessFiscal" },
      { id: "tax_obligations", label: "Obrigações & Guias Tributárias", perm: "accessFiscal" }
    ]
  },
  {
    id: "ind_mod_financeiro",
    dept: "adm",
    num: "10",
    name: "Financeiro / ADM",
    badge: "Custos",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    activeColor: "bg-emerald-600 text-white",
    iconChar: "💰",
    submenus: [
      { id: "accounts_payable", label: "Contas a Pagar", perm: "accessAccountsPayable" },
      { id: "accounts_receivable", label: "Contas a Receber", perm: "accessAccountsReceivable" },
      { id: "financial", label: "Fluxo de Caixa & DRE", perm: "accessFinancial" },
      { id: "ind_fin_custos", label: "Custos Industriais & Scrap", perm: "accessIndustrialCosts", tab: "cost_analysis" }
    ]
  },
  {
    id: "ind_mod_bi",
    dept: "adm",
    num: "11",
    name: "Gestão / BI",
    badge: "Executivo",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    activeColor: "bg-indigo-600 text-white",
    iconChar: "📈",
    submenus: [
      { id: "ind_bi_executivo", label: "Painel Executivo & OEE", perm: "accessIndustrialReports", tab: "pcp_dashboard" },
      { id: "ind_bi_kpis", label: "KPIs de Manufatura", perm: "accessIndustrialReports", tab: "pcp_dashboard" },
      { id: "ind_bi_produtividade", label: "Eficiência & Rendimento", perm: "accessIndustrialReports", tab: "pcp_dashboard" },
      { id: "ind_bi_relatorios", label: "Relatórios Consolidados", perm: "accessIndustrialReports", tab: "industrial_reports" }
    ]
  }
];`;

bundle = bundle.substring(0, pModStart) + NEW_INDUSTRIAL_MODULES + bundle.substring(pModEnd);
console.log("1. INDUSTRIAL_MODULES atualizado com sucesso!");

// 2. CORRIGIR CLIQUE NOS MÓDULOS NO IndustrialHierarchicalSidebar
const pSidebar = bundle.indexOf("function IndustrialHierarchicalSidebar(props)");
if (pSidebar === -1) {
  console.error("ERRO: IndustrialHierarchicalSidebar não encontrado!");
  process.exit(1);
}

// Localizar onClick do menu-mod
const pMenuMod = bundle.indexOf("id: `menu-mod-${mod.id}`", pSidebar);
const pOnClickOld = bundle.indexOf("onClick: () => {", pMenuMod);
const pOnClickEnd = bundle.indexOf("title: mod.name", pOnClickOld);

const newModuleOnClick = `onClick: () => {
                setOpenMods(prev => ({ ...prev, [mod.id]: true }));
                if (allowedSubs && allowedSubs.length > 0 && onNavigate) {
                  onNavigate(allowedSubs[0].id);
                }
              },
              `;

bundle = bundle.substring(0, pOnClickOld) + newModuleOnClick + bundle.substring(pOnClickEnd);
console.log("2. Clique nos cabeçalhos dos módulos industriais corrigido para navegar imediatamente!");

// Permitir recolher clicando no chevron sem navegar
const pChevron = bundle.indexOf("children: isOpen ? \"▾\" : \"▸\"", pMenuMod);
if (pChevron !== -1) {
  const pSpanBefore = bundle.lastIndexOf("t.jsx(\"span\",", pChevron);
  const pSpanEnd = bundle.indexOf("})", pChevron) + 2;
  const newChevronSpan = `t.jsx("span", {
                    className: "text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer",
                    onClick: (e) => {
                      e.stopPropagation();
                      toggleMod(mod.id);
                    },
                    children: isOpen ? "▾" : "▸"
                  })`;
  bundle = bundle.substring(0, pSpanBefore) + newChevronSpan + bundle.substring(pSpanEnd);
  console.log("3. Chevron de expansão/recolhimento isolado com toggleMod!");
}

// 3. ATUALIZAR MAPA DE ROTAS (zt) PARA ind_fiscal_xml NÃO SER ENGOLIDO POR fiscal
const oldZtEntry = 'ind_fiscal_xml:"fiscal"';
if (bundle.includes(oldZtEntry)) {
  bundle = bundle.replace(oldZtEntry, 'ind_fiscal_xml:"ind_fiscal_xml"');
  console.log("4. Rota ind_fiscal_xml desacoplada no normalizador de rotas!");
}

// 4. ATUALIZAR INVOCADOR DE XQe PARA SUPORTAR ind_fiscal_xml COM initialTab="xml_import"
const pFiscalRoute = bundle.indexOf('De==="fiscal"&&(n.permissions.accessFiscal??!0)');
if (pFiscalRoute !== -1) {
  bundle = bundle.substring(0, pFiscalRoute) +
    '(De==="fiscal"||De==="ind_fiscal_xml")&&(n.permissions.accessFiscal??!0)' +
    bundle.substring(pFiscalRoute + 'De==="fiscal"&&(n.permissions.accessFiscal??!0)'.length);
  
  // Inserir key: De e initialTab
  const pNewFiscalCall = bundle.indexOf("t.jsx(XQe,{", pFiscalRoute);
  bundle = bundle.substring(0, pNewFiscalCall + "t.jsx(XQe,{".length) +
    'key:De,initialTab:De==="ind_fiscal_xml"?"xml_import":"nfe",' +
    bundle.substring(pNewFiscalCall + "t.jsx(XQe,{".length);
  console.log("5. Roteamento de XQe para ind_fiscal_xml com initialTab=xml_import configurado!");
}

// 5. ATUALIZAR XQe PARA RECEBER initialTab
const pXqeFunc = bundle.indexOf("function XQe({");
if (pXqeFunc !== -1) {
  const pXqeState = bundle.indexOf('const[N,w]=b.useState("nfe")', pXqeFunc);
  if (pXqeState !== -1 && pXqeState - pXqeFunc < 800) {
    bundle = bundle.substring(0, pXqeFunc + "function XQe({".length) +
      "initialTab:xTab," +
      bundle.substring(pXqeFunc + "function XQe({".length);
    
    const pNewXqeState = bundle.indexOf('const[N,w]=b.useState("nfe")', pXqeFunc);
    bundle = bundle.substring(0, pNewXqeState) +
      'const[N,w]=b.useState(xTab||"nfe")' +
      bundle.substring(pNewXqeState + 'const[N,w]=b.useState("nfe")'.length);
    console.log("6. Componente XQe atualizado com initialTab!");
  }
}

// 6. ADICIONAR BARRA DE ABAS HORIZONTAIS INTERATIVAS NO TOPO DE TVe
const pTveMarker = bundle.indexOf("Navegação por submenus no menu lateral esquerdo");
if (pTveMarker !== -1) {
  const pHeaderIIFE = bundle.indexOf('children: "⭐ Rastrear Processo (Comercial ao Pós-Venda)"', pTveMarker);
  const pInsertAfter = bundle.indexOf("})(),", pHeaderIIFE) + 4; // após `})()` mas antes de `,`

  const horizontalTabsCode = `,(()=>{
        const currentMod = INDUSTRIAL_MODULES.find(mod => mod.dept === c || (mod.submenus && mod.submenus.some(s => s.tab === m)));
        const availableTabs = currentMod ? currentMod.submenus.filter(s => !!s.tab) : [];
        if (availableTabs.length <= 1) return null;
        return t.jsx("div", {
          className: "bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs mb-4",
          children: availableTabs.map(sub => {
            const isActive = m === sub.tab;
            return t.jsx("button", {
              key: sub.id,
              type: "button",
              onClick: () => p(sub.tab),
              className: "px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 " + (isActive ? "bg-indigo-600 text-white shadow-xs" : "bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200/80"),
              children: sub.label
            });
          })
        });
      })()`;

  bundle = bundle.substring(0, pInsertAfter) + horizontalTabsCode + bundle.substring(pInsertAfter);
  console.log("7. Barra de sub-abas horizontais interativas injetada em TVe!");
}

// 7. SINCRONIZAR SESSÃO NO LOGIN IMEDIATAMENTE VIA EXPRESSÃO VÁLIDA
const targetLogin = 'localStorage.setItem("motordesk_active_user",JSON.stringify(Se)),';
if (bundle.includes(targetLogin)) {
  const syncExpr = 'localStorage.setItem("motordesk_active_user",JSON.stringify(Se)),(typeof window!=="undefined"&&window.__motordesk_register_session&&window.__motordesk_register_session(!1)),';
  bundle = bundle.replace(targetLogin, syncExpr);
  console.log("8. Chamada imediata de registro de sessão concorrente injetada no login!");
}

// 8. VALIDAR SINTAXE DO BUNDLE GERADO ANTES DE SALVAR
console.log("Validando sintaxe JS com esbuild...");
try {
  esbuild.transformSync(bundle, { loader: "js" });
  console.log("SINTAXE ESBUILD APROVADA COM SUCESSO!");
} catch (err) {
  console.error("ERRO DE SINTAXE APÓS O PATCH:", err);
  process.exit(1);
}

// Gravar alterações no public e no dist
fs.writeFileSync(publicBundlePath, bundle, "utf8");
fs.writeFileSync(distBundlePath, bundle, "utf8");

console.log("=== SUCESSO COMPLETO! BUNDLES PUBLIC E DIST ATUALIZADOS E VALIDADOS! ===");
