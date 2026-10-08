/**
 * Contas a Receber (WarelineReceivablesFiltersView no bundle):
 *  - "Tipo de conta" no cadastro do título (tipos padrão + os cadastrados pela empresa);
 *  - periodicidade: fixa por tempo indeterminado, fixa por tempo determinado (meses ou até uma data),
 *    variável mensal, avulsa e parcelada (valor total dividido em N parcelas mensais);
 *  - a gravação gera os títulos conforme a periodicidade (antes gravava sempre um só).
 * Requer scripts/fix-salvar-contas-pagar-receber.cjs aplicado antes.
 * Uso: node scripts/apply-tipos-conta-receber.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const MARK = '/* MD-TIPOS-CONTA-RECEBER-v1 */';
if (bundle.includes(MARK)) { console.log('Já aplicado.'); process.exit(0); }
if (!bundle.includes('/* MD-SALVAR-FIN-v1 */')) { console.error('Aplique antes scripts/fix-salvar-contas-pagar-receber.cjs'); process.exit(1); }

const ini = bundle.indexOf('var WarelineReceivablesFiltersView');
const fim = bundle.indexOf('return WarelineReceivablesFiltersView;', ini);
if (ini < 0 || fim < 0) { console.error('Componente WarelineReceivablesFiltersView não encontrado.'); process.exit(1); }
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

// 1. Gravação conforme a periodicidade
trocarEntre('const handleCreateTitle = (e) => {', '    if (onAddHistoryLog) {\n      onAddHistoryLog({\n        action: "CREATE_RECEIVABLE",', `${MARK}
  const handleCreateTitle = (e) => {
    e.preventDefault();
    const tipo = newTitle.expenseType || "VARIAVEL";
    const base = Date.now();
    const grupo = \`rrec-\${base.toString(36)}\`;
    const venc0 = newTitle.dueDate || todayStr;
    const dia = Number(String(venc0).slice(8, 10)) || 1;
    const somaMes = (iso, n) => {
      const [y, m] = String(iso).split("-").map(Number);
      const t = (m - 1) + n;
      const ano = y + Math.floor(t / 12);
      const mes = t % 12;
      const ult = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      return \`\${ano}-\${String(mes + 1).padStart(2, "0")}-\${String(Math.min(dia, ult)).padStart(2, "0")}\`;
    };
    const valor = Number(newTitle.amount) || 0;
    const docNum = newTitle.docNumber || "";
    const desc = newTitle.notes || \`\${newTitle.accountTypeName || newTitle.category}\${docNum ? " - Doc " + docNum : ""}\`;
    const montar = (i, total, venc, amt, extra) => ({
      id: \`rec-\${base}-\${i}\`,
      companyId: __mdCid || void 0,
      clientName: newTitle.clientName || "Cliente Geral",
      clientId: newTitle.clientId || "cli-1",
      invoiceNumber: docNum || \`NF-\${Math.floor(1e3 + Math.random() * 9e3)}\`,
      category: newTitle.category,
      accountTypeId: newTitle.accountTypeId || "",
      accountTypeName: newTitle.accountTypeName || "",
      expenseType: tipo,
      amount: Number(Number(amt).toFixed(2)),
      remainingAmount: Number(Number(amt).toFixed(2)),
      paidAmount: 0,
      dueDate: venc,
      date: newTitle.emissionDate || todayStr,
      emissionDate: newTitle.emissionDate || todayStr,
      status: "pending",
      installment: total ? \`\${String(i + 1).padStart(2, "0")}/\${String(total).padStart(2, "0")}\` : \`Mês \${i + 1}\`,
      description: desc,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...extra
    });
    let entries = [];
    if (tipo === "PARCELADA") {
      const n = Math.max(2, Math.min(48, Number(newTitle.installmentCount) || 2));
      const parte = Math.floor((valor / n) * 100) / 100;
      entries = Array.from({ length: n }, (_, i) => montar(i, n, somaMes(venc0, i), i === n - 1 ? valor - parte * (n - 1) : parte, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: n } }));
    } else if (tipo === "FIXA_MENSAL") {
      const n = Math.max(1, Math.min(120, Number(newTitle.replicateMonths) || 12));
      entries = Array.from({ length: n }, (_, i) => montar(i, n, somaMes(venc0, i), valor, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: n, fim: somaMes(venc0, n - 1), diaVencimento: dia, valorBase: valor } }));
    } else if (tipo === "FIXA_INDETERMINADA" || tipo === "VARIAVEL_MENSAL") {
      entries = Array.from({ length: 12 }, (_, i) => montar(i, 0, somaMes(venc0, i), valor, { recurrence: { groupId: grupo, tipo, indice: i + 1, total: null, ativo: true, diaVencimento: dia, valorBase: valor, valorEstimado: tipo === "VARIAVEL_MENSAL" } }));
    } else {
      entries = [montar(0, 1, venc0, valor, {})];
      entries[0].installment = newTitle.installment || "01/01";
    }
    if (entries.length === 0 || entries.some((x) => !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(x.dueDate)))) {
      alert("Informe a data de vencimento.");
      return;
    }
    const entry = entries[0];
    const newId = entries.length > 1 ? \`\${entries.length} títulos\` : entry.id;
    onSaveReceivables([...entries, ...receivables]);
`, 'gravacao');

// texto do histórico: valor total quando gera vários títulos
trocar('description: `T\\xEDtulo a receber #${newId} no valor de R$ ${entry.amount.toFixed(2)} criado.`,',
  'description: `Título a receber (${newTitle.accountTypeName || newTitle.category}) #${newId} criado: total R$ ${entries.reduce((s, x) => s + x.amount, 0).toFixed(2)}.`,',
  'historico');

// 2. Tipo de conta + periodicidade no início do formulário
trocar(
  '/* @__PURE__ */ jsxs2("form", { onSubmit: handleCreateTitle, className: "p-4 space-y-3 text-xs", children: [',
  `/* @__PURE__ */ jsxs2("form", { onSubmit: handleCreateTitle, className: "p-4 space-y-3 text-xs", children: [
        (() => {
          const __proprios = (db.accountTypes || []).filter((t) => t && t.ativo !== false && t.natureza === "receber" && (!t.companyId || t.companyId === __mdCid));
          const __nomes = new Set(__proprios.map((t) => String(t.nome).toLowerCase()));
          const __tipos = [...__proprios, ...(window.__MD_TIPOS_CONTA_PADRAO_RECEBER || []).filter((t) => !__nomes.has(String(t.nome).toLowerCase()))];
          const __per = newTitle.expenseType || "VARIAVEL";
          const __PER = [
            ["FIXA_INDETERMINADA", "🔁 Fixa – tempo indeterminado", "Mesmo valor todo mês, sem data para acabar"],
            ["FIXA_MENSAL", "📆 Fixa – tempo determinado", "Mesmo valor por N meses ou até uma data"],
            ["VARIAVEL_MENSAL", "📈 Variável mensal", "Todo mês, valor muda (lança estimativa)"],
            ["VARIAVEL", "⚡ Avulsa / pontual", "Um título só, sem repetição"],
            ["PARCELADA", "📑 Parcelada", "Valor total dividido em parcelas mensais"]
          ];
          const __meses = (fimData) => {
            const iniData = newTitle.dueDate || todayStr;
            if (!fimData || fimData < iniData) return 1;
            const [y1, m1, d1] = iniData.split("-").map(Number);
            const [y2, m2, d2] = fimData.split("-").map(Number);
            return Math.max(1, Math.min(120, (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 1 : 0)));
          };
          const __valor = (Number(newTitle.amount) || 0).toFixed(2);
          return /* @__PURE__ */ jsxs2("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2", children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-end gap-2", children: [
              /* @__PURE__ */ jsxs2("label", { className: "flex-1 min-w-[220px] block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: [
                "Tipo de conta",
                /* @__PURE__ */ jsxs2("select", {
                  id: "md-rec-tipo-conta",
                  value: newTitle.accountTypeId || "",
                  onChange: (e) => {
                    const t = __tipos.find((x) => x.id === e.target.value);
                    if (!t) { setNewTitle((prev) => ({ ...prev, accountTypeId: "", accountTypeName: "" })); return; }
                    setNewTitle((prev) => ({ ...prev, accountTypeId: t.id, accountTypeName: t.nome, category: t.categoria || prev.category, expenseType: t.periodicidade || prev.expenseType, replicateMonths: t.meses || prev.replicateMonths || 12, installmentCount: prev.installmentCount || 3 }));
                  },
                  className: "mt-1 w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold normal-case tracking-normal text-slate-800 bg-white",
                  children: [
                    /* @__PURE__ */ jsx2("option", { value: "", children: "Selecione o tipo (mensalidade, comissão, venda a prazo...)" }),
                    ...__tipos.map((t) => /* @__PURE__ */ jsx2("option", { value: t.id, children: t.nome }, t.id))
                  ]
                })
              ] }),
              /* @__PURE__ */ jsx2("button", { type: "button", id: "md-rec-cadastrar-tipos", onClick: () => window.MotorDeskOpenTiposConta && window.MotorDeskOpenTiposConta("tipos", "receber"), className: "px-3 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 font-bold text-[11px] hover:bg-indigo-50 cursor-pointer", children: "+ Cadastrar tipos" })
            ] }),
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: "Periodicidade *" }),
            /* @__PURE__ */ jsx2("div", { className: "grid gap-2", style: { gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }, children: __PER.map(([per, titulo, descricao]) => /* @__PURE__ */ jsxs2("button", {
              type: "button",
              "data-periodicidade-rec": per,
              onClick: () => setNewTitle((prev) => ({ ...prev, expenseType: per, replicateMonths: prev.replicateMonths || 12, installmentCount: prev.installmentCount || 3 })),
              className: \`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 \${__per === per ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-100"}\`,
              children: [
                /* @__PURE__ */ jsx2("span", { className: "font-bold text-slate-900 text-[11px]", children: titulo }),
                /* @__PURE__ */ jsx2("span", { className: "text-[10px] text-slate-600 leading-tight", children: descricao })
              ]
            }, per)) }),
            __per === "FIXA_MENSAL" && /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center gap-2 p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-bold", children: [
              /* @__PURE__ */ jsx2("span", { children: "Quantidade de meses:" }),
              /* @__PURE__ */ jsx2("input", { type: "number", min: 1, max: 120, id: "md-rec-meses", value: newTitle.replicateMonths || 12, onChange: (e) => setNewTitle({ ...newTitle, endDate: "", replicateMonths: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }), className: "w-20 bg-white border border-sky-300 rounded px-2 py-1 text-xs font-bold" }),
              /* @__PURE__ */ jsx2("span", { children: "ou até a data:" }),
              /* @__PURE__ */ jsx2("input", { type: "date", id: "md-rec-ate", value: newTitle.endDate || "", onChange: (e) => setNewTitle({ ...newTitle, endDate: e.target.value, replicateMonths: __meses(e.target.value) }), className: "bg-white border border-sky-300 rounded px-2 py-1 text-xs font-bold" }),
              /* @__PURE__ */ jsx2("span", { className: "font-normal", children: \`Serão gerados \${newTitle.replicateMonths || 12} títulos de R$ \${__valor}.\` })
            ] }),
            __per === "PARCELADA" && /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold", children: [
              /* @__PURE__ */ jsx2("span", { children: "Nº de parcelas:" }),
              /* @__PURE__ */ jsx2("input", { type: "number", min: 2, max: 48, id: "md-rec-parcelas", value: newTitle.installmentCount || 3, onChange: (e) => setNewTitle({ ...newTitle, installmentCount: Math.max(2, Math.min(48, Number(e.target.value) || 2)) }), className: "w-20 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold" }),
              /* @__PURE__ */ jsx2("span", { className: "font-normal", children: \`R$ \${__valor} divididos em \${newTitle.installmentCount || 3} parcelas mensais a partir do vencimento.\` })
            ] }),
            (__per === "FIXA_INDETERMINADA" || __per === "VARIAVEL_MENSAL") && /* @__PURE__ */ jsx2("p", { className: "p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900", children: __per === "FIXA_INDETERMINADA"
              ? \`Lança os próximos 12 meses de R$ \${__valor} e continua lançando todo mês, até a recorrência ser encerrada em "Tipos de conta e recorrências".\`
              : \`Lança os próximos 12 meses com o valor estimado de R$ \${__valor}; ajuste cada título quando souber o valor real. Continua lançando todo mês até ser encerrada.\` })
          ] });
        })(),`,
  'tipo e periodicidade'
);

// 3. Texto do botão
trocar('              children: "Criar T\\xEDtulo"',
  '              children: (newTitle.expenseType === "FIXA_INDETERMINADA" || newTitle.expenseType === "VARIAVEL_MENSAL") ? "Gerar 12 Títulos (renova todo mês)" : newTitle.expenseType === "FIXA_MENSAL" ? `Gerar ${newTitle.replicateMonths || 12} Títulos Mensais` : newTitle.expenseType === "PARCELADA" ? `Gerar ${newTitle.installmentCount || 3} Parcelas` : "Criar T\\xEDtulo"',
  'botao');

bundle = bundle.slice(0, ini) + comp + bundle.slice(fim);
fs.writeFileSync(bundlePath, bundle);
const dist = path.resolve(__dirname, '..', 'dist/assets/index-CUxTo0fH.js');
if (fs.existsSync(path.dirname(dist))) fs.writeFileSync(dist, bundle);
console.log('Contas a Receber atualizada.');
