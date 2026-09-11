import React, { useState, useMemo } from 'react';
import { CommercialProps } from './CommercialIndustrialViews';

// --------------------------------------------------------------------------------------
// 3. PEDIDOS DE VENDA FABRIS & CONTRATOS
// --------------------------------------------------------------------------------------
export function IndustrialPedidosVendaView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onSelectSubTab
}: CommercialProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDiscText, setNewDiscText] = useState('');
  const [newTopic, setNewTopic] = useState('CONFIRMACAO_PO');

  // Form Novo Pedido
  const [clientName, setClientName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [totalVal, setTotalVal] = useState('85000');
  const [payTerms, setPayTerms] = useState('Sinal 30% + 70% a 28 ddl');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-10');

  const orders = useMemo(() => {
    return db.industrialSalesOrders && db.industrialSalesOrders.length > 0
      ? db.industrialSalesOrders
      : [
          {
            id: 'PV-IND-2026-088',
            clientPoNumber: 'PO-AURORA-9821',
            clientName: 'Frigorífico Aurora Sul S/A',
            clientCnpj: '04.555.221/0001-09',
            budgetReferenceId: 'ORC-IND-2026-042',
            productDescription: '4 Tambores Rotativos Inox 304 Linha de Desossa',
            quantity: 4,
            totalValue: 142080,
            paymentTerms: 'Sinal 40% + 60% faturamento a 28 ddl',
            orderDate: '2026-09-07',
            deliveryDate: '2026-09-22',
            commercialStatus: 'LIBERADO_PCP',
            productionOrderId: 'OP-2026-012',
            shippingInstructions: 'Frete CIF - Despachar via Transportadora Transvale com agendamento',
            discussions: [
              { id: 'od-1', date: '2026-09-07 14:00', author: 'Fernanda Comercial', topic: 'CONFIRMACAO_PO', notes: 'PO formalizada pelo comprador Sr. Almir. Sinal de 40% creditado.' },
              { id: 'od-2', date: '2026-09-08 08:30', author: 'Roberto Vendas', topic: 'LIBERACAO_PCP', notes: 'Liberado com prioridade para PCP devido a parada de fábrica.' }
            ]
          },
          {
            id: 'PV-IND-2026-089',
            clientPoNumber: 'OC-VOLVO-4412',
            clientName: 'Metalúrgica Precision Parts Ltda',
            clientCnpj: '22.333.444/0001-55',
            budgetReferenceId: 'ORC-IND-2026-039',
            productDescription: '800 Flanges Usinadas em Alumínio Naval 6061-T6',
            quantity: 800,
            totalValue: 96000,
            paymentTerms: 'Faturado 30/60 dias após aceite do controle de qualidade',
            orderDate: '2026-08-28',
            deliveryDate: '2026-09-18',
            commercialStatus: 'EM_FABRICACAO',
            productionOrderId: 'OP-2026-009',
            shippingInstructions: 'Entregar com relatório tridimensional no galpão de inspeção',
            discussions: [
              { id: 'od-3', date: '2026-09-02 11:20', author: 'Roberto Vendas', topic: 'ALINHAMENTO_CQ', notes: 'Alinhado envio antecipado de 5 peças piloto para ensaio.' }
            ]
          },
          {
            id: 'PV-IND-2026-090',
            clientPoNumber: 'PO-WEG-11029',
            clientName: 'WEG Motores & Acionamentos',
            clientCnpj: '84.429.695/0001-11',
            budgetReferenceId: 'ORC-IND-2026-035',
            productDescription: '50 Carcaças Especiais Usinadas para Motor A Prova de Explosão',
            quantity: 50,
            totalValue: 180400,
            paymentTerms: '28/42/56 ddl',
            orderDate: '2026-09-01',
            deliveryDate: '2026-09-28',
            commercialStatus: 'EM_FABRICACAO',
            productionOrderId: 'OP-2026-015',
            shippingInstructions: 'Paletizado em madeira tratada padrão exportação',
            discussions: [
              { id: 'od-4', date: '2026-09-09 16:30', author: 'Fernanda Comercial', topic: 'ACOMPANHAMENTO', notes: 'Cliente solicitou relatório de rastreabilidade da corrida do aço.' }
            ]
          }
        ];
  }, [db.industrialSalesOrders]);

  // Metricas
  const totalFaturado = orders.reduce((acc: number, o: any) => acc + (o.totalValue || 0), 0);
  const liberadosPcp = orders.filter((o: any) => o.commercialStatus === 'LIBERADO_PCP' || o.commercialStatus === 'EM_FABRICACAO').length;
  const pctLiberados = orders.length > 0 ? ((liberadosPcp / orders.length) * 100).toFixed(0) : '0';
  const emFabricacao = orders.filter((o: any) => o.commercialStatus === 'EM_FABRICACAO').length;

  const filteredOrders = orders.filter((o: any) => {
    const matchStatus = statusFilter === 'ALL' || o.commercialStatus === statusFilter;
    const matchSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAddDiscussion = () => {
    if (!newDiscText.trim() || !selectedOrder) return;
    const updated = orders.map((o: any) => {
      if (o.id === selectedOrder.id) {
        const newDisc = {
          id: 'od-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Comercial Fabril',
          topic: newTopic,
          notes: newDiscText.trim()
        };
        const nextDiscs = [newDisc, ...(o.discussions || [])];
        const nextO = { ...o, discussions: nextDiscs };
        setSelectedOrder(nextO);
        return nextO;
      }
      return o;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialSalesOrders: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Alinhamento de Pedido Registrado',
        description: `Pedido ${selectedOrder.id} - ${selectedOrder.clientName}`,
        action: 'UPDATE'
      });
    }
    setNewDiscText('');
  };

  const handleLiberarPcp = (order: any) => {
    const opId = 'OP-2026-' + Math.floor(100 + Math.random() * 900);
    const updated = orders.map((o: any) => {
      if (o.id === order.id) {
        return {
          ...o,
          commercialStatus: 'LIBERADO_PCP',
          productionOrderId: opId,
          discussions: [
            {
              id: 'od-' + Date.now(),
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              author: currentUser?.name || 'Comercial',
              topic: 'LIBERACAO_PCP',
              notes: `Pedido comercial liberado para fabricação no chão de fábrica. Gerada ${opId}.`
            },
            ...(o.discussions || [])
          ]
        };
      }
      return o;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialSalesOrders: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Pedido Liberado para PCP',
        description: `Pedido ${order.id} liberado para produção (${opId})`,
        action: 'UPDATE'
      });
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newO = {
      id: 'PV-IND-2026-' + Math.floor(100 + Math.random() * 900),
      clientPoNumber: poNumber || 'PO-' + Math.floor(1000 + Math.random() * 9000),
      clientName,
      clientCnpj: '00.000.000/0001-00',
      productDescription: productDesc,
      quantity: 1,
      totalValue: parseFloat(totalVal) || 0,
      paymentTerms: payTerms,
      orderDate: new Date().toISOString().substring(0, 10),
      deliveryDate: deliveryDate || '2026-10-15',
      commercialStatus: 'APROVADO_COMERCIAL',
      shippingInstructions: 'A definir com a expedição',
      discussions: [
        {
          id: 'od-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Comercial Fabril',
          topic: 'CRIACAO',
          notes: 'Pedido de Venda criado manualmente.'
        }
      ]
    };

    onUpdateDb((prev: any) => ({
      ...prev,
      industrialSalesOrders: [newO, ...(prev.industrialSalesOrders || orders)]
    }));

    setShowNewModal(false);
    setClientName('');
    setProductDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Módulo 1 • Contratos & Faturamento
            </span>
            <span className="text-xs text-emerald-200/70 font-mono">Pedidos de Compra (PO) & Liberação Fabril</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <span>📦</span> Pedidos de Venda Fabris
          </h2>
          <p className="text-xs text-emerald-100/80 max-w-2xl mt-1">
            Gestão de pedidos confirmados com ordens de compra de clientes, validação de condições financeiras e liberação direta para PCP e engenharia de fabricação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Novo Pedido de Venda
          </button>
        </div>
      </div>

      {/* 4 Métricas de Cenário */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faturamento Confirmado</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {totalFaturado.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">{orders.length} pedidos ativos</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">% Liberado p/ Fábrica (PCP)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{pctLiberados}%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">{liberadosPcp} em produção</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Em Fabricação Ativa</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{emFabricacao}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Usinagem / Caldeiraria</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket Médio dos Pedidos</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {orders.length > 0 ? Math.round(totalFaturado / orders.length).toLocaleString('pt-BR') : 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Valor médio por contrato</span>
        </div>
      </div>

      {/* Busca e Filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Buscar por nº do pedido, PO do cliente ou razão social..."
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
            <option value="APROVADO_COMERCIAL">Aprovado Comercial (Aguardando PCP)</option>
            <option value="LIBERADO_PCP">Liberado p/ PCP</option>
            <option value="EM_FABRICACAO">Em Fabricação</option>
          </select>
        </div>
      </div>

      {/* Lista de Pedidos de Venda */}
      <div className="space-y-3">
        {filteredOrders.map((o: any) => {
          const statusBadge =
            o.commercialStatus === 'EM_FABRICACAO'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
              : o.commercialStatus === 'LIBERADO_PCP'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';

          return (
            <div
              key={o.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-emerald-400 transition space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                      {o.id}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {o.clientPoNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge}`}>
                      {o.commercialStatus.replace('_', ' ')}
                    </span>
                    {o.productionOrderId && (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {o.productionOrderId}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{o.clientName}</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl font-medium">
                    {o.productDescription}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Entrega Prometida</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {o.deliveryDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Condição Pgto</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {o.paymentTerms}
                    </span>
                  </div>
                  <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor do Pedido</span>
                    <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                      R$ {(o.totalValue || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra inferior de ações */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(o)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📝</span> Alinhamentos & Notas ({o.discussions ? o.discussions.length : 0})
                  </button>
                  {onSelectSubTab && (
                    <button
                      type="button"
                      onClick={() => onSelectSubTab('ind_com_carteira_tab')}
                      className="px-3 py-1.5 text-blue-600 hover:underline font-bold"
                    >
                      Ver na Carteira de Pedidos →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!o.productionOrderId && (
                    <button
                      type="button"
                      onClick={() => handleLiberarPcp(o)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🚀</span> Liberar para PCP / Gerar OP
                    </button>
                  )}
                  {o.productionOrderId && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span>✓</span> Integrado à Produção Fabril
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Alinhamentos do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Alinhamentos do Pedido • {selectedOrder.id}
                </h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {selectedOrder.clientName} • PO: {selectedOrder.clientPoNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Timeline */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {(selectedOrder.discussions || []).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          {d.topic}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{d.author}</span>
                      </div>
                      <span className="font-mono text-[11px]">{d.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{d.notes}</p>
                  </div>
                ))}
              </div>

              {/* Form Nova Discussão */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Adicionar Nota de Alinhamento
                </h4>
                <div className="flex gap-2">
                  <select
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="CONFIRMACAO_PO">Confirmação de PO / Ordem de Compra</option>
                    <option value="FATURAMENTO">Instruções de Faturamento Fiscal</option>
                    <option value="LOGISTICA">Instruções de Transporte e Entrega</option>
                    <option value="ENGENHARIA">Alinhamento Técnico com PCP</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={newDiscText}
                  onChange={e => setNewDiscText(e.target.value)}
                  placeholder="Registre o contato com o cliente, notas fiscais, ou aprovação de faturamento..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddDiscussion}
                  disabled={!newDiscText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Nota de Alinhamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Pedido */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrder}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cadastrar Pedido de Venda Fabril</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente Industrial</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ex: WEG Motores & Acionamentos"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nº da PO do Cliente</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  placeholder="PO-WEG-9981"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  required
                  value={totalVal}
                  onChange={e => setTotalVal(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Lote / Peças</label>
              <textarea
                rows={2}
                required
                value={productDesc}
                onChange={e => setProductDesc(e.target.value)}
                placeholder="Ex: 50 Carcaças Usinadas em Ferro Fundido com Pintura Epóxi"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Condição de Pagamento</label>
                <input
                  type="text"
                  value={payTerms}
                  onChange={e => setPayTerms(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Prometida de Entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
              >
                Confirmar Pedido de Venda
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 4. CARTEIRA DE PEDIDOS (BACKLOG FABRIL & ANÁLISE DE CENÁRIOS)
// --------------------------------------------------------------------------------------
export function IndustrialCarteiraPedidosView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog
}: CommercialProps) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [reprogramReason, setReprogramReason] = useState('SOLICITACAO_CLIENTE');
  const [reprogramNotes, setReprogramNotes] = useState('');

  const orders = useMemo(() => {
    return db.industrialSalesOrders && db.industrialSalesOrders.length > 0
      ? db.industrialSalesOrders
      : [
          {
            id: 'PV-IND-2026-088',
            clientPoNumber: 'PO-AURORA-9821',
            clientName: 'Frigorífico Aurora Sul S/A',
            productDescription: '4 Tambores Rotativos Inox 304 Linha de Desossa',
            totalValue: 142080,
            deliveryDate: '2026-09-22',
            commercialStatus: 'LIBERADO_PCP',
            productionOrderId: 'OP-2026-012',
            discussions: []
          },
          {
            id: 'PV-IND-2026-089',
            clientPoNumber: 'OC-VOLVO-4412',
            clientName: 'Metalúrgica Precision Parts Ltda',
            productDescription: '800 Flanges Usinadas em Alumínio Naval 6061-T6',
            totalValue: 96000,
            deliveryDate: '2026-09-18',
            commercialStatus: 'EM_FABRICACAO',
            productionOrderId: 'OP-2026-009',
            discussions: []
          },
          {
            id: 'PV-IND-2026-090',
            clientPoNumber: 'PO-WEG-11029',
            clientName: 'WEG Motores & Acionamentos',
            productDescription: '50 Carcaças Especiais Usinadas para Motor A Prova de Explosão',
            totalValue: 180400,
            deliveryDate: '2026-09-28',
            commercialStatus: 'EM_FABRICACAO',
            productionOrderId: 'OP-2026-015',
            discussions: []
          }
        ];
  }, [db.industrialSalesOrders]);

  // Backlog total
  const totalBacklog = orders.reduce((acc: number, o: any) => acc + (o.totalValue || 0), 0);

  // Classificacao por Aging e Risco
  const now = new Date('2026-09-11').getTime();

  const categorizedOrders = useMemo(() => {
    return orders.map((o: any) => {
      const delivTime = new Date(o.deliveryDate).getTime();
      const diffDays = Math.ceil((delivTime - now) / (1000 * 60 * 60 * 24));

      let agingCategory = 'PROGRAMADO';
      let risk = 'NO_PRAZO';

      if (diffDays <= 3) {
        agingCategory = 'CRITICO';
        risk = diffDays < 0 ? 'ATRASADO' : 'CRITICO';
      } else if (diffDays <= 7) {
        agingCategory = 'CURTO_PRAZO';
        risk = 'ATENCAO';
      } else if (diffDays <= 15) {
        agingCategory = 'MEDIO_PRAZO';
        risk = 'NO_PRAZO';
      }

      return {
        ...o,
        diffDays,
        agingCategory,
        risk
      };
    });
  }, [orders, now]);

  const criticosCount = categorizedOrders.filter((o: any) => o.agingCategory === 'CRITICO').length;
  const curtoPrazoCount = categorizedOrders.filter((o: any) => o.agingCategory === 'CURTO_PRAZO').length;
  const medioPrazoCount = categorizedOrders.filter((o: any) => o.agingCategory === 'MEDIO_PRAZO').length;
  const programadosCount = categorizedOrders.filter((o: any) => o.agingCategory === 'PROGRAMADO').length;

  const handleReprogramDate = () => {
    if (!newDeliveryDate || !selectedOrder) return;
    const updated = orders.map((o: any) => {
      if (o.id === selectedOrder.id) {
        const disc = {
          id: 'reprog-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Gestão da Carteira',
          topic: 'REPROGRAMACAO_PRAZO',
          notes: `Data contratual alterada de ${o.deliveryDate} para ${newDeliveryDate}. Motivo: ${reprogramReason}. Detalhes: ${reprogramNotes}`
        };
        return {
          ...o,
          deliveryDate: newDeliveryDate,
          discussions: [disc, ...(o.discussions || [])]
        };
      }
      return o;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialSalesOrders: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Reprogramação de Prazo na Carteira',
        description: `Pedido ${selectedOrder.id} repactuado para ${newDeliveryDate}`,
        action: 'UPDATE'
      });
    }

    setSelectedOrder(null);
    setReprogramNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Módulo 1 • Gestão de Backlog & Prazos
            </span>
            <span className="text-xs text-amber-200/70 font-mono">Análise de Aging de Entregas & Riscos OTIF</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <span>📅</span> Carteira de Pedidos (Backlog Fabril)
          </h2>
          <p className="text-xs text-amber-100/80 max-w-2xl mt-1">
            Controle de pedidos em carteira, semáforo de risco de cumprimento de prazos, alinhamento com compradores para repactuação de datas e simulação de cenários de entrega.
          </p>
        </div>
      </div>

      {/* 4 Métricas de Backlog */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Backlog Fabril em Aberto</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {totalBacklog.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">{orders.length} pedidos em carteira</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Índice OTIF Projetado</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">94.2%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">No prazo contratual</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pedidos em Alerta / Risco</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{criticosCount}</div>
          <span className="text-[11px] text-rose-600 font-semibold mt-0.5 block">Exigem ação imediata</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Time Médio Prometido</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">16.4 dias</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Tempo de ciclo fábrica</span>
        </div>
      </div>

      {/* Matriz de Análise de Cenário por Aging de Entrega */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">🔴 Crítico (&lt; 3 dias / Vencido)</span>
            <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-xs font-bold rounded">
              {criticosCount}
            </span>
          </div>
          <p className="text-[11px] text-rose-600/80 mt-2">Prioridade absoluta de expedição ou contato imediato com cliente.</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">🟡 Curto Prazo (4 a 7 dias)</span>
            <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold rounded">
              {curtoPrazoCount}
            </span>
          </div>
          <p className="text-[11px] text-amber-600/80 mt-2">Fase final de usinagem, tratamento térmico ou montagem.</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">🟢 Médio Prazo (8 a 15 dias)</span>
            <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded">
              {medioPrazoCount}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-2">Em fabricação no fluxo normal de produção.</p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">🔵 Programado (&gt; 15 dias)</span>
            <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 text-xs font-bold rounded">
              {programadosCount}
            </span>
          </div>
          <p className="text-[11px] text-blue-600/80 mt-2">Aguardando chegada de matéria-prima ou programação PCP.</p>
        </div>
      </div>

      {/* Tabela de Acompanhamento da Carteira */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Pedidos Ativos na Carteira Fabril
          </h4>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {categorizedOrders.map((o: any) => (
            <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">{o.id}</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{o.clientPoNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    o.risk === 'CRITICO' || o.risk === 'ATRASADO'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      : o.risk === 'ATENCAO'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  }`}>
                    {o.diffDays < 0 ? `Atrasado há ${Math.abs(o.diffDays)} dias` : `${o.diffDays} dias restantes`}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{o.clientName}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{o.productDescription}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">Entrega Prometida</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{o.deliveryDate}</span>
                </div>
                <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Valor do Contrato</span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                    R$ {(o.totalValue || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(o);
                    setNewDeliveryDate(o.deliveryDate);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer ml-2"
                >
                  <span>📅</span> Alinhar Prazo / Repactuar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Repactuação de Prazos com o Cliente */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Alinhar & Repactuar Prazo com Cliente
                </h3>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  {selectedOrder.id} • {selectedOrder.clientName}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
              <span className="text-amber-900 dark:text-amber-200 font-bold block">
                Data Prometida Atual: {selectedOrder.deliveryDate}
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                O registro de repactuação mantém a auditoria e gera histórico de negociação de prazo com o comprador.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Data de Entrega Acordada</label>
              <input
                type="date"
                required
                value={newDeliveryDate}
                onChange={e => setNewDeliveryDate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-amber-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo do Alinhamento</label>
              <select
                value={reprogramReason}
                onChange={e => setReprogramReason(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
              >
                <option value="SOLICITACAO_CLIENTE">Solicitação / Revisão de Projeto pelo Cliente</option>
                <option value="FILA_MAQUINA">Fila de Usinagem / Carga de Máquinas Fabril</option>
                <option value="ATRASO_MATERIA_PRIMA">Atraso na Chegada de Aço / Matéria-Prima</option>
                <option value="ANTECIPACAO_AUTORIZADA">Antecipação Solicitada e Autorizada</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Detalhes da Conversa com o Comprador</label>
              <textarea
                rows={3}
                value={reprogramNotes}
                onChange={e => setReprogramNotes(e.target.value)}
                placeholder="Ex: Alinhado com o comprador Carlos; cliente aceitou prorrogação de 4 dias devido a atraso de tratamento térmico externo..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReprogramDate}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Confirmar Repactuação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
