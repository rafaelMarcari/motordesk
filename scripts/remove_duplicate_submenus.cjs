const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function main() {
  console.log('=== REMOVENDO SUBMENUS DUPLICADOS DOS MÓDULOS INDUSTRIAIS ===');

  const publicBundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
  const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

  let bundle = fs.readFileSync(publicBundlePath, 'utf8');

  // 1. LOCALIZAR E SUBSTITUIR INDUSTRIAL_MODULES
  const pStart = bundle.indexOf('const INDUSTRIAL_MODULES = [');
  if (pStart === -1) {
    throw new Error('const INDUSTRIAL_MODULES não encontrado no bundle!');
  }
  const pEnd = bundle.indexOf('];', pStart) + 2;

  const CLEAN_INDUSTRIAL_MODULES = `const INDUSTRIAL_MODULES = [
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

  bundle = bundle.substring(0, pStart) + CLEAN_INDUSTRIAL_MODULES + bundle.substring(pEnd);
  console.log('INDUSTRIAL_MODULES substituído por versão sem duplicatas!');

  // 2. ATUALIZAR SIDEBAR: allowedSubs, isSubActive e isAnySubActive COM SUPORTE A ALIASES
  const pSidebarStart = bundle.indexOf('function IndustrialHierarchicalSidebar(props) {');
  const pSidebarEnd = bundle.indexOf('// --- FIM HIERARQUIA INDUSTRIAL & RBAC MOTOR DESK ---', pSidebarStart);
  if (pSidebarStart !== -1 && pSidebarEnd !== -1) {
    let sidebarContent = bundle.substring(pSidebarStart, pSidebarEnd);

    // Substituir filtro de allowedSubs
    sidebarContent = sidebarContent.replace(
      /const allowedSubs = mod\.submenus\.filter\(sub => \{[\s\S]*?\}\);/g,
      `const allowedSubs = mod.submenus.filter(sub => {
        if (!currentUser) return false;
        if (canAccess) return canAccess(sub.id) || (sub.tab && canAccess(sub.tab)) || (sub.aliases && sub.aliases.some(a => canAccess(a)));
        return true;
      });`
    );

    // Substituir isSubActive
    sidebarContent = sidebarContent.replace(
      /const isSubActive = activeRoute === sub\.id \|\| activeRoute === sub\.tab;?/g,
      `const isSubActive = activeRoute === sub.id || activeRoute === sub.tab || (sub.aliases && sub.aliases.includes(activeRoute));`
    );

    // Substituir isAnySubActive
    sidebarContent = sidebarContent.replace(
      /const isAnySubActive = allowedSubs\.some\(s => s\.id === activeRoute\);?/g,
      `const isAnySubActive = allowedSubs.some(s => s.id === activeRoute || s.tab === activeRoute || (s.aliases && s.aliases.includes(activeRoute)));`
    );

    bundle = bundle.substring(0, pSidebarStart) + sidebarContent + bundle.substring(pSidebarEnd);
    console.log('Sidebar atualizada com suporte a aliases e verificação sem duplicatas!');
  }

  // 3. ATUALIZAR TVe: Child 0 e Child 1 com suporte a aliases
  const pTVeStart = bundle.indexOf('function TVe(');
  const pTraceProcess = bundle.indexOf('m==="trace_process"', pTVeStart);
  if (pTVeStart !== -1 && pTraceProcess !== -1) {
    let tveHeader = bundle.substring(pTVeStart, pTraceProcess);
    tveHeader = tveHeader.replace(
      /const s = mod\.submenus && mod\.submenus\.find\(sub => sub\.tab === m \|\| sub\.id === m\);/g,
      `const s = mod.submenus && mod.submenus.find(sub => sub.tab === m || sub.id === m || (sub.aliases && sub.aliases.includes(m)));`
    );
    tveHeader = tveHeader.replace(
      /const foundSub = mod\.submenus && mod\.submenus\.find\(s => s\.tab === tabOrId \|\| s\.id === tabOrId\);/g,
      `const foundSub = mod.submenus && mod.submenus.find(s => s.tab === tabOrId || s.id === tabOrId || (s.aliases && s.aliases.includes(tabOrId)));`
    );
    bundle = bundle.substring(0, pTVeStart) + tveHeader + bundle.substring(pTraceProcess);
    console.log('TVe cabeçalhos e navegação atualizados com suporte a aliases!');
  }

  // 4. ATUALIZAR KKe: initialDepartment e initialTab com suporte a aliases
  const pKKeStart = bundle.indexOf('function KKe(');
  if (pKKeStart !== -1) {
    const pKKeEnd = bundle.indexOf('De==="history"', pKKeStart);
    if (pKKeEnd !== -1) {
      let kkeBlock = bundle.substring(pKKeStart, pKKeEnd);
      kkeBlock = kkeBlock.replace(
        /if \(mod\.submenus && mod\.submenus\.some\(s => s\.id === De \|\| s\.tab === De\)\)/g,
        `if (mod.submenus && mod.submenus.some(s => s.id === De || s.tab === De || (s.aliases && s.aliases.includes(De))))`
      );
      kkeBlock = kkeBlock.replace(
        /const found = mod\.submenus && mod\.submenus\.find\(s => s\.id === De \|\| s\.tab === De\);/g,
        `const found = mod.submenus && mod.submenus.find(s => s.id === De || s.tab === De || (s.aliases && s.aliases.includes(De)));`
      );
      bundle = bundle.substring(0, pKKeStart) + kkeBlock + bundle.substring(pKKeEnd);
      console.log('KKe initialDepartment e initialTab atualizados com suporte a aliases!');
    }
  }

  // 5. VALIDAR SINTAXE VIA ESBUILD
  console.log('Validando sintaxe do bundle com esbuild...');
  try {
    esbuild.transformSync(bundle, { loader: 'js' });
  } catch (err) {
    fs.writeFileSync('/tmp/err_bundle.js', bundle, 'utf8');
    throw err;
  }
  console.log('Validação de sintaxe aprovada!');

  // 6. GRAVAR NOS DOIS BUNDLES
  fs.writeFileSync(publicBundlePath, bundle, 'utf8');
  fs.writeFileSync(distBundlePath, bundle, 'utf8');
  console.log('Bundles gravados com sucesso em public/assets e dist/assets!');
}

main().catch(err => {
  console.error('ERRO:', err);
  process.exit(1);
});
