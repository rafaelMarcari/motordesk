const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

async function run() {
  console.log("=== REFINANDO INTEGRAÇÃO DE TVe COM OS DASHBOARDS COMERCIAIS ===");

  const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
  let bundle = fs.readFileSync(bundlePath, "utf8");

  // 1. Compilar componentes
  const reactShimPlugin = {
    name: "react-shim",
    setup(build) {
      build.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "react-shim" }));
      build.onLoad({ filter: /.*/, namespace: "react-shim" }, () => ({
        contents: `
          export default window.ReactInstance;
          export const useState = (...args) => window.ReactInstance.useState(...args);
          export const useMemo = (...args) => window.ReactInstance.useMemo(...args);
          export const useEffect = (...args) => window.ReactInstance.useEffect(...args);
          export const useCallback = (...args) => window.ReactInstance.useCallback(...args);
        `,
        loader: "js"
      }));
    }
  };

  const compiled = await esbuild.build({
    entryPoints: [path.join(__dirname, "../src/components/CommercialIndustrialIndex.tsx")],
    bundle: true,
    format: "iife",
    globalName: "IndustrialCommercialModule",
    jsx: "transform",
    jsxFactory: "window.ReactInstance.createElement",
    jsxFragment: "window.ReactInstance.Fragment",
    plugins: [reactShimPlugin],
    minify: true,
    write: false,
  });

  const compiledCode = compiled.outputFiles[0].text;

  // 2. Injetar getIndComModule antes de TVe
  const initModuleCode = `
function getIndComModule(reactInstance) {
  if (window.__IndComModule) return window.__IndComModule;
  window.ReactInstance = reactInstance;
  ${compiledCode}
  window.__IndComModule = IndustrialCommercialModule;
  return IndustrialCommercialModule;
}
`;

  const pTVe = bundle.indexOf("function TVe(");
  const pOldInit = bundle.indexOf("function getIndComModule(");
  if (pOldInit !== -1 && pOldInit < pTVe) {
    bundle = bundle.substring(0, pOldInit) + initModuleCode + bundle.substring(pTVe);
  } else {
    bundle = bundle.substring(0, pTVe) + initModuleCode + bundle.substring(pTVe);
  }

  // 3. No início de TVe, remover os returns prematuros e apenas inicializar indCom
  // Procurar por "const indCom = getIndComModule(b);"
  const pIndCom = bundle.indexOf("const indCom = getIndComModule(b);");
  if (pIndCom !== -1) {
    const pEndPremature = bundle.indexOf('if (m === "after_sales")', pIndCom);
    const pEndBlock = bundle.indexOf('    }', pEndPremature);
    // Substituir todo o bloco prematuro por apenas: const indCom = getIndComModule(b);
    bundle = bundle.substring(0, pIndCom) + "const indCom = getIndComModule(b);" + bundle.substring(pEndBlock + 5);
    console.log("Removido retornos prematuros do início de TVe");
  }

  // 4. No JSX de TVe, substituir a renderização de m === "commercial" e m === "after_sales"
  const oldCommercialJsx = `m==="commercial"&&t.jsx(NVe,{clients:L,budgets:R,sales:Z,currentUser:a,currentCompanyId:(s==null?void 0:s.id)||"comp-1",onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:xe=>{xe==="after_sales"&&p("after_sales")}}),m==="after_sales"&&t.jsx(bVe,{tickets:V,clients:L,currentUser:a,currentCompanyId:(s==null?void 0:s.id)||"comp-1",onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l})`;

  const newCommercialJsx = `
m==="dash_comercial"&&b.createElement(indCom.WrappedCommercialMarketingView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p}),
m==="ind_com_orcamentos_tab"&&b.createElement(indCom.WrappedCommercialOrcamentosView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p}),
m==="ind_com_pedidos_tab"&&b.createElement(indCom.WrappedCommercialPedidosView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p}),
m==="ind_com_carteira_tab"&&b.createElement(indCom.WrappedCommercialCarteiraView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p}),
m==="after_sales"&&b.createElement(indCom.WrappedCommercialPosVendaView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p}),
m==="commercial"&&b.createElement(indCom.WrappedCommercialOrcamentosView,{currentUser:a,currentCompany:s,db:e,onUpdateDb:i,onAddHistoryLog:o,onNavigateToView:l,onSelectSubTab:p})
`.trim();

  if (bundle.includes(oldCommercialJsx)) {
    bundle = bundle.replace(oldCommercialJsx, newCommercialJsx);
    console.log("Substituído JSX de m===commercial pelo novo conjunto de 5 telas ricas dentro do container de TVe!");
  } else {
    console.log("Verificando se JSX já havia sido atualizado...");
  }

  // 5. Validar integridade com esbuild
  console.log("Validando sintaxe...");
  esbuild.transformSync(bundle, { loader: "js" });
  console.log("Sintaxe válida!");

  // 6. Escrever arquivo
  fs.writeFileSync(bundlePath, bundle, "utf8");
  const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");
  if (fs.existsSync(distBundlePath)) {
    fs.writeFileSync(distBundlePath, bundle, "utf8");
    console.log("Copiado bundle também para dist/assets");
  }

  console.log("Refinamento concluído com sucesso!");
}

run().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
