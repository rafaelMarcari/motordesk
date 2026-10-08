/**
 * Contas a Pagar e Contas a Receber (WarelinePayablesFiltersView / WarelineReceivablesFiltersView):
 * as telas chamavam a gravação só com a lista de títulos, mas a gravação do aplicativo também espera as
 * movimentações financeiras (e, no Receber, clientes e notificações) da empresa — sem elas a tela quebrava
 * ao dar baixa, reagendar, cadastrar ou excluir. Aqui as listas atuais da empresa ativa são repassadas.
 * As listas de títulos também passam a mostrar só a empresa ativa (evita gravar título de outra empresa).
 * Uso: node scripts/fix-salvar-contas-pagar-receber.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const MARK = '/* MD-SALVAR-FIN-v1 */';
if (bundle.includes(MARK)) { console.log('Já aplicado.'); process.exit(0); }

function trocar(antes, depois, rotulo) {
  const n = bundle.split(antes).length - 1;
  if (n !== 1) { console.error(`[${rotulo}] esperado 1 trecho, encontrado ${n}.`); process.exit(1); }
  bundle = bundle.replace(antes, () => depois);
  console.log(`[${rotulo}] ok`);
}

const empresa = `const __mdCid = db.companyInfo?.id || currentUser?.companyId || "comp-1";
  const __mdDaEmpresa = (lista) => (lista || []).filter((x) => x && (x.companyId || "comp-1") === __mdCid);`;

trocar(
  'function WarelinePayablesFiltersView({\n  db,\n  currentUser,\n  onSavePayables,\n  onAddHistoryLog,\n  onNavigate\n}) {',
  `function WarelinePayablesFiltersView({
  db,
  currentUser,
  onSavePayables,
  onAddHistoryLog,
  onNavigate
}) {
  ${MARK}
  ${empresa}
  const __mdSalvarPagar = onSavePayables;
  onSavePayables = (lista, movimentos, categorias) => __mdSalvarPagar(lista, movimentos || __mdDaEmpresa(db.financialTransactions), categorias);`,
  'pagar: gravação'
);

trocar(
  'function WarelineReceivablesFiltersView({\n  db,\n  currentUser,\n  onSaveReceivables,\n  onAddHistoryLog,\n  onNavigate\n}) {',
  `function WarelineReceivablesFiltersView({
  db,
  currentUser,
  onSaveReceivables,
  onAddHistoryLog,
  onNavigate
}) {
  ${empresa}
  const __mdSalvarReceber = onSaveReceivables;
  onSaveReceivables = (lista, clientes, movimentos, notificacoes, formas) => __mdSalvarReceber(lista, clientes || __mdDaEmpresa(db.clients), movimentos || __mdDaEmpresa(db.financialTransactions), notificacoes || __mdDaEmpresa(db.notifications), formas);`,
  'receber: gravação'
);

trocar(
  'const receivables = db.accountsReceivable || [];\n  const filteredList = useMemo2(() => {',
  'const receivables = (db.accountsReceivable || []).filter((r) => r && r.status !== "cancelled" && (!r.companyId || r.companyId === __mdCid));\n  const filteredList = useMemo2(() => {',
  'receber: lista da empresa'
);

fs.writeFileSync(bundlePath, bundle);
const dist = path.resolve(__dirname, '..', 'dist/assets/index-CUxTo0fH.js');
if (fs.existsSync(path.dirname(dist))) fs.writeFileSync(dist, bundle);
console.log('Gravação de Contas a Pagar/Receber corrigida.');
