const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");

let bundle = fs.readFileSync(bundlePath, "utf8");
console.log("=== INICIANDO PATCH INDUSTRIAL COMPLETO COM HIERARQUIA & RBAC ===");

// 1. Injetar componentes auxiliares e dados da Hierarquia Industrial antes de TVe
const tveMarker = "function TVe({db:e,currentUser:a,currentCompany:s={id:\"comp";
if (!bundle.includes(tveMarker)) {
  console.error("ERRO: tveMarker não encontrado!");
  process.exit(1);
}

const helperCode = `
// --- INÍCIO HIERARQUIA INDUSTRIAL & RBAC MOTOR DESK ---
const INDUSTRIAL_MODULES = [
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
      { id: "ind_com_orcamentos", label: "Orçamentos Fabris", perm: "accessBudgets", tab: "commercial" },
      { id: "ind_com_pedidos", label: "Pedidos de Venda", perm: "accessCommercial", tab: "commercial" },
      { id: "ind_com_carteira", label: "Carteira de Pedidos", perm: "accessCommercial", tab: "commercial" },
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
      { id: "ind_eng_projetos", label: "Projetos Especiais", perm: "accessEngineering", tab: "special_projects" },
      { id: "ind_eng_produtos", label: "Desenvolvimento de Produtos", perm: "accessEngineering", tab: "item_master" },
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
      // Almoxarifado
      { id: "parts", label: "Almoxarifado: Estoque Físico", perm: "accessParts" },
      { id: "ind_almox_wms", label: "Almoxarifado: Endereçamento WMS", perm: "accessWarehouseLocations", tab: "warehouse_locations" },
      { id: "ind_almox_movimentacoes", label: "Almoxarifado: Movimentações", perm: "accessIndustrialStock", tab: "warehouse_locations" },
      { id: "ind_almox_lotes", label: "Almoxarifado: Lotes & Validades", perm: "accessLots", tab: "lots" },
      { id: "ind_almox_separacao", label: "Almoxarifado: Separação (Picking)", perm: "accessMaterialSeparation", tab: "warehouse_locations" },
      { id: "ind_almox_etiquetas", label: "Almoxarifado: Etiquetas & QR", perm: "accessLabelGenerator", tab: "label_generator" },
      // Fabricação
      { id: "ind_fab_ops", label: "Fabricação: Ordens de Produção (OP)", perm: "accessProductionOrders", tab: "production_orders" },
      { id: "ind_fab_programacao", label: "Fabricação: Programação de Linhas", perm: "accessProductionOrders", tab: "dash_producao" },
      { id: "ind_fab_apontamentos", label: "Fabricação: Apontamentos (MES)", perm: "accessProductionFloor", tab: "production_floor" },
      { id: "ind_fab_consumo", label: "Fabricação: Consumo de Insumos", perm: "accessProductionFloor", tab: "production_floor" },
      { id: "ind_fab_refugo", label: "Fabricação: Refugos & Sucata", perm: "accessProductionFloor", tab: "production_floor" },
      // Logística & Expedição
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
      { id: "ind_cli_pedido", label: "Acompanhamento do Pedido", perm: "accessClientPortal", tab: "commercial" },
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
];

function renderIndustrialProcessTracker({ onNavigate, currentUser, db }) {
  const [selectedOrder, setSelectedOrder] = b.useState("OP-2026-00450");
  const orders = [
    {
      id: "OP-2026-00450",
      client: "InoxBrasil Indústria & Comércio S.A.",
      item: "Misturador Industrial 500L Inox 316L",
      value: "R$ 148.500,00",
      progress: 78,
      status: "Em Produção / Usinagem CNC",
      deliveryDate: "28/10/2026",
      stages: [
        { num: 1, name: "1. Prospecção & Cliente", sector: "Comercial", status: "completed", date: "02/10 09:30", user: "Carlos Vendas", doc: "CLI-0492 - Aprovado", route: "clients" },
        { num: 2, name: "2. Orçamento Aprovado", sector: "Comercial", status: "completed", date: "04/10 14:15", user: "Mariana Orçamentos", doc: "ORC-2026/892 - R$ 148.500", route: "ind_com_orcamentos" },
        { num: 3, name: "3. Projeto SolidWorks & BOM", sector: "Engenharia", status: "completed", date: "07/10 11:00", user: "Eng. Rafael P.", doc: "BOM-MST-500L (Rev 03) + CAD 3D", route: "ind_eng_boms" },
        { num: 4, name: "4. Planejamento PCP", sector: "PCP", status: "completed", date: "08/10 16:45", user: "Juliana PCP", doc: "OP-2026-00450 programada", route: "ind_pcp_planejamento" },
        { num: 5, name: "5. Compras MRP", sector: "Suprimentos", status: "completed", date: "11/10 10:20", user: "Marcos Compras", doc: "PC-8841 (Chapas 316L e Mancais)", route: "ind_pcp_compras" },
        { num: 6, name: "6. Almoxarifado / Separação", sector: "Almoxarifado", status: "completed", date: "14/10 08:30", user: "Pedro Almoxarife", doc: "Picking Rua B-04 / Lote INOX-99", route: "ind_almox_wms" },
        { num: 7, name: "7. Fabricação MES (Chão de Fábrica)", sector: "Produção", status: "in_progress", date: "Em andamento", user: "Linha CNC 02 (Operador Tiago)", doc: "78% concluído - OEE 89%", route: "ind_fab_apontamentos" },
        { num: 8, name: "8. Inspeção CQ & Ensaio", sector: "Qualidade", status: "pending", date: "Previsto 22/10", user: "Resp: CQ Central", doc: "Ensaio Hidrostático e Dimensional", route: "ind_cq_recebimento" },
        { num: 9, name: "9. Produto Acabado & Etiqueta", sector: "Almoxarifado", status: "pending", date: "Previsto 24/10", user: "Almoxarifado Expedição", doc: "QR Code e Número de Série", route: "ind_almox_etiquetas" },
        { num: 10, name: "10. Faturamento NF-e SEFAZ", sector: "Fiscal", status: "pending", date: "Previsto 25/10", user: "Depto Fiscal", doc: "NF-e Danfe Eletrônica", route: "fiscal" },
        { num: 11, name: "11. Expedição & Romaneio", sector: "Logística", status: "pending", date: "Previsto 26/10", user: "Logística Fábrica", doc: "Romaneio e Conferência de Carga", route: "ind_log_expedicao" },
        { num: 12, name: "12. Transporte & Entrega", sector: "Transporte", status: "pending", date: "Previsto 28/10", user: "Transportadora Rodonaves", doc: "CT-e e Canhoto Digital", route: "carriers" },
        { num: 13, name: "13. Faturamento & Recebimento", sector: "Financeiro", status: "pending", date: "Venc: 28/11", user: "Financeiro ADM", doc: "Boleto 30 DDL", route: "accounts_receivable" },
        { num: 14, name: "14. Pós-Venda & Garantia", sector: "Atendimento", status: "pending", date: "Contínuo", user: "Suporte Técnico", doc: "Garantia 12 Meses Ativa", route: "ind_com_posvenda" }
      ]
    },
    {
      id: "OP-2026-00451",
      client: "VibraTech Motores & Redutores",
      item: "Eixo Usinado Tratado Termicamente Ø80mm",
      value: "R$ 42.800,00",
      progress: 100,
      status: "Entregue / Faturado",
      deliveryDate: "15/10/2026",
      stages: []
    }
  ];

  const curr = orders.find(o => o.id === selectedOrder) || orders[0];

  return t.jsxs("div", {
    className: "space-y-6 animate-fade-in",
    children: [
      t.jsxs("div", {
        className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4",
        children: [
          t.jsxs("div", {
            className: "flex items-start gap-4",
            children: [
              t.jsx("div", {
                className: "w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl text-amber-300 shrink-0",
                children: "🔎"
              }),
              t.jsxs("div", {
                children: [
                  t.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      t.jsx("h1", { className: "text-xl font-bold tracking-tight", children: "Rastrear Processo Industrial Ponta a Ponta" }),
                      t.jsx("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30", children: "Fluxo Contínuo 14 Etapas" })
                    ]
                  }),
                  t.jsx("p", {
                    className: "text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed",
                    children: "Acompanhe a trajetória completa do produto em tempo real: desde o contato comercial, passando por SolidWorks CAD, PCP, Compras, Almoxarifado, Chão de Fábrica (MES), CQ até a expedição, fiscal e pós-venda."
                  })
                ]
              })
            ]
          }),
          t.jsxs("div", {
            className: "flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/80",
            children: [
              t.jsx("span", { className: "text-xs text-slate-400 font-semibold pl-1", children: "Ordem:" }),
              t.jsx("select", {
                value: selectedOrder,
                onChange: (e) => setSelectedOrder(e.target.value),
                className: "bg-slate-900 text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                children: orders.map(o => t.jsx("option", { key: o.id, value: o.id, children: \`\${o.id} - \${o.item}\` }))
              })
            ]
          })
        ]
      }),
      t.jsxs("div", {
        className: "bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4",
        children: [
          t.jsxs("div", {
            children: [
              t.jsx("span", { className: "text-[11px] text-slate-400 font-medium uppercase tracking-wider", children: "Cliente Destino" }),
              t.jsx("p", { className: "text-sm font-bold text-slate-800 mt-0.5 truncate", children: curr.client })
            ]
          }),
          t.jsxs("div", {
            children: [
              t.jsx("span", { className: "text-[11px] text-slate-400 font-medium uppercase tracking-wider", children: "Produto Fabricado" }),
              t.jsx("p", { className: "text-sm font-bold text-slate-800 mt-0.5 truncate", children: curr.item })
            ]
          }),
          t.jsxs("div", {
            children: [
              t.jsx("span", { className: "text-[11px] text-slate-400 font-medium uppercase tracking-wider", children: "Valor Comercial" }),
              t.jsx("p", { className: "text-sm font-bold text-emerald-600 mt-0.5", children: curr.value })
            ]
          }),
          t.jsxs("div", {
            children: [
              t.jsx("span", { className: "text-[11px] text-slate-400 font-medium uppercase tracking-wider", children: "Previsão de Entrega" }),
              t.jsx("p", { className: "text-sm font-bold text-indigo-600 mt-0.5", children: curr.deliveryDate })
            ]
          }),
          t.jsxs("div", {
            children: [
              t.jsxs("div", {
                className: "flex items-center justify-between text-[11px] text-slate-400 font-medium uppercase tracking-wider",
                children: [t.jsx("span", { children: "Progresso Geral" }), t.jsx("span", { className: "font-bold text-indigo-600", children: \`\${curr.progress}%\` })]
              }),
              t.jsx("div", {
                className: "w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden",
                children: t.jsx("div", { className: "bg-indigo-600 h-full rounded-full transition-all duration-500", style: { width: \`\${curr.progress}%\` } })
              })
            ]
          })
        ]
      }),
      t.jsxs("div", {
        className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4",
        children: [
          t.jsxs("div", {
            className: "flex items-center justify-between border-b border-slate-100 pb-3",
            children: [
              t.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  t.jsx("h2", { className: "text-base font-bold text-slate-800", children: "Esteira de Rastreabilidade Operacional (14 Etapas)" }),
                  t.jsx("span", { className: "px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-600", children: "Clique na etapa para abrir a tela" })
                ]
              }),
              t.jsxs("div", {
                className: "flex items-center gap-3 text-xs",
                children: [
                  t.jsxs("span", { className: "flex items-center gap-1 text-emerald-600 font-bold", children: [t.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }), "Concluído"] }),
                  t.jsxs("span", { className: "flex items-center gap-1 text-indigo-600 font-bold", children: [t.jsx("span", { className: "w-2 h-2 rounded-full bg-indigo-500 animate-pulse" }), "Em Andamento"] }),
                  t.jsxs("span", { className: "flex items-center gap-1 text-slate-400 font-medium", children: [t.jsx("span", { className: "w-2 h-2 rounded-full bg-slate-300" }), "Pendente"] })
                ]
              })
            ]
          }),
          t.jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3.5",
            children: (curr.stages || []).map((st) => {
              const isDone = st.status === "completed";
              const isCurrent = st.status === "in_progress";
              return t.jsxs("div", {
                key: st.num,
                className: \`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 \${isDone ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300" : isCurrent ? "bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs" : "bg-slate-50/60 border-slate-200 opacity-75"}\`,
                children: [
                  t.jsxs("div", {
                    className: "flex items-start gap-3 min-w-0",
                    children: [
                      t.jsx("div", {
                        className: \`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 \${isDone ? "bg-emerald-600 text-white shadow-xs" : isCurrent ? "bg-indigo-600 text-white shadow-xs animate-bounce" : "bg-slate-200 text-slate-600"}\`,
                        children: isDone ? "✓" : st.num
                      }),
                      t.jsxs("div", {
                        className: "min-w-0",
                        children: [
                          t.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              t.jsx("h3", { className: "text-xs font-bold text-slate-800", children: st.name }),
                              t.jsx("span", { className: "text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-200/80 text-slate-700", children: st.sector })
                            ]
                          }),
                          t.jsx("p", { className: "text-[11px] font-semibold text-slate-600 mt-1 truncate", children: st.doc }),
                          t.jsxs("p", { className: "text-[10px] text-slate-400 mt-0.5", children: [st.user, " • ", st.date] })
                        ]
                      })
                    ]
                  }),
                  t.jsx("button", {
                    type: "button",
                    onClick: () => onNavigate && onNavigate(st.route),
                    className: \`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer \${isDone ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800" : isCurrent ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs" : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"}\`,
                    children: "Abrir Tela →"
                  })
                ]
              });
            })
          })
        ]
      })
    ]
  });
}
// --- FIM HIERARQUIA INDUSTRIAL & RBAC MOTOR DESK ---
`;

bundle = bundle.replace(tveMarker, helperCode + tveMarker);
console.log("1. Helpers da Hierarquia e Rastrear Processo injetados!");

// 2. Substituição da Seção Industrial no Menu Lateral
const oldSidebarStart = `$e("industry")&&t.jsxs("div",{className:"pt-2 pb-1 space-y-0.5 border-t border-slate-800/80 my-1"`;
const pSidebarStart = bundle.indexOf(oldSidebarStart);
if (pSidebarStart === -1) {
  console.error("ERRO: oldSidebarStart não encontrado!");
  process.exit(1);
}

const historyMarker = `$e("history")&&t.jsx("button",{id:"me`;
const pHistory = bundle.indexOf(historyMarker, pSidebarStart);
if (pHistory === -1) {
  console.error("ERRO: historyMarker não encontrado!");
  process.exit(1);
}

const newHierarchicalSidebar = `(()=>{
  const activeRoute = De || "";
  const [openMods, setOpenMods] = b.useState(()=>{
    const initial = {};
    INDUSTRIAL_MODULES.forEach(mod => {
      const hasActive = mod.submenus.some(s => s.id === activeRoute);
      initial[mod.id] = hasActive || mod.id === "ind_mod_comercial" || mod.id === "ind_mod_engenharia" || mod.id === "ind_mod_producao";
    });
    return initial;
  });

  const toggleMod = (modId) => {
    setOpenMods(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  return t.jsxs("div",{
    className: "pt-2 pb-1 space-y-1 border-t border-slate-800/80 my-1",
    children: [
      (!le || Ue) && t.jsxs("div", {
        className: "px-3 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500",
        children: [
          t.jsx("span", { children: "ERP / MES Industrial" }),
          t.jsx("span", { className: "px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 text-[9px] font-mono", children: "11 Módulos" })
        ]
      }),

      t.jsx("button", {
        id: "menu-btn-rastrear-processo",
        type: "button",
        onClick: () => Tt("ind_rastrear_processo"),
        title: "Rastrear Processo Ponta a Ponta",
        className: \`w-full flex items-center \${!le || Ue ? "justify-between px-3" : "justify-center px-2"} py-2 rounded-lg text-xs font-bold tracking-wide transition shadow-xs cursor-pointer \${De === "ind_rastrear_processo" ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"}\`,
        children: t.jsxs("div", {
          className: "flex items-center gap-2 min-w-0",
          children: [
            t.jsx("span", { className: "text-sm shrink-0", children: "⭐" }),
            (!le || Ue) && t.jsx("span", { className: "truncate", children: "Rastrear Processo" }),
            (!le || Ue) && t.jsx("span", { className: "text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-200 font-mono shrink-0 ml-auto", children: "FLUXO" })
          ]
        })
      }),

      INDUSTRIAL_MODULES.map(mod => {
        const allowedSubs = mod.submenus.filter(sub => !sub.perm || $e(sub.perm));
        if (allowedSubs.length === 0) return null;

        const isOpen = !!openMods[mod.id];
        const isAnySubActive = allowedSubs.some(s => s.id === De);

        return t.jsxs("div", {
          key: mod.id,
          className: "space-y-0.5",
          children: [
            t.jsxs("button", {
              id: \`menu-mod-\${mod.id}\`,
              type: "button",
              onClick: () => {
                if (le && !Ue) {
                  Tt(allowedSubs[0].id);
                } else {
                  toggleMod(mod.id);
                }
              },
              title: mod.name,
              className: \`w-full flex items-center \${!le || Ue ? "justify-between px-2.5" : "justify-center px-2"} py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer \${isAnySubActive ? "bg-slate-800/90 text-white font-bold" : "hover:bg-slate-800/60 text-slate-300 hover:text-slate-100"}\`,
              children: [
                t.jsxs("div", {
                  className: "flex items-center gap-2 min-w-0",
                  children: [
                    t.jsx("span", { className: \`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border \${mod.color}\`, children: mod.num }),
                    (!le || Ue) && t.jsx("span", { className: "truncate text-xs font-semibold", children: mod.name })
                  ]
                }),
                (!le || Ue) && t.jsxs("div", {
                  className: "flex items-center gap-1.5 shrink-0",
                  children: [
                    t.jsx("span", { className: "text-[9px] px-1 py-0.2 rounded font-mono bg-slate-800/80 text-slate-400", children: allowedSubs.length }),
                    t.jsx("span", { className: "text-[10px] text-slate-400", children: isOpen ? "▾" : "▸" })
                  ]
                })
              ]
            }),

            isOpen && (!le || Ue) && t.jsx("div", {
              className: "pl-5 pr-1 py-0.5 space-y-0.5 border-l-2 border-slate-800 ml-3.5 my-0.5",
              children: allowedSubs.map(sub => {
                const isSubActive = De === sub.id;
                return t.jsxs("button", {
                  key: sub.id,
                  id: \`submenu-btn-\${sub.id}\`,
                  type: "button",
                  onClick: () => Tt(sub.id),
                  className: \`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center justify-between gap-1.5 cursor-pointer \${isSubActive ? \`\${mod.activeColor} font-bold shadow-xs\` : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"}\`,
                  children: [
                    t.jsx("span", { className: "truncate", children: sub.label }),
                    isSubActive && t.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-white shrink-0" })
                  ]
                });
              })
            })
          ]
        });
      })
    ]
  });
})(),`;

bundle = bundle.substring(0, pSidebarStart) + newHierarchicalSidebar + bundle.substring(pHistory);
console.log("2. Menu lateral substituído com sucesso!");

// 3. Atualizar roteador principal em KKe
const oldRouterMarker = `(De==="industry"||(typeof De==="string"&&De.startsWith("ind_")))&&`;
const pRouter = bundle.indexOf(oldRouterMarker);
if (pRouter === -1) {
  console.error("ERRO: oldRouterMarker não encontrado!");
  process.exit(1);
}
const pRouterEnd = bundle.indexOf(":t.jsx(TVe,{key:De", pRouter);
const pRouterFullEnd = bundle.indexOf("}))", pRouterEnd) + 3;

const newRouterCode = `(De==="industry"||(typeof De==="string"&&(De.startsWith("ind_")||De==="ind_rastrear_processo")))&&(n.role==="admin"||$e(zre[De]||"accessProduction")||!!n.permissions.accessProduction||!!n.permissions.accessIndustrialDashboard||!!n.permissions.accessWarehouseLocations||!!n.permissions.accessParts||!!n.permissions.accessEngineering||!!n.permissions.accessCommercial||!!n.permissions.accessQualityControl||!!n.permissions.accessMaintenance)&&(qt("accessProduction")?va():t.jsx(TVe,{key:De,db:pt,currentUser:n,currentCompany:ot||e.companyInfo,currentRoute:De,initialDepartment:(()=>{const found=INDUSTRIAL_MODULES.find(m=>m.submenus.some(s=>s.id===De));if(found)return found.dept;if(De==="ind_rastrear_processo")return"rastrear_processo";return"engenharia"})(),initialTab:(()=>{for(const m of INDUSTRIAL_MODULES){const s=m.submenus.find(sub=>sub.id===De);if(s&&s.tab)return s.tab}if(De==="ind_rastrear_processo")return"trace_process";return"boms"})(),onUpdateDb:nt,onAddHistoryLog:$t,onNavigateToView:Tt}))`;

bundle = bundle.substring(0, pRouter) + newRouterCode + bundle.substring(pRouterFullEnd);
console.log("3. Roteador em KKe atualizado!");

// 4. Substituição LIMPA da IIFE de abas em TVe
const pIndMap = bundle.indexOf("indSections.map");
const pIife = bundle.lastIndexOf("(()=>{", pIndMap);
const pSub = bundle.indexOf("currentSec.subtabs.map");
const pEnd = bundle.indexOf("})()", pSub) + 4;

const newTveHeader = `(()=>{
  return t.jsxs("div", {
    className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3",
    children: [
      t.jsxs("div", {
        className: "flex items-center gap-3",
        children: [
          t.jsx("div", {
            className: "w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs",
            children: "🏭"
          }),
          t.jsxs("div", {
            children: [
              t.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  t.jsx("span", { className: "text-xs font-bold text-slate-400", children: "Indústria" }),
                  t.jsx("span", { className: "text-slate-300 text-xs", children: "/" }),
                  t.jsx("span", { className: "text-xs font-bold text-slate-700", children: (INDUSTRIAL_MODULES.find(mod=>mod.submenus.some(sub=>sub.tab===m||sub.id===m))?.name || "Operações") }),
                  t.jsx("span", { className: "text-slate-300 text-xs", children: "/" }),
                  t.jsx("span", { className: "text-xs font-extrabold text-indigo-600", children: (()=>{for(const mod of INDUSTRIAL_MODULES){const s=mod.submenus.find(sub=>sub.tab===m||sub.id===m);if(s)return s.label}return "Painel Operacional"})() })
                ]
              }),
              t.jsxs("div", {
                className: "flex items-center gap-2 mt-0.5",
                children: [
                  t.jsx("span", { className: "text-[11px] text-slate-500", children: "Navegação por submenus no menu lateral esquerdo" }),
                  t.jsxs("span", { className: "text-[10px] px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold", children: ["Perfil: ", a?.role || "Operador Industrial"] })
                ]
              })
            ]
          })
        ]
      }),
      t.jsxs("div", {
        className: "flex items-center gap-2",
        children: [
          t.jsx("button", {
            type: "button",
            onClick: () => l && l("ind_rastrear_processo"),
            className: "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-xs flex items-center gap-1.5 cursor-pointer",
            children: "⭐ Rastrear Processo (Comercial ao Pós-Venda)"
          })
        ]
      })
    ]
  });
})()`;

bundle = bundle.substring(0, pIife) + newTveHeader + bundle.substring(pEnd);
console.log("4. IIFE de abas internas substituída pelo Breadcrumb Executivo!");

// 5. Adicionar trace_process no switch de TVe
const tveSwitchMarker = `switch(m){case"dash_producao":`;
if (bundle.includes(tveSwitchMarker)) {
  const newSwitchCase = `switch(m){case"trace_process":return renderIndustrialProcessTracker({onNavigate:l,currentUser:a,db:e});case"dash_producao":`;
  bundle = bundle.replace(tveSwitchMarker, newSwitchCase);
  console.log("5. Visualizador de Rastrear Processo integrado ao switch de TVe!");
}

// 6. Validar com esbuild
try {
  console.log("Validando bundle com esbuild...");
  esbuild.transformSync(bundle, { loader: "js" });
  console.log("=========================================");
  console.log("ESBUILD: SUCESSO TOTAL! 0 ERROS DE SINTAXE!");
  console.log("=========================================");
  fs.writeFileSync(bundlePath, bundle, "utf8");
  fs.writeFileSync(distBundlePath, bundle, "utf8");
  console.log("Bundle salvo em public/ e dist/!");
} catch (err) {
  console.error("ERRO ESBUILD:", err.message);
  process.exit(1);
}
