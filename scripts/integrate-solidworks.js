import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const publicAsset = path.resolve('public/assets/index-CUxTo0fH.js');
const distAsset = path.resolve('dist/assets/index-CUxTo0fH.js');

console.log('1. Compiling SolidWorksCADIntegrationView...');
const buildResult = await esbuild.build({
  entryPoints: ['src/components/SolidWorksCADIntegrationView.tsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  write: false
});

let code = buildResult.outputFiles[0].text;
// Rename exports and hooks to match bundle context
code = code.replace(/import\s*\{[^}]*\}\s*from\s*["']react["'];?/g, '');
code = code.replace(/import\s*\{[^}]*\}\s*from\s*["']react\/jsx-runtime["'];?/g, '');
code = code.replace(/export\s*\{[^}]*\};?/g, '');
code = code.replace(/\bjsx\(/g, 'import_jsx_runtime6.jsx(');
code = code.replace(/\bjsxs\(/g, 'import_jsx_runtime6.jsxs(');
code = code.replace(/function SolidWorksCADIntegrationView\(/, 'function IndustrialSolidWorksCADView(');

console.log('2. Processing bundles...');
for (const filePath of [publicAsset, distAsset]) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already injected
  if (!content.includes('WrappedSolidWorksIntegrationView: () => WrappedSolidWorksIntegrationView')) {
    content = content.replace(
      'WrappedEngenhariaUnidadesView: () => WrappedEngenhariaUnidadesView',
      'WrappedEngenhariaUnidadesView: () => WrappedEngenhariaUnidadesView,\n    WrappedSolidWorksIntegrationView: () => WrappedSolidWorksIntegrationView'
    );
  }

  // Inject IndustrialSolidWorksCADView if not present
  if (!content.includes('function IndustrialSolidWorksCADView(')) {
    const targetMarker = '  function IndustrialUnidadesMedidaView() {';
    if (content.includes(targetMarker)) {
      content = content.replace(
        targetMarker,
        `${code}\n\n${targetMarker}`
      );
    } else {
      console.error(`Marker not found in ${filePath}`);
    }
  }

  // Inject WrappedSolidWorksIntegrationView if not present
  if (!content.includes('function WrappedSolidWorksIntegrationView(')) {
    const targetWrapper = '  function WrappedEngenhariaUnidadesView(props) {\n    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(IndustrialUnidadesMedidaView, {});\n  }';
    const newWrapper = `  function WrappedSolidWorksIntegrationView(props) {
    if (!checkUserPerm(props.currentUser, "accessEngineering", props.db)) {
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AccessDeniedView, { title: "Integração CAD SolidWorks", permKey: "accessEngineering" });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(IndustrialSolidWorksCADView, { ...props });
  }\n${targetWrapper}`;

    if (content.includes(targetWrapper)) {
      content = content.replace(targetWrapper, newWrapper);
    } else {
      console.error(`targetWrapper not found in ${filePath}`);
    }
  }

  // Inject Route in TVe if not present
  if (!content.includes('m === "cad_solidworks_integrations"')) {
    const targetRoute = '      if (m === "ind_eng_unidades_tab") {\n        return b.createElement(indCom.WrappedEngenhariaUnidadesView, {\n          currentUser: a,\n          currentCompany: s\n        });\n      }';
    const newRoute = `      if (m === "cad_solidworks_integrations" || m === "ind_eng_solidworks") {
        return b.createElement(indCom.WrappedSolidWorksIntegrationView, {
          currentUser: a,
          currentCompany: s,
          db: e,
          boms: N,
          parts: S,
          productionOrders: w,
          onUpdateDb: i,
          onAddHistoryLog: o,
          onNavigateToView: l,
          onNavigateTab: p
        });
      }\n${targetRoute}`;

    if (content.includes(targetRoute)) {
      content = content.replace(targetRoute, newRoute);
    } else {
      console.error(`targetRoute not found in ${filePath}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

console.log('SolidWorks CAD integration injected successfully into bundles.');
