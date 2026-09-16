const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function main() {
  console.log('=== APLICANDO TODAS AS MELHORIAS DE ALINHAMENTO COMERCIAL & SINCRONIZAÇÃO EM TEMPO REAL ===');

  const publicBundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
  const backupBundlePath = path.resolve('public/assets/index-CUxTo0fH.js.bak');
  const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

  fs.copyFileSync(publicBundlePath, backupBundlePath);

  let bundle = fs.readFileSync(publicBundlePath, 'utf8');

  // -------------------------------------------------------------
  // 1. COMPILAR COMPONENTES COMERCIAIS & ZACARIAS COM ESBUILD
  // -------------------------------------------------------------
  console.log('1. Compilando CommercialIndustrialIndex.tsx + ZacariasAlignmentFeatures.tsx...');
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
  console.log(`Sucesso na compilação: ${compiledCode.length} bytes gerados.`);

  // -------------------------------------------------------------
  // 2. INJETAR / ATUALIZAR getIndComModule NO BUNDLE
  // -------------------------------------------------------------
  console.log('2. Injetando getIndComModule no bundle...');
  const pModuleStart = bundle.indexOf('function getIndComModule(reactInstance) {');
  if (pModuleStart === -1) {
    throw new Error('function getIndComModule não encontrada no bundle!');
  }
  const pModuleEnd = bundle.indexOf('function TVe(', pModuleStart);
  if (pModuleEnd === -1) {
    throw new Error('function TVe não encontrada após getIndComModule!');
  }

  const NEW_MODULE_CODE = `function getIndComModule(reactInstance) {
  if (window.__IndComModule && window.__IndComModule.WrappedCommercialClientesView) return window.__IndComModule;
  window.ReactInstance = reactInstance;
  ${compiledCode}
  const _moduleExports = typeof CommercialIndustrialExports !== "undefined" ? CommercialIndustrialExports : (window.CommercialIndustrialExports || {});
  window.CommercialIndustrialExports = _moduleExports;
  window.__IndComModule = _moduleExports;
  window.__ZacariasAlignmentFeatures = _moduleExports;
  return _moduleExports;
}\n`;

  bundle = bundle.substring(0, pModuleStart) + NEW_MODULE_CODE + bundle.substring(pModuleEnd);
  console.log('getIndComModule injetado com sucesso!');

  // -------------------------------------------------------------
  // 3. SINCRONIZAÇÃO EM TEMPO REAL MULTI-MÁQUINA NO Qre (DATABASE STORE)
  // -------------------------------------------------------------
  console.log('3. Injetando Sincronização em Tempo Real (SSE + Visibilidade + Intervalo)...');
  const qreConstructorMarker = 'this.isSaving=!1,this.inFlightGetPromise=null;window.__motorDeskDb=this';
  const pQre = bundle.indexOf(qreConstructorMarker);
  if (pQre === -1) {
    console.warn('Aviso: marcador Qre constructor não encontrado exato, verificando...');
  } else {
    const REALTIME_SYNC_CODE = `;if(typeof window!=="undefined"&&!window.__realtimeSyncStarted){window.__realtimeSyncStarted=!0;const _syncDb=()=>{if(!this.isSaving&&!this.pendingSaveDb){this.getDatabase().then(fd=>{if(fd&&this.onDataMergedCallback)this.onDataMergedCallback(fd);}).catch(()=>{});}};window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")_syncDb();});window.addEventListener("focus",_syncDb);try{const _es=new EventSource("/api/db/stream");_es.addEventListener("db_update",()=>{console.log("[REALTIME-SYNC] Evento de alteração recebido de outra máquina, sincronizando...");_syncDb();});_es.onerror=()=>{};}catch(e){}setInterval(()=>{if(document.visibilityState==="visible")_syncDb();},6000);}`;
    bundle = bundle.substring(0, pQre + qreConstructorMarker.length) + REALTIME_SYNC_CODE + bundle.substring(pQre + qreConstructorMarker.length);
    console.log('Sincronização multi-máquina injetada com sucesso no Qre!');
  }

  // -------------------------------------------------------------
  // 4. ATUALIZAR COe (RELATÓRIOS) COM COMPRAS POR CLIENTE, AUSENTES E CURVA ABC
  // -------------------------------------------------------------
  console.log('4. Injetando relatórios em COe...');
  const coeMarker = 'function COe({db:e,businessType:a="OFICINA",currentUser:s}){';
  const pCoe = bundle.indexOf(coeMarker);
  if (pCoe !== -1) {
    const COE_HEADER_INJECTION = `typeof getIndComModule==="function"&&getIndComModule(b);const _zacarias=window.__ZacariasAlignmentFeatures||window.CommercialIndustrialExports||{};`;
    bundle = bundle.substring(0, pCoe + coeMarker.length) + COE_HEADER_INJECTION + bundle.substring(pCoe + coeMarker.length);

    // Adicionar subtabs em l==="segment"
    const subtabsSegmentMarker = 'l==="segment"&&t.jsxs(t.Fragment,{children:[';
    const pSubtabsSeg = bundle.indexOf(subtabsSegmentMarker);
    if (pSubtabsSeg !== -1) {
      const NEW_SEGMENT_SUBTABS = `t.jsxs("button",{onClick:()=>p("client_purchases"),className:\`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 \${m==="client_purchases"?"border-indigo-600 text-indigo-600":"border-transparent text-slate-400 hover:text-slate-600"}\`,children:[t.jsx(Xn,{className:"w-3.5 h-3.5"})," Compras por Cliente (Analítico)"]}),t.jsxs("button",{onClick:()=>p("inactive_clients"),className:\`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 \${m==="inactive_clients"?"border-amber-600 text-amber-600":"border-transparent text-slate-400 hover:text-slate-600"}\`,children:[t.jsx(oi,{className:"w-3.5 h-3.5"})," Clientes Ausentes (>60 dias)"]}),`;
      bundle = bundle.substring(0, pSubtabsSeg + subtabsSegmentMarker.length) + NEW_SEGMENT_SUBTABS + bundle.substring(pSubtabsSeg + subtabsSegmentMarker.length);
      console.log('Subtabs de compras por cliente e clientes ausentes injetadas em COe!');
    }

    // Adicionar subtab em l==="stock"
    const subtabsStockMarker = 'l==="stock"&&t.jsxs(t.Fragment,{children:[';
    const pSubtabsStock = bundle.indexOf(subtabsStockMarker);
    if (pSubtabsStock !== -1) {
      const NEW_STOCK_SUBTAB = `t.jsxs("button",{onClick:()=>p("curva_abc"),className:\`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 \${m==="curva_abc"?"border-emerald-600 text-emerald-600":"border-transparent text-slate-400 hover:text-slate-600"}\`,children:[t.jsx(hs,{className:"w-3.5 h-3.5"})," Curva ABC de Produtos (80-15-5)"]}),`;
      bundle = bundle.substring(0, pSubtabsStock + subtabsStockMarker.length) + NEW_STOCK_SUBTAB + bundle.substring(pSubtabsStock + subtabsStockMarker.length);
      console.log('Subtab da Curva ABC injetada em COe!');
    }

    // Renderizar telas dos novos relatórios
    // No l==="stock": alternar entre curva_abc ou wOe
    const stockRenderMarker = 'l==="stock"&&t.jsx(wOe,{db:e,subType:m,startDate:f,endDate:A,searchTerm:N,selectedCategory:S,dormantCutoffDays:E})';
    const pStockRender = bundle.indexOf(stockRenderMarker);
    if (pStockRender !== -1) {
      const NEW_STOCK_RENDER = `l==="stock"&&(m==="curva_abc"?t.jsx((_zacarias.CurvaAbcReportView||"div"),{db:e,currentUser:s}):t.jsx(wOe,{db:e,subType:m,startDate:f,endDate:A,searchTerm:N,selectedCategory:S,dormantCutoffDays:E}))`;
      bundle = bundle.substring(0, pStockRender) + NEW_STOCK_RENDER + bundle.substring(pStockRender + stockRenderMarker.length);
      console.log('Render da Curva ABC substituído no estoque de COe!');
    }

    // No l==="segment"&&t.jsxs(t.Fragment,{children:[ ...
    const segmentRenderMarker = 'l==="segment"&&t.jsxs(t.Fragment,{children:[';
    const pSegRender = bundle.indexOf(segmentRenderMarker);
    if (pSegRender !== -1) {
      const NEW_SEG_RENDERS = `m==="client_purchases"&&t.jsx((_zacarias.ClientPurchasesReportView||"div"),{db:e,currentUser:s}),m==="inactive_clients"&&t.jsx((_zacarias.InactiveClientsReportView||"div"),{db:e,currentUser:s}),`;
      bundle = bundle.substring(0, pSegRender + segmentRenderMarker.length) + NEW_SEG_RENDERS + bundle.substring(pSegRender + segmentRenderMarker.length);
      console.log('Renders de compras e retenção injetados em COe!');
    }
  }

  // -------------------------------------------------------------
  // 5. ATUALIZAR ROe (CONTAS A RECEBER) COM COBRANÇA WHATSAPP/EMAIL/PIX E FILTROS
  // -------------------------------------------------------------
  console.log('5. Injetando modal de cobrança e filtros no Contas a Receber (ROe)...');
  const roeHeaderMarker = 'function ROe({db:e,currentUser:a,onSaveReceivables:s,onSaveFiscalDocuments:r,onSaveBoletos:n,onSaveDatabaseUpdates:i,onAddHistoryLog:o,setUnsavedTask:l}){var rt,vt,It,Lt,pa;const[c,d]=b.useState(""),[m,p]=b.useState("all"),[f,h]=b.useState("titles"),[A,v]=b.useState(!1),[N,w]=b.useState(null)';
  const pRoeHeader = bundle.indexOf(roeHeaderMarker);
  if (pRoeHeader !== -1) {
    const ROE_STATE_INJECTION = `,[_billingRec,_setBillingRec]=b.useState(null),[_fltClient,_setFltClient]=b.useState(""),[_fltDueStart,_setFltDueStart]=b.useState(""),[_fltDueEnd,_setFltDueEnd]=b.useState("")`;
    bundle = bundle.substring(0, pRoeHeader + roeHeaderMarker.length) + ROE_STATE_INJECTION + bundle.substring(pRoeHeader + roeHeaderMarker.length);
    console.log('Estados de cobrança e filtros injetados no cabeçalho de ROe!');

    // Atualizar filtro Kt em ROe para incluir cliente e período
    const ktMarker = 'Kt=Qt.filter(ve=>{const wt=ve.clientName.toLowerCase().includes(c.toLowerCase())||ve.code.toLowerCase().includes(c.toLowerCase())||ve.title.toLowerCase().includes(c.toLowerCase());return m==="all"?wt:wt&&ve.status===m})';
    const pKt = bundle.indexOf(ktMarker);
    if (pKt !== -1) {
      const NEW_KT_FILTER = `Kt=Qt.filter(ve=>{const wt=ve.clientName.toLowerCase().includes(c.toLowerCase())||ve.code.toLowerCase().includes(c.toLowerCase())||ve.title.toLowerCase().includes(c.toLowerCase());const matchStatus=m==="all"?wt:wt&&ve.status===m;const matchCli=!_fltClient||ve.clientId===_fltClient;const matchStart=!_fltDueStart||((ve.dueDate||ve.createdAt||"")>=_fltDueStart);const matchEnd=!_fltDueEnd||((ve.dueDate||ve.createdAt||"")<=_fltDueEnd);return matchStatus&&matchCli&&matchStart&&matchEnd})`;
      bundle = bundle.substring(0, pKt) + NEW_KT_FILTER + bundle.substring(pKt + ktMarker.length);
      console.log('Filtro Kt de ROe ampliado com cliente e período!');
    }

    // Injetar os seletores de cliente e data ao lado do seletor de status
    const filterToolbarMarker = 't.jsx("option",{value:"blocked_credit_limit",children:"Bloqueados (Crédito Excedido)"})]})]})]}),Kt.length===0?';
    const pFltToolbar = bundle.indexOf(filterToolbarMarker);
    if (pFltToolbar !== -1) {
      const NEW_FILTERS_HTML = `t.jsx("option",{value:"blocked_credit_limit",children:"Bloqueados (Crédito Excedido)"})]})]}),t.jsxs("div",{className:"flex flex-wrap items-center gap-2 w-full sm:w-auto",children:[t.jsxs("select",{value:_fltClient,onChange:ev=>_setFltClient(ev.target.value),className:"text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden font-medium text-slate-700 max-w-[200px]",children:[t.jsx("option",{value:"",children:"Filtrar por Cliente (Todos)"}),Ot.map(cl=>t.jsx("option",{value:cl.id,children:cl.name},cl.id))]}),t.jsx("input",{type:"date",value:_fltDueStart,onChange:ev=>_setFltDueStart(ev.target.value),className:"text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-slate-700",title:"Vencimento a partir de"}),t.jsx("span",{className:"text-xs text-slate-400",children:"até"}),t.jsx("input",{type:"date",value:_fltDueEnd,onChange:ev=>_setFltDueEnd(ev.target.value),className:"text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-slate-700",title:"Vencimento até"}),(_fltClient||_fltDueStart||_fltDueEnd)&&t.jsx("button",{type:"button",onClick:()=>{_setFltClient("");_setFltDueStart("");_setFltDueEnd("");},className:"text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 cursor-pointer",children:"Limpar"})]})]}),Kt.length===0?`;
      bundle = bundle.substring(0, pFltToolbar) + NEW_FILTERS_HTML + bundle.substring(pFltToolbar + filterToolbarMarker.length);
      console.log('Barra de filtros de cliente e período inserida em ROe!');
    }

    // Injetar botão "📲 Cobrança" na coluna de ações
    const rowActionBtnMarker = 't.jsxs("td",{className:"p-4 text-right space-x-1.5",children:[';
    const pRowAction = bundle.indexOf(rowActionBtnMarker);
    if (pRowAction !== -1) {
      const BILLING_BTN_HTML = `t.jsxs("button",{type:"button",onClick:()=>_setBillingRec(ve),className:"px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition inline-flex items-center gap-1 shadow-xs cursor-pointer",title:"Enviar cobrança via WhatsApp, E-mail ou PIX",children:["📲 Cobrança"]}),`;
      bundle = bundle.substring(0, pRowAction + rowActionBtnMarker.length) + BILLING_BTN_HTML + bundle.substring(pRowAction + rowActionBtnMarker.length);
      console.log('Botão de cobrança injetado na tabela de títulos de ROe!');
    }

    // Injetar render do modal SendReceivableToClientModal no final de ROe
    const roeEndTarget = 'paymentDetails:Q.paymentDetails})]})}function DOe(';
    const pRoeEnd = bundle.indexOf(roeEndTarget);
    if (pRoeEnd !== -1) {
      const ROE_MODAL_CODE = 'paymentDetails:Q.paymentDetails}),_billingRec&&typeof window!=="undefined"&&window.__ZacariasAlignmentFeatures&&window.__ZacariasAlignmentFeatures.SendReceivableToClientModal&&t.jsx(window.__ZacariasAlignmentFeatures.SendReceivableToClientModal,{receivable:_billingRec,client:Ot.find(c=>c.id===_billingRec.clientId),company:e.companyInfo,onClose:()=>_setBillingRec(null)})]})}function DOe(';
      bundle = bundle.replace(roeEndTarget, ROE_MODAL_CODE);
      console.log('Modal SendReceivableToClientModal injetado no final de ROe!');
    }
  }

  // -------------------------------------------------------------
  // LIMPEZA DE POSSÍVEL INJEÇÃO CORROMPIDA EM _Oe (ANTES DO XLSX)
  // -------------------------------------------------------------
  const xlsx = bundle.indexOf('/*! xlsx.js');
  if (xlsx !== -1) {
    const pModalInOe = bundle.indexOf(',_billingRec&&', xlsx - 600);
    if (pModalInOe !== -1) {
      console.log('Removendo injeção errônea de _billingRec em _Oe...');
      bundle = bundle.substring(0, pModalInOe) + '})]})})}' + bundle.substring(xlsx);
    }
  }

  // -------------------------------------------------------------
  // 6. SALVAR BUNDLES (PUBLIC E DIST)
  // -------------------------------------------------------------
  fs.writeFileSync(publicBundlePath, bundle, 'utf8');
  console.log(`Bundle público salvo com sucesso: ${bundle.length} bytes.`);

  if (fs.existsSync(distBundlePath)) {
    fs.writeFileSync(distBundlePath, bundle, 'utf8');
    console.log(`Bundle dist salvo com sucesso.`);
  }

  // -------------------------------------------------------------
  // VALIDAR SINTAXE JS COM O PARSER NATIVO DO NODE (V8)
  // -------------------------------------------------------------
  try {
    const { execSync } = require('child_process');
    execSync(`node --check ${publicBundlePath}`);
    console.log('Validação de sintaxe JS com V8 (node --check) passou com 100% de sucesso!');
  } catch (err) {
    console.error('Erro de sintaxe no bundle gerado:', err);
    throw err;
  }

  console.log('=== TODOS OS RECURSOS FORAM INTEGRADOS E SINCRONIZADOS COM ÊXITO! ===');
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
