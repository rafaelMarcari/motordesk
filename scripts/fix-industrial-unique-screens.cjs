const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function applyFixes() {
  console.log('--- Aplicando telas exclusivas para cada submenu do Segmento Indústria ---');

  const bundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
  const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

  let bundle = fs.readFileSync(bundlePath, 'utf8');

  // =========================================================================
  // 1. COMPILAR OS COMPONENTES EXCLUSIVOS COM ESBUILD USANDO SHIM DO REACT
  // =========================================================================
  console.log('Compilando src/components/IndustrialUniqueViews.tsx com esbuild...');
  const reactPlugin = {
    name: 'react-shim',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, args => ({ path: 'react', namespace: 'react-ns' }));
      build.onLoad({ filter: /.*/, namespace: 'react-ns' }, () => ({
        contents: `
          export const React = window.ReactInstance;
          export const useState = (...args) => window.ReactInstance.useState(...args);
          export const useMemo = (...args) => window.ReactInstance.useMemo(...args);
          export const useEffect = (...args) => window.ReactInstance.useEffect(...args);
          export const useRef = (...args) => window.ReactInstance.useRef(...args);
          export default window.ReactInstance;
        `,
        loader: 'js'
      }));
    }
  };

  const compiled = await esbuild.build({
    entryPoints: ['src/components/IndustrialUniqueViews.tsx'],
    bundle: true,
    format: 'iife',
    globalName: 'indHub',
    plugins: [reactPlugin],
    write: false,
    minify: false,
    jsx: 'transform',
    jsxFactory: 'window.ReactInstance.createElement',
    jsxFragment: 'window.ReactInstance.Fragment'
  });

  const compiledJs = compiled.outputFiles[0].text;
  console.log('Componentes industriais compilados com sucesso! Tamanho:', compiledJs.length, 'bytes');

  // =========================================================================
  // 2. ATUALIZAR OS TABS EM INDUSTRIAL_MODULES
  // =========================================================================
  bundle = bundle.replace(
    '{ id: "ind_pcp_solicitacoes", label: "Solicitações de Compra", perm: "accessIndustrialPurchasing", tab: "purchasing_suggestions" }',
    '{ id: "ind_pcp_solicitacoes", label: "Solicitações de Compra", perm: "accessIndustrialPurchasing", tab: "purchase_requisitions" }'
  );

  bundle = bundle.replace(
    '{ id: "quotations", label: "Cotações com Fornecedores", perm: "accessQuotations", tab: "purchasing_suggestions" }',
    '{ id: "quotations", label: "Cotações com Fornecedores", perm: "accessQuotations", tab: "quotations" }'
  );

  bundle = bundle.replace(
    '{ id: "ind_pcp_compras", label: "Pedidos de Compra Fabris", perm: "accessIndustrialPurchasing", tab: "purchasing_suggestions" }',
    '{ id: "ind_pcp_compras", label: "Pedidos de Compra Fabris", perm: "accessIndustrialPurchasing", tab: "purchase_orders" }'
  );

  bundle = bundle.replace(
    '{ id: "ind_pcp_recebimento", label: "Recebimento de Materiais", perm: "accessIndustrialPurchasing", tab: "stock_traffic" }',
    '{ id: "ind_pcp_recebimento", label: "Recebimento de Materiais", perm: "accessIndustrialPurchasing", tab: "material_receiving" }'
  );

  bundle = bundle.replace(
    '{ id: "ind_rh_produtividade", label: "Horas Trabalhadas & OEE", perm: "accessHROperators", tab: "cost_analysis" }',
    '{ id: "ind_rh_produtividade", label: "Horas Trabalhadas & OEE", perm: "accessHROperators", tab: "rh_productivity_oee" }'
  );

  bundle = bundle.replace(
    '{ id: "categories", label: "Famílias de Materiais", perm: "accessParts", tab: "item_master" }',
    '{ id: "categories", label: "Famílias de Materiais", perm: "accessParts", tab: "categories" }'
  );

  bundle = bundle.replace(
    '{ id: "suppliers", label: "Fornecedores Homologados", perm: "accessSuppliers", tab: "purchasing_suggestions" }',
    '{ id: "suppliers", label: "Fornecedores Homologados", perm: "accessSuppliers", tab: "suppliers" }'
  );

  bundle = bundle.replace(
    '{ id: "ind_almox_mov", label: "Transferência Entre Posições", perm: "accessWMSLocations", tab: "warehouse_locations" }',
    '{ id: "ind_almox_mov", label: "Transferência Entre Posições", perm: "accessWMSLocations", tab: "warehouse_transfers" }'
  );

  bundle = bundle.replace(
    '{ id: "withdrawals", label: "Retiradas & Entregas WMS", perm: "accessIndustrialDelivery", tab: "warehouse_locations" }',
    '{ id: "withdrawals", label: "Retiradas & Entregas WMS", perm: "accessIndustrialDelivery", tab: "withdrawals" }'
  );

  // =========================================================================
  // 3. INJETAR O MÓDULO indHub ANTES DA FUNÇÃO TVe
  // =========================================================================
  const tveTarget = 'function TVe({db:e,currentUser:a';
  if (bundle.includes(tveTarget)) {
    if (!bundle.includes('var indHub =')) {
      bundle = bundle.replace(tveTarget, compiledJs + '\n\n' + tveTarget);
      console.log('Módulo indHub injetado antes da função TVe com sucesso!');
    } else {
      console.log('Módulo indHub já presente no bundle.');
    }
  } else {
    console.warn('Aviso: function TVe({db:e não encontrada no bundle.');
  }

  // =========================================================================
  // 4. ATUALIZAR EVe PARA SUPORTAR initialTab (Inspeções vs RNC) COM FUNÇÃO
  // =========================================================================
  const eveTarget = 'const[l,c]=b.useState("inspections")';
  const eveReplacement = 'const[l,c]=b.useState(()=>(typeof arguments!=="undefined"&&arguments[0]&&arguments[0].initialTab)?arguments[0].initialTab:"inspections")';

  if (bundle.includes(eveTarget)) {
    bundle = bundle.replace(eveTarget, eveReplacement);
    console.log('Componente EVe atualizado para respeitar initialTab com função!');
  }

  // =========================================================================
  // 5. ATUALIZAR O ROTEADOR INTERNO DE ABAS EM TVe
  // =========================================================================
  const t1 = `(m==="purchasing_suggestions"||m==="quotations"||m==="suppliers")&&t.jsx(xVe,{parts:S,productionOrders:w,quotations:E,suppliers:P,purchaseHistory:_,onCreateQuotationFromMrp:ge})`;
  const r1 = `m==="purchasing_suggestions"&&t.jsx(xVe,{parts:S,productionOrders:w,quotations:E,suppliers:P,purchaseHistory:_,onCreateQuotationFromMrp:ge}),m==="purchase_requisitions"&&t.jsx(indHub.PurchaseRequisitionsView,{db:e,currentUser:a,currentCompany:s,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p}),m==="purchase_orders"&&t.jsx(indHub.PurchaseOrdersView,{db:e,currentUser:a,currentCompany:s,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p}),m==="quotations"&&t.jsx(BOe,{db:e,currentUser:a,onUpdateDb:i,onAddHistoryLog:o}),m==="material_receiving"&&t.jsx(indHub.MaterialReceivingView,{db:e,currentUser:a,currentCompany:s,parts:S,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p}),m==="suppliers"&&t.jsx(indHub.IndustrialSuppliersView,{db:e,currentUser:a,currentCompany:s,suppliers:P,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p})`;

  if (bundle.includes(t1)) {
    bundle = bundle.replace(t1, r1);
    console.log('Roteamento de Compras/PCP/MRP atualizado com telas exclusivas!');
  }

  const t2 = `(m==="item_master"||m==="categories")&&t.jsx(IVe,{parts:S,onSavePart:ie,onNavigateToLabels:xe=>{v(xe),p("label_generator")},onNavigateToBom:()=>{p("boms")}})`;
  const r2 = `m==="item_master"&&t.jsx(IVe,{parts:S,onSavePart:ie,onNavigateToLabels:xe=>{v(xe),p("label_generator")},onNavigateToBom:()=>{p("boms")}}),m==="categories"&&t.jsx(indHub.MaterialFamiliesView,{db:e,currentUser:a,currentCompany:s,parts:S,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p})`;

  if (bundle.includes(t2)) {
    bundle = bundle.replace(t2, r2);
    console.log('Roteamento de Catálogo Mestre vs Famílias de Materiais atualizado com telas exclusivas!');
  }

  const t3 = `(m==="warehouse_locations"||m==="withdrawals")&&t.jsx(wVe,{locations:X,parts:S,productLots:C,onSaveLocation:I,onTransferStock:T,onGenerateLabel:xe=>{v(xe),p("label_generator")}})`;
  const r3 = `(m==="warehouse_locations"||m==="ind_almox_locs")&&t.jsx(wVe,{locations:X,parts:S,productLots:C,onSaveLocation:I,onTransferStock:T,onGenerateLabel:xe=>{v(xe),p("label_generator")}}),(m==="warehouse_transfers"||m==="ind_almox_mov")&&t.jsx(indHub.WarehouseTransfersView,{db:e,currentUser:a,currentCompany:s,locations:X,parts:S,onSaveLocation:I,onTransferStock:T,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p}),m==="withdrawals"&&t.jsx(sVe,{db:e,onUpdateDb:i,currentUser:a,currentCompany:s,onNavigate:l})`;

  if (bundle.includes(t3)) {
    bundle = bundle.replace(t3, r3);
    console.log('Roteamento de Localizações vs Transferências vs Retiradas WMS atualizado com telas exclusivas!');
  }

  const t4 = `(m==="production_floor"||m==="shop_floor_entry"||m==="downtime_registration"||m==="ind_rh_apontamentos"||m==="ind_rh_paradas")&&t.jsx(PVe,{productionOrders:w,shopFloorEntries:H,factoryOperators:D,onSaveEntry:se})`;
  const r4 = `(m==="production_floor"||m==="shop_floor_entry"||m==="ind_rh_apontamentos")&&t.jsx(PVe,{productionOrders:w,shopFloorEntries:H,factoryOperators:D,onSaveEntry:se}),(m==="downtime_registration"||m==="ind_rh_paradas")&&t.jsx(indHub.DowntimeRegistrationView,{db:e,currentUser:a,currentCompany:s,productionOrders:w,operators:D,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p}),m==="rh_productivity_oee"&&t.jsx(indHub.RHProductivityOEEView,{db:e,currentUser:a,currentCompany:s,operators:D,productionOrders:w,onUpdateDb:i,onAddHistoryLog:o,onNavigateTab:p})`;

  if (bundle.includes(t4)) {
    bundle = bundle.replace(t4, r4);
    console.log('Roteamento de Apontamento vs Paradas vs Horas & OEE atualizado com telas exclusivas!');
  }

  const t5 = `(m==="quality_control"||m==="quality_inspections"||m==="non_conformities")&&t.jsx(EVe,{inspections:W,nonConformities:Y,productLots:C,parts:S,productionOrders:w,onSaveInspection:Q,onSaveRnc:J})`;
  const r5 = `(m==="quality_control"||m==="quality_inspections")&&t.jsx(EVe,{key:"cq_insp_"+m,inspections:W,nonConformities:Y,productLots:C,parts:S,productionOrders:w,onSaveInspection:Q,onSaveRnc:J,initialTab:"inspections"}),m==="non_conformities"&&t.jsx(EVe,{key:"cq_rnc_"+m,inspections:W,nonConformities:Y,productLots:C,parts:S,productionOrders:w,onSaveInspection:Q,onSaveRnc:J,initialTab:"rnc"})`;

  if (bundle.includes(t5)) {
    bundle = bundle.replace(t5, r5);
    console.log('Roteamento de Qualidade vs RNC atualizado com telas exclusivas!');
  }

  // =========================================================================
  // 6. ATUALIZAR AS ROTAS DAS ETAPAS DO IndustrialProcessTracker
  // (Corrigir rotas inexistentes como ind_almox_wms, ind_fab_apontamentos,
  // ind_cq_recebimento, ind_almox_etiquetas, ind_log_expedicao para rotas oficiais)
  // =========================================================================
  const oldStagesSnippet = 'route: "ind_almox_wms"';
  if (bundle.includes(oldStagesSnippet)) {
    const p1 = bundle.indexOf('{ num: 1, name: "1. Prospecção & Cliente"');
    if (p1 !== -1) {
      const p3 = bundle.indexOf('{ num: 14, name: "14. Pós-Venda & Garantia"', p1);
      if (p3 !== -1) {
        const end = bundle.indexOf(']', p3);
        if (end !== -1) {
          const exactStages = bundle.substring(p1, end + 1);
          const correctedStages = `{ num: 1, name: "1. Prospecção & Cliente", sector: "Comercial", status: "completed", date: "02/10 09:30", user: "Carlos Vendas", doc: "CLI-0492 - Aprovado", route: "ind_com_clientes" },
        { num: 2, name: "2. Orçamento Aprovado", sector: "Comercial", status: "completed", date: "04/10 14:15", user: "Mariana Orçamentos", doc: "ORC-2026/892 - R$ 148.500", route: "ind_com_orcamentos" },
        { num: 3, name: "3. Projeto SolidWorks & BOM", sector: "Engenharia", status: "completed", date: "07/10 11:00", user: "Eng. Rafael P.", doc: "BOM-MST-500L (Rev 03) + CAD 3D", route: "ind_eng_boms" },
        { num: 4, name: "4. Planejamento PCP", sector: "PCP", status: "completed", date: "08/10 16:45", user: "Juliana PCP", doc: "OP-2026-00450 programada", route: "ind_pcp_planejamento" },
        { num: 5, name: "5. Compras MRP", sector: "Suprimentos", status: "completed", date: "11/10 10:20", user: "Marcos Compras", doc: "PC-8841 (Chapas 316L e Mancais)", route: "ind_pcp_compras" },
        { num: 6, name: "6. Almoxarifado / Separação", sector: "Almoxarifado", status: "completed", date: "14/10 08:30", user: "Pedro Almoxarife", doc: "Picking Rua B-04 / Lote INOX-99", route: "ind_almox_locs" },
        { num: 7, name: "7. Fabricação MES (Chão de Fábrica)", sector: "Produção", status: "in_progress", date: "Em andamento", user: "Linha CNC 02 (Operador Tiago)", doc: "78% concluído - OEE 89%", route: "ind_rh_apontamentos" },
        { num: 8, name: "8. Inspeção CQ & Ensaio", sector: "Qualidade", status: "pending", date: "Previsto 22/10", user: "Resp: CQ Central", doc: "Ensaio Hidrostático e Dimensional", route: "quality_inspections" },
        { num: 9, name: "9. Produto Acabado & Etiqueta", sector: "Almoxarifado", status: "pending", date: "Previsto 24/10", user: "Almoxarifado Expedição", doc: "QR Code e Número de Série", route: "label_generator" },
        { num: 10, name: "10. Faturamento NF-e SEFAZ", sector: "Fiscal", status: "pending", date: "Previsto 25/10", user: "Depto Fiscal", doc: "NF-e Danfe Eletrônica", route: "fiscal" },
        { num: 11, name: "11. Expedição & Romaneio", sector: "Logística", status: "pending", date: "Previsto 26/10", user: "Logística Fábrica", doc: "Romaneio e Conferência de Carga", route: "withdrawals" },
        { num: 12, name: "12. Transporte & Entrega", sector: "Transporte", status: "pending", date: "Previsto 28/10", user: "Transportadora Rodonaves", doc: "CT-e e Canhoto Digital", route: "carriers" },
        { num: 13, name: "13. Faturamento & Recebimento", sector: "Financeiro", status: "pending", date: "Venc: 28/11", user: "Financeiro ADM", doc: "Boleto 30 DDL", route: "accounts_receivable" },
        { num: 14, name: "14. Pós-Venda & Garantia", sector: "Atendimento", status: "pending", date: "Contínuo", user: "Suporte Técnico", doc: "Garantia 12 Meses Ativa", route: "ind_com_posvenda" }
      ]`;
          bundle = bundle.replace(exactStages, correctedStages);
          console.log('Rotas das 14 etapas do IndustrialProcessTracker atualizadas com sucesso!');
        }
      }
    }
  } else {
    console.log('Rotas do IndustrialProcessTracker já atualizadas.');
  }

  // =========================================================================
  // 7. ATUALIZAR INVOCADOR DO IndustrialProcessTracker EM TVe
  // Conectar onNavigateTab e onNavigateToView diretamente para abrir as telas
  // instantaneamente sem reload e suportar abas internas e externas
  // =========================================================================
  const t6 = `(m==="trace_process"||m==="trace_product")&&t.jsx(IndustrialProcessTracker,{onNavigate:l,currentUser:a,db:e})`;
  const r6 = `(m==="trace_process"||m==="trace_product")&&t.jsx(IndustrialProcessTracker,{onNavigate:(route)=>{
    if (typeof p === "function") {
      if (typeof INDUSTRIAL_MODULES !== "undefined") {
        for (const mod of INDUSTRIAL_MODULES) {
          const found = mod.submenus && mod.submenus.find(s => s.id === route || s.tab === route);
          if (found) {
            if (typeof d === "function" && mod.dept) d(mod.dept);
            p(found.tab || found.id);
            if (typeof l === "function") l(found.id);
            return;
          }
        }
      }
      p(route);
    }
    if (typeof l === "function") l(route);
  },currentUser:a,db:e})`;

  if (bundle.includes(t6)) {
    bundle = bundle.replace(t6, r6);
    console.log('Invocador de IndustrialProcessTracker atualizado com navegação perfeita!');
  }

  // Salvar bundles
  fs.writeFileSync(bundlePath, bundle, 'utf8');
  if (fs.existsSync(distBundlePath)) {
    fs.writeFileSync(distBundlePath, bundle, 'utf8');
  }

  console.log('--- Todas as telas exclusivas integradas com sucesso nos bundles public e dist! ---');
}

applyFixes().catch(err => {
  console.error('Erro ao aplicar telas exclusivas:', err);
  process.exit(1);
});
