const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");

let bundle = fs.readFileSync(bundlePath, "utf8");
console.log("Iniciando patch da hierarquia industrial e RBAC...");

// 1. Atualizar mapeamento zt
const ztMarker = 'representativeReconciliation:"representative_reconciliation"';
const ztPos = bundle.indexOf(ztMarker);
if (ztPos === -1) {
  console.error("ERRO: ztMarker não encontrado!");
  process.exit(1);
}
const ztEnd = bundle.indexOf("}[ft]||ft", ztPos);
const currentZtChunk = bundle.substring(ztPos, ztEnd);

const newRoutesMap = [
  'representativeReconciliation:"representative_reconciliation"',
  'industrial:"ind_producao"',
  'industry:"ind_eng_boms"',
  'ind_rastrear_processo:"ind_rastrear_processo"',
  // 1. Comercial
  'ind_com_marketing:"ind_com_marketing"',
  'ind_com_orcamentos:"ind_com_orcamentos"',
  'ind_com_pedidos:"ind_com_pedidos"',
  'ind_com_carteira:"ind_com_carteira"',
  'ind_com_posvenda:"ind_com_posvenda"',
  'ind_comercial:"ind_com_orcamentos"',
  // 2. Engenharia
  'ind_eng_projetos:"ind_eng_projetos"',
  'ind_eng_produtos:"ind_eng_produtos"',
  'ind_eng_boms:"ind_eng_boms"',
  'ind_eng_solidworks:"ind_eng_solidworks"',
  'ind_eng_fichatecnica:"ind_eng_fichatecnica"',
  'ind_eng_revisoes:"ind_eng_revisoes"',
  'ind_engenharia:"ind_eng_boms"',
  // 3. PCP / Compras
  'ind_pcp_planejamento:"ind_pcp_planejamento"',
  'ind_pcp_mrp:"ind_pcp_mrp"',
  'ind_pcp_solicitacoes:"ind_pcp_solicitacoes"',
  'ind_pcp_compras:"ind_pcp_compras"',
  'ind_pcp_semaforo:"ind_pcp_semaforo"',
  'ind_pcp_recebimento:"ind_pcp_recebimento"',
  'ind_pcp_compras:"ind_pcp_mrp"',
  // 4. RH
  'ind_rh_operadores:"ind_rh_operadores"',
  'ind_rh_postos:"ind_rh_postos"',
  'ind_rh_funcoes:"ind_rh_funcoes"',
  'ind_rh_turnos:"ind_rh_turnos"',
  'ind_rh_alocacao:"ind_rh_alocacao"',
  'ind_rh:"ind_rh_operadores"',
  // 5. Produção
  'ind_almox_estoque:"parts"',
  'ind_almox_wms:"ind_almox_wms"',
  'ind_almox_movimentacoes:"ind_almox_movimentacoes"',
  'ind_almox_lotes:"ind_almox_lotes"',
  'ind_almox_separacao:"ind_almox_separacao"',
  'ind_almox_etiquetas:"ind_almox_etiquetas"',
  'ind_almoxarifado:"ind_almox_wms"',
  'ind_fab_ops:"ind_fab_ops"',
  'ind_fab_programacao:"ind_fab_programacao"',
  'ind_fab_apontamentos:"ind_fab_apontamentos"',
  'ind_fab_consumo:"ind_fab_consumo"',
  'ind_fab_refugo:"ind_fab_refugo"',
  'ind_producao:"ind_fab_ops"',
  'ind_log_expedicao:"ind_log_expedicao"',
  'ind_log_romaneios:"ind_log_romaneios"',
  'ind_log_conferencia:"ind_log_conferencia"',
  'ind_log_entregas:"ind_log_entregas"',
  // 6. Qualidade
  'ind_cq_recebimento:"ind_cq_recebimento"',
  'ind_cq_processo:"ind_cq_processo"',
  'ind_cq_final:"ind_cq_final"',
  'ind_cq_lotes:"ind_cq_lotes"',
  'ind_cq_rnc:"ind_cq_rnc"',
  'ind_cq_refugo:"ind_cq_refugo"',
  'ind_cq_rastreabilidade:"ind_cq_rastreabilidade"',
  'ind_qualidade:"ind_cq_recebimento"',
  // 7. Manutenção
  'ind_manut_maquinas:"ind_manut_maquinas"',
  'ind_manut_preventiva:"ind_manut_preventiva"',
  'ind_manut_corretiva:"ind_manut_corretiva"',
  'ind_manut_ordens:"ind_manut_ordens"',
  'ind_manut_planos:"ind_manut_planos"',
  'ind_manut_pecas:"ind_manut_pecas"',
  'ind_manut_historico:"ind_manut_historico"',
  'ind_manutencao:"ind_manut_maquinas"',
  // 8. Interface / Cliente
  'ind_cli_portal:"ind_cli_portal"',
  'ind_cli_pedido:"ind_cli_pedido"',
  'ind_cli_producao:"ind_cli_producao"',
  'ind_cli_docs:"ind_cli_docs"',
  'ind_cli_entregas:"ind_cli_entregas"',
  'ind_cli_posvenda:"ind_cli_posvenda"',
  // 9. Fiscal
  'ind_fiscal_nfe:"fiscal"',
  'ind_fiscal_xml:"fiscal"',
  'ind_fiscal_conf:"fiscal_conference"',
  'ind_fiscal_guias:"tax_obligations"',
  // 10. Financeiro / ADM
  'ind_fin_pagar:"accounts_payable"',
  'ind_fin_receber:"accounts_receivable"',
  'ind_fin_fluxo:"financial"',
  'ind_fin_custos:"ind_fin_custos"',
  'ind_adm:"ind_fin_custos"',
  // 11. Gestão / BI
  'ind_bi_executivo:"ind_bi_executivo"',
  'ind_bi_kpis:"ind_bi_kpis"',
  'ind_bi_produtividade:"ind_bi_produtividade"',
  'ind_bi_relatorios:"ind_bi_relatorios"'
].join(",");

bundle = bundle.substring(0, ztPos) + newRoutesMap + bundle.substring(ztEnd);
console.log("1. Mapeamento de rotas zt atualizado com sucesso!");

// 2. Atualizar zre (permissões por rota)
const zreMarker = 'const zre={dashboard:"accessDashboard"';
const zrePos = bundle.indexOf(zreMarker);
if (zrePos === -1) {
  console.error("ERRO: zreMarker não encontrado!");
  process.exit(1);
}
const zreEnd = bundle.indexOf("};", zrePos);
const currentZreChunk = bundle.substring(zrePos, zreEnd);

const newZreMap = `${currentZreChunk},
ind_com_marketing:"accessCommercial",ind_com_orcamentos:"accessBudgets",ind_com_pedidos:"accessCommercial",ind_com_carteira:"accessCommercial",ind_com_posvenda:"accessCommercial",ind_comercial:"accessCommercial",
ind_eng_projetos:"accessEngineering",ind_eng_produtos:"accessEngineering",ind_eng_boms:"accessBillOfMaterials",ind_eng_solidworks:"accessCADSolidWorks",ind_eng_fichatecnica:"accessEngineering",ind_eng_revisoes:"accessEngineering",ind_engenharia:"accessBillOfMaterials",
ind_pcp_planejamento:"accessPCP",ind_pcp_mrp:"accessMRP",ind_pcp_solicitacoes:"accessIndustrialPurchasing",ind_pcp_compras:"accessIndustrialPurchasing",ind_pcp_semaforo:"accessPCP",ind_pcp_recebimento:"accessIndustrialPurchasing",
ind_rh_operadores:"accessIndustrialRH",ind_rh_postos:"accessIndustrialRH",ind_rh_funcoes:"accessIndustrialRH",ind_rh_turnos:"accessIndustrialRH",ind_rh_alocacao:"accessIndustrialRH",ind_rh:"accessIndustrialRH",
ind_almox_estoque:"accessParts",ind_almox_wms:"accessWarehouseLocations",ind_almox_movimentacoes:"accessIndustrialStock",ind_almox_lotes:"accessLots",ind_almox_separacao:"accessMaterialSeparation",ind_almox_etiquetas:"accessLabelGenerator",ind_almoxarifado:"accessWarehouseLocations",
ind_fab_ops:"accessProductionOrders",ind_fab_programacao:"accessProductionOrders",ind_fab_apontamentos:"accessProductionFloor",ind_fab_consumo:"accessProductionFloor",ind_fab_refugo:"accessProductionFloor",ind_producao:"accessProductionOrders",
ind_log_expedicao:"accessExpedition",ind_log_romaneios:"accessExpedition",ind_log_conferencia:"accessExpedition",ind_log_entregas:"accessExpedition",
ind_cq_recebimento:"accessQualityControl",ind_cq_processo:"accessQualityControl",ind_cq_final:"accessQualityControl",ind_cq_lotes:"accessLots",ind_cq_rnc:"accessQualityControl",ind_cq_refugo:"accessQualityControl",ind_cq_rastreabilidade:"accessQualityControl",ind_qualidade:"accessQualityControl",
ind_manut_maquinas:"accessMaintenance",ind_manut_preventiva:"accessMaintenance",ind_manut_corretiva:"accessMaintenance",ind_manut_ordens:"accessMaintenance",ind_manut_planos:"accessMaintenance",ind_manut_pecas:"accessMaintenance",ind_manut_historico:"accessMaintenance",ind_manutencao:"accessMaintenance",
ind_cli_portal:"accessClientPortal",ind_cli_pedido:"accessClientPortal",ind_cli_producao:"accessClientPortal",ind_cli_docs:"accessClientPortal",ind_cli_entregas:"accessClientPortal",ind_cli_posvenda:"accessClientPortal",
ind_fiscal_nfe:"accessFiscal",ind_fiscal_xml:"accessFiscal",ind_fiscal_conf:"accessFiscal",ind_fiscal_guias:"accessFiscal",
ind_fin_pagar:"accessAccountsPayable",ind_fin_receber:"accessAccountsReceivable",ind_fin_fluxo:"accessFinancial",ind_fin_custos:"accessIndustrialCosts",ind_adm:"accessIndustrialCosts",
ind_bi_executivo:"accessIndustrialReports",ind_bi_kpis:"accessIndustrialReports",ind_bi_produtividade:"accessIndustrialReports",ind_bi_relatorios:"accessIndustrialReports",
ind_rastrear_processo:"accessProcessTracking"}`;

bundle = bundle.substring(0, zrePos) + newZreMap + bundle.substring(zreEnd);
console.log("2. Permissões zre atualizadas!");

// 3. Atualizar KA para suportar papéis industriais pré-definidos (Almoxarife, Operador, Engenheiro, etc.)
const kaMarker = 'case"estoquista":r=!0,n=!0,i=!1,o=!1,l=!0,c=!1,d=!0,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;';
const kaPos = bundle.indexOf(kaMarker);
if (kaPos !== -1) {
  const newKaRoles = `case"almoxarife":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"operador":r=!1,n=!1,i=!1,o=!1,l=!1,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!1;break;case"engenheiro":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"qualidade":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!1,v=!1,N=!1,w=!1,C=!1,y=!0;break;case"pcp":r=!1,n=!1,i=!1,o=!1,l=!0,c=!1,d=!1,m=!1,p=!0,f=!1,h=!1,A=!0,v=!1,N=!1,w=!1,C=!1,y=!0;break;${kaMarker}`;
  bundle = bundle.replace(kaMarker, newKaRoles);
  console.log("3. Papéis industriais adicionados em KA!");
}

// 4. Salvar e validar com esbuild
try {
  console.log("Validando bundle com esbuild...");
  esbuild.transformSync(bundle, { loader: "js" });
  console.log("ESBUILD: SUCESSO!");
  fs.writeFileSync(bundlePath, bundle, "utf8");
  fs.writeFileSync(distBundlePath, bundle, "utf8");
} catch (err) {
  console.error("ERRO ESBUILD:", err.message);
  process.exit(1);
}
