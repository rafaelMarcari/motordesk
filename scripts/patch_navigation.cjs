const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");

let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. Patch the sidebar button for industry: replace the single button with top-level menu items
const oldSidebarBtn = `$e("industry")&&t.jsx("button",{id:"menu-btn-industry",onClick:()=>Tt("industry"),title:"Produção & PCP (BOM/OP)",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition \${De==="industry"?"bg-amber-500 text-slate-950 font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(tc,{className:"w-4 h-4 shrink-0 text-amber-400"}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Produção & PCP (BOM/OP)"})]})}),`;

const newSidebarSection = `$e("industry")&&t.jsxs("div",{className:"pt-2 pb-1 space-y-0.5 border-t border-slate-800/80 my-1",children:[(!le||Ue)&&t.jsxs("div",{className:"px-3 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500",children:[t.jsx("span",{children:"Processos Industriais"}),t.jsx("span",{className:"px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 text-[9px] font-mono",children:"ERP/MES"})]}),t.jsx("button",{id:"menu-btn-ind-engenharia",onClick:()=>Tt("ind_engenharia"),title:"Engenharia & CAD SolidWorks",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_engenharia"?"bg-cyan-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(cm,{className:\`w-4 h-4 shrink-0 \${De==="ind_engenharia"?"text-white":"text-cyan-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Engenharia & CAD SolidWorks"})]})}),t.jsx("button",{id:"menu-btn-ind-producao",onClick:()=>Tt("ind_producao"),title:"Produção & Chão de Fábrica (MES)",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_producao"||De==="industry"?"bg-indigo-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(tc,{className:\`w-4 h-4 shrink-0 \${De==="ind_producao"||De==="industry"?"text-white":"text-indigo-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Produção & Chão de Fábrica"})]})}),t.jsx("button",{id:"menu-btn-ind-almoxarifado",onClick:()=>Tt("ind_almoxarifado"),title:"Almoxarifado & Estoque WMS",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_almoxarifado"?"bg-emerald-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(qo,{className:\`w-4 h-4 shrink-0 \${De==="ind_almoxarifado"?"text-white":"text-emerald-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Almoxarifado & Estoque WMS"})]})}),t.jsx("button",{id:"menu-btn-ind-pcp-compras",onClick:()=>Tt("ind_pcp_compras"),title:"PCP & Compras (MRP)",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_pcp_compras"?"bg-amber-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(t1,{className:\`w-4 h-4 shrink-0 \${De==="ind_pcp_compras"?"text-white":"text-amber-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"PCP & Compras (MRP)"})]})}),t.jsx("button",{id:"menu-btn-ind-comercial",onClick:()=>Tt("ind_comercial"),title:"Comercial & Vendas Fabris",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_comercial"?"bg-blue-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(sn,{className:\`w-4 h-4 shrink-0 \${De==="ind_comercial"?"text-white":"text-blue-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Comercial & Vendas"})]})}),t.jsx("button",{id:"menu-btn-ind-qualidade",onClick:()=>Tt("ind_qualidade"),title:"Qualidade & Controle CQ",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_qualidade"?"bg-teal-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(js,{className:\`w-4 h-4 shrink-0 \${De==="ind_qualidade"?"text-white":"text-teal-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Qualidade & CQ"})]})}),t.jsx("button",{id:"menu-btn-ind-manutencao",onClick:()=>Tt("ind_manutencao"),title:"Manutenção Industrial",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_manutencao"?"bg-orange-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(hr,{className:\`w-4 h-4 shrink-0 \${De==="ind_manutencao"?"text-white":"text-orange-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Manutenção Industrial"})]})}),t.jsx("button",{id:"menu-btn-ind-rh",onClick:()=>Tt("ind_rh"),title:"RH & Postos Fabris",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_rh"?"bg-pink-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(Yc,{className:\`w-4 h-4 shrink-0 \${De==="ind_rh"?"text-white":"text-pink-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"RH & Postos Fabris"})]})}),t.jsx("button",{id:"menu-btn-ind-adm",onClick:()=>Tt("ind_adm"),title:"Custos & BI / Relatórios",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition \${De==="ind_adm"?"bg-purple-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(eh,{className:\`w-4 h-4 shrink-0 \${De==="ind_adm"?"text-white":"text-purple-400"}\`}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Custos & BI Executivo"})]})})]}),`;

if (!bundle.includes(oldSidebarBtn)) {
  console.error("ERRO: oldSidebarBtn não encontrado no bundle!");
  process.exit(1);
}
bundle = bundle.replace(oldSidebarBtn, newSidebarSection);
console.log("1. Menu lateral atualizado com sucesso!");

// 2. Patch the main router to route ind_* to TVe with correct initialDepartment and initialTab
const oldRouter = `De==="industry"&&(!!n.permissions.accessProduction||!!n.permissions.accessIndustrialDashboard)&&(qt("accessProduction")?va():t.jsx(TVe,{db:pt,currentUser:n,currentCompany:ot||e.companyInfo,onUpdateDb:nt,onAddHistoryLog:$t,onNavigateToView:Tt}))`;

const newRouter = `(De==="industry"||(typeof De==="string"&&De.startsWith("ind_")))&&(!!n.permissions.accessProduction||!!n.permissions.accessIndustrialDashboard)&&(qt("accessProduction")?va():t.jsx(TVe,{key:De,db:pt,currentUser:n,currentCompany:ot||e.companyInfo,initialDepartment:De==="ind_producao"?"producao":De==="ind_almoxarifado"?"almoxarifado":De==="ind_pcp_compras"?"pcp_compras":De==="ind_comercial"?"comercial":De==="ind_qualidade"?"qualidade":De==="ind_manutencao"?"manutencao":De==="ind_adm"?"adm":De==="ind_rh"?"rh":"engenharia",initialTab:De==="ind_producao"?"dash_producao":De==="ind_almoxarifado"?"dash_almoxarifado":De==="ind_pcp_compras"?"dash_pcp_compras":De==="ind_comercial"?"dash_comercial":De==="ind_qualidade"?"dash_qualidade":De==="ind_manutencao"?"dash_manutencao":De==="ind_adm"?"pcp_dashboard":De==="ind_rh"?"dash_rh":"dash_engenharia",onUpdateDb:nt,onAddHistoryLog:$t,onNavigateToView:Tt}))`;

if (!bundle.includes(oldRouter)) {
  console.error("ERRO: oldRouter não encontrado no bundle!");
  process.exit(1);
}
bundle = bundle.replace(oldRouter, newRouter);
console.log("2. Roteador principal atualizado com sucesso!");

// 3. Patch Dashboard Geral title in qSe
const oldTitle = `t.jsx("span",{children:"Dashboard de Produção Industrial & PCP"})`;
const newTitle = `t.jsx("span",{children:"Dashboard Geral da Operação Industrial"})`;
if (bundle.includes(oldTitle)) {
  bundle = bundle.replace(oldTitle, newTitle);
  console.log("3. Título do Dashboard Geral atualizado com sucesso!");
}

// 4. Patch Dashboard Geral description in qSe
const oldDesc = `Planejamento e Controle de Produção (PCP), Ordens de Fabricação (OP), rendimento OEE, controle de refugos e rastreabilidade.`;
const newDesc = `Visão executiva integrada de todos os setores: Comercial, Engenharia & CAD SolidWorks, Produção MES, Almoxarifado WMS, Compras MRP, Qualidade e Manutenção.`;
if (bundle.includes(oldDesc)) {
  bundle = bundle.replace(oldDesc, newDesc);
  console.log("4. Descrição do Dashboard Geral atualizada com sucesso!");
}

// 5. Update zt to cleanly support industrial views
const oldZt = `representativeReconciliation:"representative_reconciliation"})[ft]||ft`;
const newZt = `representativeReconciliation:"representative_reconciliation",industrial:"ind_producao",industry:"ind_engenharia",ind_engenharia:"ind_engenharia",ind_producao:"ind_producao",ind_almoxarifado:"ind_almoxarifado",ind_pcp_compras:"ind_pcp_compras",ind_comercial:"ind_comercial",ind_qualidade:"ind_qualidade",ind_manutencao:"ind_manutencao",ind_rh:"ind_rh",ind_adm:"ind_adm"})[ft]||ft`;

if (bundle.includes(oldZt)) {
  bundle = bundle.replace(oldZt, newZt);
  console.log("5. Mapeamento zt atualizado com sucesso!");
}

// 6. Validar com esbuild
try {
  console.log("Validando bundle modificado com esbuild...");
  esbuild.transformSync(bundle, { loader: "js" });
  console.log("ESBUILD VALIDATION: SUCESSO ABSOLUTO! 0 erros de sintaxe!");
  fs.writeFileSync(bundlePath, bundle, "utf8");
  fs.writeFileSync(distBundlePath, bundle, "utf8");
  console.log("Arquivos salvos com sucesso em public/ e dist/!");
} catch (err) {
  console.error("ERRO ESBUILD:", err.message);
  process.exit(1);
}
