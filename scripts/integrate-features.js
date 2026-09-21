import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const publicAsset = path.resolve('public/assets/index-CUxTo0fH.js');
const distAsset = path.resolve('dist/assets/index-CUxTo0fH.js');

console.log('=== MOTOR DESK FEATURE INTEGRATION ===');

// 1. Compile FiscalXmlExtractionView
console.log('1. Compiling FiscalXmlExtractionView...');
const fiscalBuild = await esbuild.build({
  entryPoints: ['src/components/FiscalXmlExtractionView.tsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  write: false
});

let fiscalCode = fiscalBuild.outputFiles[0].text;
fiscalCode = fiscalCode.replace(/import\s*\{[^}]*\}\s*from\s*["']react["'];?/g, '');
fiscalCode = fiscalCode.replace(/import\s*\{[^}]*\}\s*from\s*["']react\/jsx-runtime["'];?/g, '');
fiscalCode = fiscalCode.replace(/export\s*\{[^}]*\};?/g, '');
fiscalCode = fiscalCode.replace(/\bjsx\(/g, 'import_jsx_runtime6.jsx(');
fiscalCode = fiscalCode.replace(/\bjsxs\(/g, 'import_jsx_runtime6.jsxs(');
fiscalCode = fiscalCode.replace(/\bFragment\b/g, 'import_jsx_runtime6.Fragment');

// Inject hooks destructuring inside FiscalXmlExtractionView
fiscalCode = fiscalCode.replace(
  /function FiscalXmlExtractionView\s*\(\{([^}]+)\}\)\s*\{/,
  'function FiscalXmlExtractionView({$1}) {\n  const { useState, useMemo, useEffect, useCallback, useRef } = b;\n'
);

// 2. Compile RepresentativeOrdersView
console.log('2. Compiling RepresentativeOrdersView...');
const repBuild = await esbuild.build({
  entryPoints: ['src/components/RepresentativeOrdersView.tsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  write: false
});

let repCode = repBuild.outputFiles[0].text;
repCode = repCode.replace(/import\s*\{[^}]*\}\s*from\s*["']react["'];?/g, '');
repCode = repCode.replace(/import\s*\{[^}]*\}\s*from\s*["']react\/jsx-runtime["'];?/g, '');
repCode = repCode.replace(/export\s*\{[^}]*\};?/g, '');
repCode = repCode.replace(/\bjsx\(/g, 'import_jsx_runtime6.jsx(');
repCode = repCode.replace(/\bjsxs\(/g, 'import_jsx_runtime6.jsxs(');
repCode = repCode.replace(/\bFragment\b/g, 'import_jsx_runtime6.Fragment');

// Inject hooks destructuring inside RepresentativeOrdersView
repCode = repCode.replace(
  /function RepresentativeOrdersView\s*\(\{([^}]+)\}\)\s*\{/,
  'function RepresentativeOrdersView({$1}) {\n  const { useState, useMemo, useEffect, useCallback, useRef } = b;\n'
);

// 3. Patch bundles
console.log('3. Applying patches to public and dist bundles...');
for (const filePath of [publicAsset, distAsset]) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}, skipping...`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // A. Inject FiscalXmlExtractionView and RepresentativeOrdersView code if not already present
  if (!content.includes('function FiscalXmlExtractionView(')) {
    content = `${fiscalCode}\n\n${repCode}\n\n${content}`;
    console.log(`- Injected FiscalXmlExtractionView & RepresentativeOrdersView into ${path.basename(filePath)}`);
  }

  // B. Update zre map with fiscal_xml_extraction
  if (!content.includes('fiscal_xml_extraction:"accessFiscal"')) {
    content = content.replace(
      'fiscal_conference:"accessFiscal"',
      'fiscal_conference:"accessFiscal",fiscal_xml_extraction:"accessFiscal",fiscal_xml:"accessFiscal"'
    );
    console.log(`- Updated zre permission map in ${path.basename(filePath)}`);
  }

  // C. Add Submenu button for Fiscal XML in Sidebar
  const fiscalSidebarMarker = '$e("tax_obligations")&&t.jsxs("button",{id:"submenu-btn-tax-obligations"';
  const fiscalXmlBtn = `$e("fiscal")&&t.jsxs("button",{id:"submenu-btn-fiscal-xml",onClick:()=>Tt("fiscal_xml_extraction"),className:\`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer \${De==="fiscal_xml_extraction"?"bg-amber-500/20 text-amber-200 font-bold border border-amber-500/30":"text-slate-400 hover:text-white hover:bg-slate-800/60"}\`,children:[t.jsx(cl,{className:"w-3.5 h-3.5 text-amber-400 shrink-0"}),t.jsx("span",{className:"truncate",children:"Extração XML (Contabilidade)"})]}),`;
  
  if (!content.includes('id:"submenu-btn-fiscal-xml"') && content.includes(fiscalSidebarMarker)) {
    content = content.replace(fiscalSidebarMarker, `${fiscalXmlBtn}${fiscalSidebarMarker}`);
    console.log(`- Added Extração XML submenu in sidebar in ${path.basename(filePath)}`);
  }

  // D. Register FiscalXmlExtractionView in workspace-main-content
  const fiscalRouterMarker = 'De==="sales"&&n.permissions.accessSales&&(';
  const fiscalRoute = `De==="fiscal_xml_extraction"&&(n.permissions.accessFiscal||n.permissions.fiscalXml?qt("accessFiscal")?va():t.jsx(FiscalXmlExtractionView,{db:pt,currentUser:n,activeCompanyId:ye,onAddHistoryLog:$t,onNavigateToView:Tt}):va()),`;
  
  if (!content.includes('t.jsx(FiscalXmlExtractionView') && content.includes(fiscalRouterMarker)) {
    content = content.replace(fiscalRouterMarker, `${fiscalRoute}${fiscalRouterMarker}`);
    console.log(`- Registered FiscalXmlExtractionView route in ${path.basename(filePath)}`);
  }

  // E. Register RepresentativeOrdersView in workspace-main-content
  const repOldRoute = '["representative_commerce","representative_orders","representative_reconciliation"].includes(De)&&(De==="representative_orders"&&n.permissions.accessRepresentativeOrders||n.permissions.accessRepresentativeCommerce?qt(De==="representative_orders"?"accessRepresentativeOrders":"accessRepresentativeCommerce")?va():t.jsx(VVe,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,initialTab:De==="representative_orders"?"orders":De==="representative_reconciliation"?"reconciliation":void 0,onAddHistoryLog:$t,onNavigateToView:Tt}):null)';
  const repNewRoute = 'De==="representative_orders"?(n.permissions.accessRepresentativeOrders?qt("accessRepresentativeOrders")?va():t.jsx(RepresentativeOrdersView,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,onAddHistoryLog:$t,onNavigateToView:Tt}):va()):(["representative_commerce","representative_reconciliation"].includes(De)&&(n.permissions.accessRepresentativeCommerce?qt("accessRepresentativeCommerce")?va():t.jsx(VVe,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,initialTab:De==="representative_reconciliation"?"reconciliation":void 0,onAddHistoryLog:$t,onNavigateToView:Tt}):null))';

  if (content.includes(repOldRoute)) {
    content = content.replace(repOldRoute, repNewRoute);
    console.log(`- Replaced RepresentativeOrders with dedicated view in ${path.basename(filePath)}`);
  }

  // F. Add fiscal_xml_extraction to non-fallback whitelist
  if (!content.includes('"fiscal_xml_extraction",')) {
    content = content.replace(
      '!"dashboard","sales",',
      '!"dashboard","sales","fiscal_xml_extraction","fiscal_xml",'
    );
  }

  // G. Expedition / Shipping sales finalization logic in aVe
  // "onde se escolher expedição a venda não finaliza na venda finaliza após expedição e quando escolhe sem expedição finaliza já na venda"
  if (content.includes('if(it.receivableId=pt,o){')) {
    content = content.replace(
      'if(it.receivableId=pt,o){',
      'const _hasExp=Z!=="NONE";if(it.receivableId=pt,_hasExp){it.status="pending_expedition";it.saleStatus="EM_EXPEDICAO";it.isFinalized=!1;'
    );
    console.log(`- Updated sales checkout condition: expedition sales wait for expedition in ${path.basename(filePath)}`);
  }

  // When Sem Expedição (Z === "NONE"), finalize immediately on checkout
  if (content.includes('Venda Balcão Imediata (Sem Expedição - Baixa Direta)')) {
    content = content.replaceAll(
      'Venda Balcão Imediata (Sem Expedição - Baixa Direta)',
      'Venda Balcão Imediata (Sem Expedição - Finalizada na Venda)'
    );
    // Ensure it.status is completed and finalized
    content = content.replace(
      'it.notes=P?`${P} | Venda Balcão Imediata',
      'it.status="completed";it.saleStatus="FINALIZADA";it.isFinalized=!0;it.finalizedAt=nt;it.notes=P?`${P} | Venda Balcão Imediata'
    );
    console.log(`- Set instant finalization for non-expedition sales in ${path.basename(filePath)}`);
  }

  // H. Goods withdrawal finalization hooks: when status is ENTREGUE or RETIRADO, finalize sale in Ye.sales
  const withdrawalSavePattern = 'We=le=>{a(Ye=>{const Ue=(Ye.goodsWithdrawals||[]).map(bt=>bt.id===le.id?le:bt);return{...Ye,goodsWithdrawals:Ue}}),h&&h.id===le.id&&A(le)}';
  const withdrawalSaveReplacement = 'We=le=>{a(Ye=>{const Ue=(Ye.goodsWithdrawals||[]).map(bt=>bt.id===le.id?le:bt);const _sls=(le.status==="ENTREGUE"||le.status==="RETIRADO")?(Ye.sales||[]).map(sl=>sl.id===le.saleId||String(sl.code)===String(le.saleCode)?{...sl,status:"completed",saleStatus:"FINALIZADA",isFinalized:!0,finalizedAt:new Date().toISOString(),deliveredAt:new Date().toISOString()}:sl):Ye.sales;return{...Ye,goodsWithdrawals:Ue,sales:_sls}}),h&&h.id===le.id&&A(le)}';

  if (content.includes(withdrawalSavePattern)) {
    content = content.replace(withdrawalSavePattern, withdrawalSaveReplacement);
    console.log(`- Hooked withdrawal completion to finalize sales in ${path.basename(filePath)}`);
  }

  // I. Update status column badge in sales table list to show:
  // CANCELADA | AGUARDANDO EXPEDIÇÃO | FINALIZADA
  const oldSaleStatusBadge = 'ot?t.jsxs("span",{className:"px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold inline-flex items-center gap-1",children:[t.jsx(tu,{className:"w-3 h-3"})," CANCELADA"]}):t.jsxs("span",{className:"px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1",children:[t.jsx(Ma,{className:"w-3 h-3"})," PAGA"]})';
  const newSaleStatusBadge = '(()=>{if(ot)return t.jsxs("span",{className:"px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold inline-flex items-center gap-1",children:[t.jsx(tu,{className:"w-3 h-3"})," CANCELADA"]});const _isExpPending=(ye.freightType&&ye.freightType!=="NONE")&&(!ye.isFinalized&&ye.status!=="completed");if(_isExpPending)return t.jsxs("span",{className:"px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1 border border-amber-300",title:"Venda aguardando conclusão da expedição/entrega",children:[t.jsx(qo,{className:"w-3 h-3 text-amber-600"})," AGUARDANDO EXPEDIÇÃO"]});return t.jsxs("span",{className:"px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1",title:"Venda finalizada com sucesso",children:[t.jsx(Ma,{className:"w-3 h-3 text-emerald-600"}),ye.freightType!=="NONE"?" FINALIZADA (EXPEDIDA)":" FINALIZADA (BALCÃO)"]})})()';

  if (content.includes(oldSaleStatusBadge)) {
    content = content.replace(oldSaleStatusBadge, newSaleStatusBadge);
    console.log(`- Updated sales table status column badge in ${path.basename(filePath)}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

console.log('=== INTEGRATION COMPLETE ===');
