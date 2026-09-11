import React, { useState, useMemo } from 'react';
import { CommercialProps } from './CommercialIndustrialViews';

// --------------------------------------------------------------------------------------
// 2. ORÇAMENTOS FABRIS & ENGENHARIA DE CUSTOS
// --------------------------------------------------------------------------------------
export function IndustrialOrcamentosView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onSelectSubTab
}: CommercialProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDiscText, setNewDiscText] = useState('');
  const [newDiscType, setNewDiscType] = useState('CONTRAPROPOSTA_CLIENTE');

  // Form Novo Orçamento
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [projectScope, setProjectScope] = useState('');
  const [matCost, setMatCost] = useState('35000');
  const [machCost, setMachCost] = useState('20000');
  const [labCost, setLabCost] = useState('10000');
  const [bdiPct, setBdiPct] = useState('30');
  const [leadDays, setLeadDays] = useState('15');

  const budgets = useMemo(() => {
    return db.industrialBudgets && db.industrialBudgets.length > 0
      ? db.industrialBudgets
      : [
          {
            id: 'ORC-IND-2026-041',
            clientName: 'Agrícola & Tratores Santa Fé Ltda',
            clientCnpj: '45.123.789/0001-44',
            projectScope: 'Lote de 120 Eixos Estriados Temperados 4340 + Tratamento Térmico por Indução',
            rawMaterialCost: 48000,
            machiningCost: 32000,
            laborCost: 14000,
            bdiMarginPct: 32,
            totalProductionCost: 94000,
            totalValue: 124080,
            estimatedLeadTimeDays: 18,
            validUntil: '2026-09-30',
            status: 'EM_NEGOCIACAO',
            createdAt: '2026-09-09',
            discussions: [
              { id: 'nd-1', date: '2026-09-10 15:40', author: 'Roberto Vendas', type: 'CONTRAPROPOSTA_CLIENTE', notes: 'Cliente solicitou 4% de desconto à vista e entrega fracionada em 2 quinzenas.', discountOffered: 4, outcome: 'Em análise com PCP e Diretoria' }
            ]
          },
          {
            id: 'ORC-IND-2026-042',
            clientName: 'Frigorífico Aurora Sul S/A',
            clientCnpj: '04.555.221/0001-09',
            projectScope: 'Reforma & Fabricação de 4 Tambores Rotativos Inox 304 para Linha de Desossa',
            rawMaterialCost: 65000,
            machiningCost: 28000,
            laborCost: 18000,
            bdiMarginPct: 28,
            totalProductionCost: 111000,
            totalValue: 142080,
            estimatedLeadTimeDays: 14,
            validUntil: '2026-09-25',
            status: 'APROVADO',
            createdAt: '2026-09-04',
            discussions: [
              { id: 'nd-2', date: '2026-09-07 09:30', author: 'Eng. Ricardo', type: 'ALINHAMENTO_TECNICO', notes: 'Especificação de solda TIG com purga de argônio aprovada pelo cliente.', discountOffered: 0, outcome: 'Aprovado pelo cliente sem ressalvas' }
            ]
          },
          {
            id: 'ORC-IND-2026-043',
            clientName: 'Votoran Cimentos & Mineração',
            clientCnpj: '61.064.838/0001-20',
            projectScope: 'Conjunto de Guias de Desgaste em Aço Hardox 450 com Furação Cônica',
            rawMaterialCost: 38000,
            machiningCost: 22000,
            laborCost: 9000,
            bdiMarginPct: 35,
            totalProductionCost: 69000,
            totalValue: 93150,
            estimatedLeadTimeDays: 22,
            validUntil: '2026-10-05',
            status: 'ENVIADO',
            createdAt: '2026-09-10',
            discussions: [
              { id: 'nd-3', date: '2026-09-10 17:00', author: 'Fernanda Comercial', type: 'ENVIO_PROPOSTA', notes: 'Proposta técnica enviada com laudo de composição química do aço Hardox.', discountOffered: 0, outcome: 'Aguardando parecer do comitê de suprimentos' }
            ]
          }
        ];
  }, [db.industrialBudgets]);

  // Metricas
  const totalOrcado = budgets.reduce((acc: number, b: any) => acc + (b.totalValue || 0), 0);
  const aprovados = budgets.filter((b: any) => b.status === 'APROVADO');
  const winRate = budgets.length > 0 ? ((aprovados.length / budgets.length) * 100).toFixed(1) : '0';
  const emNegociacaoCount = budgets.filter((b: any) => b.status === 'EM_NEGOCIACAO').length;
  const ticketMedio = budgets.length > 0 ? Math.round(totalOrcado / budgets.length) : 0;

  const filteredBudgets = budgets.filter((b: any) => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.projectScope.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAddDiscussion = () => {
    if (!newDiscText.trim() || !selectedBudget) return;
    const updated = budgets.map((b: any) => {
      if (b.id === selectedBudget.id) {
        const newDisc = {
          id: 'nd-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Vendedor Técnico',
          type: newDiscType,
          notes: newDiscText.trim(),
          outcome: 'Alinhamento registrado'
        };
        const nextDiscs = [newDisc, ...(b.discussions || [])];
        const nextB = { ...b, discussions: nextDiscs };
        setSelectedBudget(nextB);
        return nextB;
      }
      return b;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialBudgets: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Negociação de Orçamento Registrada',
        description: `Orçamento ${selectedBudget.id} - ${selectedBudget.clientName}`,
        action: 'UPDATE'
      });
    }
    setNewDiscText('');
  };

  const handleConvertToOrder = (budget: any) => {
    // 1. Marcar orçamento como aprovado
    const nextBudgets = budgets.map((b: any) => {
      if (b.id === budget.id) {
        return {
          ...b,
          status: 'APROVADO',
          discussions: [
            {
              id: 'nd-' + Date.now(),
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              author: currentUser?.name || 'Comercial',
              type: 'APROVACAO_FORMAL',
              notes: 'Orçamento formalmente aprovado e convertido em Pedido de Venda Fabril.',
              outcome: 'Convertido em Pedido'
            },
            ...(b.discussions || [])
          ]
        };
      }
      return b;
    });

    // 2. Criar Pedido de Venda
    const newOrder = {
      id: 'PV-IND-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      clientPoNumber: 'PO-' + Math.floor(1000 + Math.random() * 9000),
      clientName: budget.clientName,
      clientCnpj: budget.clientCnpj,
      budgetReferenceId: budget.id,
      productDescription: budget.projectScope,
      quantity: 1,
      totalValue: budget.totalValue,
      paymentTerms: 'Faturado 30/60 ddl',
      orderDate: new Date().toISOString().substring(0, 10),
      deliveryDate: new Date(Date.now() + (budget.estimatedLeadTimeDays || 15) * 86400000).toISOString().substring(0, 10),
      commercialStatus: 'APROVADO_COMERCIAL',
      shippingInstructions: 'A combinar com departamento de logística fabril',
      discussions: [
        {
          id: 'od-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Comercial',
          topic: 'CRIACAO_PEDIDO',
          notes: `Pedido de Venda originado automaticamente da aprovação do orçamento ${budget.id}.`
        }
      ]
    };

    onUpdateDb((prev: any) => ({
      ...prev,
      industrialBudgets: nextBudgets,
      industrialSalesOrders: [newOrder, ...(prev.industrialSalesOrders || [])]
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Pedido de Venda Gerado',
        description: `Pedido ${newOrder.id} gerado a partir do Orçamento ${budget.id}`,
        action: 'CREATE'
      });
    }

    if (onSelectSubTab) {
      onSelectSubTab('ind_com_pedidos_tab');
    }
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseFloat(matCost) || 0;
    const mach = parseFloat(machCost) || 0;
    const lab = parseFloat(labCost) || 0;
    const bdi = parseFloat(bdiPct) || 0;
    const totalProd = raw + mach + lab;
    const finalVal = Math.round(totalProd * (1 + bdi / 100));

    const newB = {
      id: 'ORC-IND-2026-' + Math.floor(100 + Math.random() * 900),
      clientName,
      clientCnpj: clientCnpj || '00.000.000/0001-00',
      projectScope,
      rawMaterialCost: raw,
      machiningCost: mach,
      laborCost: lab,
      bdiMarginPct: bdi,
      totalProductionCost: totalProd,
      totalValue: finalVal,
      estimatedLeadTimeDays: parseInt(leadDays) || 15,
      validUntil: new Date(Date.now() + 20 * 86400000).toISOString().substring(0, 10),
      status: 'EM_NEGOCIACAO',
      createdAt: new Date().toISOString().substring(0, 10),
      discussions: [
        {
          id: 'nd-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Vendedor Técnico',
          type: 'ELABORACAO',
          notes: 'Proposta técnica de fabricação elaborada com base na análise de engenharia de custos.',
          outcome: 'Disponível para envio'
        }
      ]
    };

    onUpdateDb((prev: any) => ({
      ...prev,
      industrialBudgets: [newB, ...(prev.industrialBudgets || budgets)]
    }));

    setShowNewModal(false);
    setClientName('');
    setProjectScope('');
  };

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Módulo 1 • Engenharia de Custos
            </span>
            <span className="text-xs text-indigo-200/70 font-mono">BDI, Matéria-Prima & Usinagem</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <span>📐</span> Orçamentos Fabris & Engenharia de Preços
          </h2>
          <p className="text-xs text-indigo-100/80 max-w-2xl mt-1">
            Composição técnica de custos de fabricação, formação de margem BDI, histórico de contrapropostas de compradores e conversão direta em contratos e pedidos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Novo Orçamento Fabril
          </button>
        </div>
      </div>

      {/* 4 Cards de Métricas Consistentes de Cenário */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Volume Total em Cotação</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {totalOrcado.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block">{budgets.length} propostas ativas</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Taxa de Conversão (Win Rate)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{winRate}%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">{aprovados.length} orçamentos ganhos</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket Médio Proposto</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {ticketMedio.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Valor médio por cotação</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Em Negociação Ativa</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{emNegociacaoCount}</div>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Contrapropostas em análise</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Buscar por código, cliente ou escopo do produto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            <option value="ALL">Todos os Status</option>
            <option value="EM_NEGOCIACAO">Em Negociação</option>
            <option value="ENVIADO">Enviado ao Cliente</option>
            <option value="APROVADO">Aprovado / Fechado</option>
          </select>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="space-y-3">
        {filteredBudgets.map((b: any) => {
          const statusBadge =
            b.status === 'APROVADO'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : b.status === 'EM_NEGOCIACAO'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';

          return (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-400 transition space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                      {b.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Criado em: {b.createdAt} • Validade: {b.validUntil}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{b.clientName}</span>
                    <span className="text-[11px] font-mono font-normal text-slate-400">({b.clientCnpj})</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl font-medium">
                    {b.projectScope}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Custo de Fábrica</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      R$ {(b.totalProductionCost || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">BDI Aplicado</span>
                    <span className="text-xs font-mono font-bold text-blue-600">
                      +{b.bdiMarginPct}%
                    </span>
                  </div>
                  <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Preço Final Cotação</span>
                    <span className="text-base font-mono font-black text-slate-900 dark:text-white">
                      R$ {(b.totalValue || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra inferior com Botão de Discussões e Ações */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBudget(b)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>💬</span> Negociações & Histórico ({b.discussions ? b.discussions.length : 0})
                  </button>
                  <span className="text-slate-400 text-[11px]">
                    Prazo Fabricação: <strong>{b.estimatedLeadTimeDays} dias úteis</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {b.status !== 'APROVADO' && (
                    <button
                      type="button"
                      onClick={() => handleConvertToOrder(b)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>✅</span> Aprovar & Gerar Pedido de Venda
                    </button>
                  )}
                  {b.status === 'APROVADO' && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span>✓</span> Contrato Aprovado / Em Produção
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Negociações & Discussões */}
      {selectedBudget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Histórico de Negociações • {selectedBudget.id}
                </h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {selectedBudget.clientName} • R$ {selectedBudget.totalValue.toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => setSelectedBudget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Timeline */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {(selectedBudget.discussions || []).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                          {d.type.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{d.author}</span>
                      </div>
                      <span className="font-mono text-[11px]">{d.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{d.notes}</p>
                    {d.outcome && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        → Status da tratativa: {d.outcome}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Adicionar Discussão */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Registrar Contraproposta / Alinhamento de Preço
                </h4>
                <div className="flex gap-2">
                  <select
                    value={newDiscType}
                    onChange={e => setNewDiscType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="CONTRAPROPOSTA_CLIENTE">Contraproposta de Preço do Cliente</option>
                    <option value="PRAZO_FABRICACAO">Negociação de Prazo / Lead Time</option>
                    <option value="ALINHAMENTO_TECNICO">Revisão de Tolerâncias / Escopo</option>
                    <option value="CONDICAO_PAGAMENTO">Condição Especial de Faturamento</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={newDiscText}
                  onChange={e => setNewDiscText(e.target.value)}
                  placeholder="Descreva a negociação com o comprador industrial (ex: solicitou desconto de 3% para fechamento em lote fechado ou antecipação de 5 dias)..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddDiscussion}
                  disabled={!newDiscText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Gravar Histórico de Negociação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Orçamento */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBudget}
            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Novo Orçamento Fabril & BDI</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente Industrial</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ex: Frigorífico Aurora Sul S/A"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Escopo Técnico do Fornecimento</label>
              <textarea
                rows={2}
                required
                value={projectScope}
                onChange={e => setProjectScope(e.target.value)}
                placeholder="Ex: Fabricação de 50 eixos em aço 4340 temperados por indução com retífica cilíndrica"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Matéria-Prima (R$)</label>
                <input
                  type="number"
                  value={matCost}
                  onChange={e => setMatCost(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Usinagem/Processo</label>
                <input
                  type="number"
                  value={machCost}
                  onChange={e => setMachCost(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mão de Obra Fabril</label>
                <input
                  type="number"
                  value={labCost}
                  onChange={e => setLabCost(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Margem de BDI (%)</label>
                <input
                  type="number"
                  value={bdiPct}
                  onChange={e => setBdiPct(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-blue-600 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lead Time Estimado (Dias)</label>
                <input
                  type="number"
                  value={leadDays}
                  onChange={e => setLeadDays(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-between">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">Valor Final Estimado:</span>
              <span className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">
                R${' '}
                {Math.round(
                  ((parseFloat(matCost) || 0) + (parseFloat(machCost) || 0) + (parseFloat(labCost) || 0)) *
                    (1 + (parseFloat(bdiPct) || 0) / 100)
                ).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-sm"
              >
                Gerar Proposta Fabril
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
