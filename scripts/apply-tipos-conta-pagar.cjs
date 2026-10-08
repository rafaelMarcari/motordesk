/**
 * Contas a Pagar (WarelinePayablesFiltersView no bundle):
 *  - "Tipo de conta" no cadastro (tipos padrão + os cadastrados pela empresa em "Tipos de conta e recorrências");
 *  - periodicidade: fixa por tempo indeterminado, fixa por tempo determinado (meses ou até uma data),
 *    variável mensal, avulsa e parcelada;
 *  - gravação gera de fato os lançamentos (antes gravava um só, qualquer que fosse a opção);
 *  - lista sem lançamentos cancelados (recorrência encerrada) e só da empresa ativa.
 * Uso: node scripts/apply-tipos-conta-pagar.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const MARK = '/* MD-TIPOS-CONTA-v1 */';
if (bundle.includes(MARK)) { console.log('Já aplicado.'); process.exit(0); }

const ini = bundle.indexOf('var WarelinePayablesFiltersView');
const fim = bundle.indexOf('return WarelinePayablesFiltersView;', ini);
if (ini < 0 || fim < 0) { console.error('Componente WarelinePayablesFiltersView não encontrado.'); process.exit(1); }
let comp = bundle.slice(ini, fim);

function trocar(antes, depois, rotulo) {
  const n = comp.split(antes).length - 1;
  if (n !== 1) { console.error(`[${rotulo}] esperado 1 trecho, encontrado ${n}.`); process.exit(1); }
  comp = comp.replace(antes, () => depois);
  console.log(`[${rotulo}] ok`);
}
function trocarEntre(inicio, final, depois, rotulo) {
  const a = comp.indexOf(inicio);
  const b = a < 0 ? -1 : comp.indexOf(final, a + inicio.length);
  if (a < 0 || b < 0 || comp.indexOf(inicio, a + 1) >= 0) { console.error(`[${rotulo}] limites não encontrados ou repetidos.`); process.exit(1); }
  comp = comp.slice(0, a) + depois + comp.slice(b);
  console.log(`[${rotulo}] ok`);
}

// 1. Lista: sem cancelados e só da empresa ativa
trocar(
  'const payables = db.accountsPayable || [];',
  `${MARK} const payables = (db.accountsPayable || []).filter((p) => p && p.status !== "cancelled" && (!p.companyId || !db.companyInfo?.id || p.companyId === db.companyInfo.id));`,
  'lista'
);

// 2. Gravação: gera os lançamentos conforme a periodicidade
const fimCreate = comp.indexOf('setShowNewModal(false);\n  };', comp.indexOf('const handleCreatePayable = (e) => {'));
if (fimCreate < 0) { console.error('[gravacao] fim não encontrado'); process.exit(1); }
trocarEntre('const handleCreatePayable = (e) => {', 'setShowNewModal(false);\n  };', `const handleCreatePayable = (e) => {
    e.preventDefault();
    const tipo = newPayable.expenseType || "VARIAVEL";
    const base = Date.now();
    const cid = db.companyInfo?.id || currentUser?.companyId || "";
    const grupo = \`rec-\${base.toString(36)}\`;
    const venc0 = newPayable.dueDate || todayStr;
    const dia = Number(String(venc0).slice(8, 10)) || 1;
    const somaMes = (iso, n) => {
      const [y, m] = String(iso).split("-").map(Number);
      const t = (m - 1) + n;
      const ano = y + Math.floor(t / 12);
      const mes = t % 12;
      const ult = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      return \`\${ano}-\${String(mes + 1).padStart(2, "0")}-\${String(Math.min(dia, ult)).padStart(2, "0")}\`;
    };
    const valor = Number(newPayable.amount) || 0;
    const docNum = newPayable.docNumber || "";
    const desc = newPayable.notes || \`\${newPayable.accountTypeName || newPayable.category}\${docNum ? " - Doc " + docNum : ""}\`;
    const montar = (i, total, venc, amt, extra) => ({
      id: \`pay-\${base}-\${i}\`,
      companyId: cid || void 0,
      supplierName: newPayable.supplierName || "Fornecedor Geral",
      supplierCnpj: newPayable.supplierCnpj || "",
      supplierId: "sup-1",
      invoiceNumber: docNum || \`NF-\${Math.floor(1e3 + Math.random() * 9e3)}\`,
      category: newPayable.category,
      accountTypeId: newPayable.accountTypeId || "",
      accountTypeName: newPayable.accountTypeName || "",
      expenseType: tipo,
      amount: Number(Number(amt).toFixed(2)),
      remainingAmount: Number(Number(amt).toFixed(2)),
      paidAmount: 0,
      dueDate: venc,
      date: newPayable.emissionDate || todayStr,
      emissionDate: newPayable.emissionDate || todayStr,
      status: "pending",
      installment: total ? \`\${String(i + 1).padStart(2, "0")}/\${String(total).padStart(2, "0")}\` : \`Mês \${i + 1}\`,
      description: desc,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...extra
    });
    let entries = [];
    if (tipo === "PARCELADA") {
      const parcelas = (newPayable.installments || []).length ? newPayable.installments : [{ dueDate: venc0, amount: valor }];
      entries = parcelas.map((p, i) => montar(i, parcelas.length, p.dueDate || somaMes(venc0, i), Number(p.amount) || 0, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: parcelas.length } }));
    } else if (tipo === "FIXA_MENSAL") {
      const n = Math.max(1, Math.min(120, Number(newPayable.replicateMonths) || 12));
      entries = Array.from({ length: n }, (_, i) => montar(i, n, somaMes(venc0, i), valor, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: n, fim: somaMes(venc0, n - 1), diaVencimento: dia, valorBase: valor } }));
    } else if (tipo === "FIXA_INDETERMINADA" || tipo === "VARIAVEL_MENSAL") {
      entries = Array.from({ length: 12 }, (_, i) => montar(i, 0, somaMes(venc0, i), valor, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: null, ativo: true, diaVencimento: dia, valorBase: valor, valorEstimado: tipo === "VARIAVEL_MENSAL" } }));
    } else {
      entries = [montar(0, 1, venc0, valor, {})];
      entries[0].installment = newPayable.installment || "01/01";
    }
    if (entries.length === 0 || entries.some((x) => !x.dueDate || !/^\\d{4}-\\d{2}-\\d{2}$/.test(x.dueDate))) {
      alert("Informe o vencimento de todos os lançamentos.");
      return;
    }
    onSavePayables([...entries, ...payables]);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: "CREATE_PAYABLE",
        description: \`\${entries.length} lançamento(s) de conta a pagar (\${newPayable.accountTypeName || newPayable.category}) cadastrado(s): total R$ \${entries.reduce((s, x) => s + x.amount, 0).toFixed(2)}.\`,
        user: currentUser?.name || "Administrador",
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    `, 'gravacao');

// 3. Tipo de conta + 5 periodicidades no lugar dos 3 botões
trocarEntre(
  '/* @__PURE__ */ jsxs2("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2", children: [\n          /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: "Tipo de Despesa & Periodicidade *" }),',
  '/* @__PURE__ */ jsxs2("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [\n          /* @__PURE__ */ jsxs2("div", { children: [\n            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Beneficiário / Fornecedor *" }),',
  `(() => {
          const __cid = db.companyInfo?.id || "";
          const __proprios = (db.accountTypes || []).filter((t) => t && t.ativo !== false && (!t.companyId || !__cid || t.companyId === __cid));
          const __nomes = new Set(__proprios.map((t) => String(t.nome).toLowerCase()));
          const __tipos = [...__proprios, ...(window.__MD_TIPOS_CONTA_PADRAO || []).filter((t) => !__nomes.has(String(t.nome).toLowerCase()))];
          const __PER = [
            ["FIXA_INDETERMINADA", "🔁 Fixa – tempo indeterminado", "Mesmo valor todo mês, sem data para acabar"],
            ["FIXA_MENSAL", "📆 Fixa – tempo determinado", "Mesmo valor por N meses ou até uma data"],
            ["VARIAVEL_MENSAL", "📈 Variável mensal", "Todo mês, valor muda (lança estimativa)"],
            ["VARIAVEL", "⚡ Avulsa / pontual", "Uma vez só, sem repetição"],
            ["PARCELADA", "📑 Parcelada / boleto", "Parcelas com datas e valores próprios"]
          ];
          const __escolher = (per) => {
            if (per === "PARCELADA") handleInstallmentCountChange(newPayable.installmentCount || 3);
            setNewPayable((prev) => ({ ...prev, expenseType: per }));
          };
          return /* @__PURE__ */ jsxs2("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2", children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-end gap-2", children: [
              /* @__PURE__ */ jsxs2("label", { className: "flex-1 min-w-[220px] block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: [
                "Tipo de conta",
                /* @__PURE__ */ jsxs2("select", {
                  id: "md-pay-tipo-conta",
                  value: newPayable.accountTypeId || "",
                  onChange: (e) => {
                    const t = __tipos.find((x) => x.id === e.target.value);
                    if (!t) { setNewPayable((prev) => ({ ...prev, accountTypeId: "", accountTypeName: "" })); return; }
                    if (t.periodicidade === "PARCELADA") handleInstallmentCountChange(newPayable.installmentCount || 3);
                    setNewPayable((prev) => ({ ...prev, accountTypeId: t.id, accountTypeName: t.nome, category: t.categoria || prev.category, expenseType: t.periodicidade || prev.expenseType, replicateMonths: t.meses || prev.replicateMonths }));
                  },
                  className: "mt-1 w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold normal-case tracking-normal text-slate-800 bg-white",
                  children: [
                    /* @__PURE__ */ jsx2("option", { value: "", children: "Selecione o tipo (Salários, Aluguel, Energia...)" }),
                    ...__tipos.map((t) => /* @__PURE__ */ jsx2("option", { value: t.id, children: t.nome }, t.id))
                  ]
                })
              ] }),
              /* @__PURE__ */ jsx2("button", { type: "button", id: "md-pay-cadastrar-tipos", onClick: () => window.MotorDeskOpenTiposConta && window.MotorDeskOpenTiposConta("tipos"), className: "px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 font-bold text-[11px] hover:bg-indigo-50 cursor-pointer", children: "+ Cadastrar tipos" })
            ] }),
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: "Periodicidade *" }),
            /* @__PURE__ */ jsx2("div", { className: "grid gap-2", style: { gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }, children: __PER.map(([per, titulo, descricao]) => /* @__PURE__ */ jsxs2("button", {
              type: "button",
              "data-periodicidade": per,
              onClick: () => __escolher(per),
              className: \`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 \${newPayable.expenseType === per ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-100"}\`,
              children: [
                /* @__PURE__ */ jsx2("span", { className: "font-bold text-slate-900 text-[11px]", children: titulo }),
                /* @__PURE__ */ jsx2("span", { className: "text-[10px] text-slate-600 leading-tight", children: descricao })
              ]
            }, per)) })
          ] });
        })(),
        `,
  'tipo e periodicidade'
);

// 4. Painéis por periodicidade (tempo determinado / indeterminado / variável mensal)
trocarEntre(
  'newPayable.expenseType === "FIXA_MENSAL" && /* @__PURE__ */ jsxs2("div", { className: "p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2", children: [',
  'newPayable.expenseType === "PARCELADA" && /* @__PURE__ */ jsxs2("div", { className: "p-3.5 bg-emerald-50/70',
  `newPayable.expenseType === "FIXA_MENSAL" && /* @__PURE__ */ jsxs2("div", { className: "p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2", children: [
          /* @__PURE__ */ jsx2("span", { className: "font-bold text-sky-950 text-xs", children: "📆 Tempo determinado" }),
          /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center gap-2 text-xs text-sky-900 font-bold", children: [
            /* @__PURE__ */ jsx2("span", { children: "Quantidade de meses:" }),
            /* @__PURE__ */ jsx2("input", {
              type: "number", min: 1, max: 120, id: "md-pay-meses",
              value: newPayable.replicateMonths || 12,
              onChange: (e) => setNewPayable({ ...newPayable, endDate: "", replicateMonths: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }),
              className: "w-20 bg-white border border-sky-300 rounded px-2 py-1 text-xs font-bold"
            }),
            /* @__PURE__ */ jsx2("span", { children: "ou até a data:" }),
            /* @__PURE__ */ jsx2("input", {
              type: "date", id: "md-pay-ate",
              value: newPayable.endDate || "",
              onChange: (e) => {
                const fimData = e.target.value;
                const iniData = newPayable.dueDate || todayStr;
                let n = 1;
                if (fimData && fimData >= iniData) {
                  const [y1, m1, d1] = iniData.split("-").map(Number);
                  const [y2, m2, d2] = fimData.split("-").map(Number);
                  n = (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 1 : 0);
                }
                setNewPayable({ ...newPayable, endDate: fimData, replicateMonths: Math.max(1, Math.min(120, n)) });
              },
              className: "bg-white border border-sky-300 rounded px-2 py-1 text-xs font-bold"
            })
          ] }),
          /* @__PURE__ */ jsx2("p", { className: "text-[11px] text-sky-800", children: \`Serão gerados \${newPayable.replicateMonths || 12} lançamentos de R$ \${(Number(newPayable.amount) || 0).toFixed(2)}, com vencimento no dia \${(newPayable.dueDate || todayStr).slice(-2)} de cada mês.\` })
        ] }),
        (newPayable.expenseType === "FIXA_INDETERMINADA" || newPayable.expenseType === "VARIAVEL_MENSAL") && /* @__PURE__ */ jsxs2("div", { className: "p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1", children: [
          /* @__PURE__ */ jsx2("span", { className: "font-bold text-indigo-950 text-xs", children: newPayable.expenseType === "FIXA_INDETERMINADA" ? "🔁 Tempo indeterminado" : "📈 Variável mensal" }),
          /* @__PURE__ */ jsx2("p", { className: "text-[11px] text-indigo-800", children: newPayable.expenseType === "FIXA_INDETERMINADA"
            ? \`Lança os próximos 12 meses de R$ \${(Number(newPayable.amount) || 0).toFixed(2)} no dia \${(newPayable.dueDate || todayStr).slice(-2)} e continua lançando todo mês, até a recorrência ser encerrada em "Tipos de conta e recorrências".\`
            : \`Lança os próximos 12 meses com o valor estimado de R$ \${(Number(newPayable.amount) || 0).toFixed(2)}. Quando a conta do mês chegar, ajuste o valor do lançamento. Continua lançando todo mês até ser encerrada.\` })
        ] }),
        `,
  'paineis'
);

// 5. Texto do botão de gravar
trocar(
  'children: newPayable.expenseType === "FIXA_MENSAL" ? `Gerar ${newPayable.replicateMonths || 12} Lançamentos Mensais` :',
  'children: newPayable.expenseType === "FIXA_INDETERMINADA" || newPayable.expenseType === "VARIAVEL_MENSAL" ? "Gerar 12 Lançamentos (renova todo mês)" : newPayable.expenseType === "FIXA_MENSAL" ? `Gerar ${newPayable.replicateMonths || 12} Lançamentos Mensais` :',
  'botao'
);

bundle = bundle.slice(0, ini) + comp + bundle.slice(fim);
fs.writeFileSync(bundlePath, bundle);
const dist = path.resolve(__dirname, '..', 'dist/assets/index-CUxTo0fH.js');
if (fs.existsSync(path.dirname(dist))) fs.writeFileSync(dist, bundle);
console.log('Contas a Pagar atualizada.');
