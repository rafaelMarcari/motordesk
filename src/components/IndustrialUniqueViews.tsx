import React, { useState, useMemo } from 'react';

// =========================================================================
// 1. SOLICITAÇÕES DE COMPRA FABRIS (ind_pcp_solicitacoes -> purchase_requisitions)
// =========================================================================
export function PurchaseRequisitionsView({ db, currentUser, currentCompany, onUpdateDb, onAddHistoryLog, onNavigateTab }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('UN');
  const [department, setDepartment] = useState('Usinagem CNC');
  const [priority, setPriority] = useState('NORMAL');
  const [requiredDate, setRequiredDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [justification, setJustification] = useState('');

  const initialRequisitions = useMemo(() => [
    {
      id: 'req-001',
      code: 'REQ-2026-0041',
      itemCode: 'MP-ACO-1020',
      itemName: 'Barra Redonda Aço 1020 2" x 6m',
      quantity: 120,
      unit: 'KG',
      department: 'Usinagem CNC',
      requesterName: 'Carlos Mendes (Torneiro Chefe)',
      priority: 'URGENTE',
      status: 'PENDENTE',
      requiredDate: '2026-10-08',
      justification: 'Atender OP-2026-088 de eixos para cliente B2B.',
      createdAt: '2026-10-02 08:30'
    },
    {
      id: 'req-002',
      code: 'REQ-2026-0042',
      itemCode: 'INS-SOL-MIG',
      itemName: 'Arame Tubular Solda MIG/MAG 1.2mm Carretel 15kg',
      quantity: 10,
      unit: 'CX',
      department: 'Caldeiraria & Solda',
      requesterName: 'Marcos Vinicius',
      priority: 'ALTA',
      status: 'EM_COTACAO',
      requiredDate: '2026-10-10',
      justification: 'Reposição de consumível do posto robotizado.',
      createdAt: '2026-10-01 14:15'
    },
    {
      id: 'req-003',
      code: 'REQ-2026-0043',
      itemCode: 'FER-INS-CNMG',
      itemName: 'Pastilha de Metal Duro CNMG 120408 para Torneamento',
      quantity: 50,
      unit: 'UN',
      department: 'Usinagem CNC',
      requesterName: 'Carlos Mendes',
      priority: 'NORMAL',
      status: 'APROVADA',
      requiredDate: '2026-10-15',
      justification: 'Ferramental para novo lote de engrenagens cilíndricas.',
      createdAt: '2026-09-30 11:00'
    },
    {
      id: 'req-004',
      code: 'REQ-2026-0044',
      itemCode: 'CMP-ROL-6205',
      itemName: 'Rolamento Rígido de Esferas 6205-2RS C3',
      quantity: 200,
      unit: 'UN',
      department: 'Montagem Final',
      requesterName: 'Eduardo Silveira',
      priority: 'NORMAL',
      status: 'ATENDIDA',
      requiredDate: '2026-10-05',
      justification: 'Montagem de redutores modelo RX-200.',
      createdAt: '2026-09-28 09:20'
    }
  ], []);

  const [requisitions, setRequisitions] = useState(() => db?.purchaseRequisitions?.length > 0 ? db.purchaseRequisitions : initialRequisitions);

  const filtered = useMemo(() => {
    return requisitions.filter((r: any) => {
      const matchSearch = (r.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.itemCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.department || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [requisitions, searchTerm, statusFilter, priorityFilter]);

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !quantity) return;

    const newReq = {
      id: `req-${Date.now()}`,
      code: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      itemCode: itemCode || `SKU-${Math.floor(100 + Math.random() * 900)}`,
      itemName,
      quantity: Number(quantity),
      unit,
      department,
      requesterName: currentUser?.name || 'Operador Industrial',
      priority,
      status: 'PENDENTE',
      requiredDate,
      justification: justification || 'Requisição fabril de rotina.',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updated = [newReq, ...requisitions];
    setRequisitions(updated);
    if (onUpdateDb) onUpdateDb({ ...db, purchaseRequisitions: updated });
    if (onAddHistoryLog) onAddHistoryLog('PCP', 'Nova Solicitação de Compra', `Solicitação ${newReq.code} para ${newReq.itemName} cadastrada.`);
    setIsModalOpen(false);
    setItemName('');
    setItemCode('');
    setJustification('');
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    const updated = requisitions.map((r: any) => r.id === id ? { ...r, status: newStatus } : r);
    setRequisitions(updated);
    if (onUpdateDb) onUpdateDb({ ...db, purchaseRequisitions: updated });
    if (onAddHistoryLog) onAddHistoryLog('PCP', 'Status da Solicitação Alterado', `Solicitação ID ${id} atualizada para ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              PCP & Suprimentos Industriais
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 3 • Fluxo de Requisições</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>📝</span> Solicitações de Compra Fabris (Requisições Internas)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Controle de requisições de matérias-primas e consumíveis abertas pelos postos de usinagem, estamparia, solda e montagem antes de gerar cotação com distribuidores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('purchasing_suggestions')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            🔢 Ver Cálculo MRP
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span> Nova Solicitação
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total de Requisições</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{requisitions.length}</div>
          <span className="text-[10px] text-slate-400">Demandas internas</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pendentes</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {requisitions.filter((r: any) => r.status === 'PENDENTE').length}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Aguardando cotação</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Urgentes / Críticas</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {requisitions.filter((r: any) => r.priority === 'URGENTE').length}
          </div>
          <span className="text-[10px] text-rose-600 font-medium">Parada potencial de OP</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Atendidas / Aprovadas</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {requisitions.filter((r: any) => r.status === 'ATENDIDA' || r.status === 'APROVADA').length}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Convertidas em compra</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, material, setor ou solicitante..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="EM_COTACAO">Em Cotação</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="ATENDIDA">Atendidas</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value="ALL">Todas as Prioridades</option>
            <option value="NORMAL">Normal</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Código / Data</th>
                <th className="p-3.5">Insumo Requisitado</th>
                <th className="p-3.5">Quantidade</th>
                <th className="p-3.5">Setor Solicitante</th>
                <th className="p-3.5">Prioridade</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((req: any) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-indigo-700 block">{req.code}</span>
                    <span className="text-[10px] text-slate-400">{req.createdAt}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{req.itemName}</div>
                    <div className="text-[10px] font-mono text-slate-500">Cód: {req.itemCode}</div>
                    <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">{req.justification}</div>
                  </td>
                  <td className="p-3.5 font-mono font-black text-slate-800">
                    {req.quantity} <span className="text-slate-500 text-[10px] font-normal">{req.unit}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] block w-fit">
                      {req.department}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{req.requesterName}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      req.priority === 'URGENTE' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      req.priority === 'ALTA' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.status === 'ATENDIDA' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'APROVADA' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'EM_COTACAO' ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      ● {req.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    {req.status === 'PENDENTE' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, 'EM_COTACAO')}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Enviar para tomada de preços"
                      >
                        Cotar
                      </button>
                    )}
                    {req.status !== 'ATENDIDA' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(req.id, 'ATENDIDA')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Marcar como atendida / comprada"
                      >
                        ✓ Atender
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhuma solicitação de compra encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📝</span> Nova Solicitação de Compra Fabril
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRequisition} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Cód. Insumo</label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="Ex: MP-ACO-01"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Descrição do Material *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ex: Chapa de Aço Inox 304 3mm"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="M">M (Metro)</option>
                    <option value="M2">M² (Metro Quadrado)</option>
                    <option value="CX">CX (Caixa)</option>
                    <option value="L">L (Litro)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Setor Requisitante</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  >
                    <option value="Usinagem CNC">Usinagem CNC</option>
                    <option value="Caldeiraria & Solda">Caldeiraria & Solda</option>
                    <option value="Corte a Laser">Corte a Laser</option>
                    <option value="Montagem Final">Montagem Final</option>
                    <option value="Manutenção Fabril">Manutenção Fabril</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Necessária</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justificativa da Compra</label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Informe a OP vinculada, motivo de urgência ou substituição..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  Salvar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. PEDIDOS DE COMPRA FABRIS (ind_pcp_compras -> purchase_orders)
// =========================================================================
export function PurchaseOrdersView({ db, currentUser, currentCompany, onUpdateDb, onAddHistoryLog, onNavigateTab }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const initialOrders = useMemo(() => [
    {
      id: 'po-101',
      code: 'PO-2026-0812',
      supplierName: 'Gerdau Aços Especiais S/A',
      supplierCnpj: '33.611.500/0001-19',
      issueDate: '2026-10-01',
      deliveryForecast: '2026-10-08',
      paymentTerms: '28 / 56 ddl (Boleto)',
      status: 'EM_TRANSITO',
      totalValue: 24850.00,
      carrier: 'Braspress Transportes Rápidos',
      itemsCount: 4,
      items: [
        { code: 'MP-ACO-1045', name: 'Barra Redonda 1045 Ø 3"', qty: 800, unit: 'KG', unitPrice: 14.50, total: 11600.00 },
        { code: 'MP-ACO-4140', name: 'Barra 4140 Beneficiada Ø 2"', qty: 500, unit: 'KG', unitPrice: 26.50, total: 13250.00 }
      ]
    },
    {
      id: 'po-102',
      code: 'PO-2026-0813',
      supplierName: 'Sandvik Coromant Ferramentas do Brasil',
      supplierCnpj: '60.874.192/0001-44',
      issueDate: '2026-10-02',
      deliveryForecast: '2026-10-06',
      paymentTerms: '30 ddl (Boleto)',
      status: 'CONFIRMADO',
      totalValue: 8420.00,
      carrier: 'Direct Express Sedex',
      itemsCount: 6,
      items: [
        { code: 'FER-BROC-D12', name: 'Broca Metal Duro CoroDrill 12mm', qty: 10, unit: 'UN', unitPrice: 420.00, total: 4200.00 },
        { code: 'FER-FRES-R5', name: 'Fresa Toroidal Raio 5mm 4 Cortes', qty: 8, unit: 'UN', unitPrice: 527.50, total: 4220.00 }
      ]
    },
    {
      id: 'po-103',
      code: 'PO-2026-0814',
      supplierName: 'SKF do Brasil Rolamentos',
      supplierCnpj: '59.105.748/0001-20',
      issueDate: '2026-09-29',
      deliveryForecast: '2026-10-03',
      paymentTerms: 'À Vista com 5% de Desconto',
      status: 'ENTREGUE',
      totalValue: 15300.00,
      carrier: 'Jamef Encomendas Urgentes',
      itemsCount: 3,
      items: [
        { code: 'CMP-ROL-22218', name: 'Rolamento Autocompensador 22218 EK', qty: 15, unit: 'UN', unitPrice: 1020.00, total: 15300.00 }
      ]
    }
  ], []);

  const [orders, setOrders] = useState(() => db?.purchaseOrders?.length > 0 ? db.purchaseOrders : initialOrders);

  const filtered = useMemo(() => {
    return orders.filter((o: any) => {
      const matchSearch = (o.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.supplierCnpj || '').includes(searchTerm);
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Compras & Ordens Formais
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 3 • Purchase Orders (PO)</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>📦</span> Pedidos de Compra Fabris (Purchase Orders)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Gestão de pedidos de compra emitidos para siderúrgicas, fabricantes de ferramentas e distribuidores com rastreamento de transporte e conferência de entrega.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('quotations')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            🏷️ Ver Cotações
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total de Pedidos</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{orders.length}</div>
          <span className="text-[10px] text-slate-400">Ordens formais</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Em Transporte / Trânsito</span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">
            {orders.filter((o: any) => o.status === 'EM_TRANSITO' || o.status === 'CONFIRMADO').length}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">A caminho da fábrica</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Valor em Aberto</span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              orders.reduce((acc: number, curr: any) => acc + (curr.totalValue || 0), 0)
            )}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Comprometimento de caixa</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Entregues no Mês</span>
          <div className="text-2xl font-black text-purple-600 font-mono mt-1">
            {orders.filter((o: any) => o.status === 'ENTREGUE').length}
          </div>
          <span className="text-[10px] text-purple-600 font-medium">Estoque integrado</span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número do pedido, fornecedor ou CNPJ..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
        >
          <option value="ALL">Todos os Status</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="EM_TRANSITO">Em Transporte</option>
          <option value="ENTREGUE">Entregue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Pedido / Emissão</th>
                <th className="p-3.5">Fornecedor Homologado</th>
                <th className="p-3.5">Previsão Entrega</th>
                <th className="p-3.5">Condição Pagto</th>
                <th className="p-3.5">Valor Total</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono">
                    <span className="font-bold text-indigo-700 block">{order.code}</span>
                    <span className="text-[10px] text-slate-400">Emissão: {order.issueDate}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{order.supplierName}</div>
                    <div className="text-[10px] font-mono text-slate-400">CNPJ: {order.supplierCnpj}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-800">{order.deliveryForecast}</span>
                    {order.carrier && <span className="text-[10px] text-slate-400 block">{order.carrier}</span>}
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{order.paymentTerms}</td>
                  <td className="p-3.5 font-mono font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      order.status === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'EM_TRANSITO' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      ● {order.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      👁️ Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📦</span> Espelho do Pedido de Compra: {selectedOrder.code}
                </h3>
                <span className="text-xs text-slate-500">Fornecedor: {selectedOrder.supplierName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Condição de Pagamento</span>
                <span className="font-bold text-slate-800">{selectedOrder.paymentTerms}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Previsão de Entrega</span>
                <span className="font-bold text-slate-800">{selectedOrder.deliveryForecast}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Transportadora</span>
                <span className="font-bold text-slate-800">{selectedOrder.carrier || 'FOB Fornecedor'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Valor Total</span>
                <span className="font-mono font-black text-emerald-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalValue)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Itens do Pedido Fabril</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-[10px]">
                    <tr>
                      <th className="p-2.5">Código / Descrição</th>
                      <th className="p-2.5">Qtd</th>
                      <th className="p-2.5">Unitário</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items || []).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800 block">{it.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">SKU: {it.code}</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold">{it.qty} {it.unit}</td>
                        <td className="p-2.5 font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.unitPrice)}</td>
                        <td className="p-2.5 font-mono font-bold text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Espelho do Pedido ${selectedOrder.code} enviado para o WhatsApp do Fornecedor com sucesso!`);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>💬</span> Enviar p/ Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. RECEBIMENTO DE MATERIAIS & NF-e (ind_pcp_recebimento -> material_receiving)
// =========================================================================
export function MaterialReceivingView({ db, currentUser, currentCompany, parts, onUpdateDb, onAddHistoryLog, onNavigateTab }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isConferenceModalOpen, setIsConferenceModalOpen] = useState(false);

  const initialReceipts = useMemo(() => [
    {
      id: 'rec-01',
      code: 'REC-2026-0501',
      nfeNumber: 'NF-e 004812',
      nfeKey: '35261033611500000119550010000048121892837461',
      supplierName: 'Gerdau Aços Especiais S/A',
      receivedAt: '2026-10-02 10:15',
      carrier: 'Braspress Transportes Rápidos',
      status: 'APROVADO_ESTOQUE',
      totalWeightKg: 1300,
      inspector: 'Antônio Prado (Conferente WMS)',
      items: [
        { code: 'MP-ACO-1045', name: 'Barra Redonda 1045 Ø 3"', qtyReceived: 800, unit: 'KG', lotNumber: 'LT-GER-8812', condition: 'CONFORME' },
        { code: 'MP-ACO-4140', name: 'Barra 4140 Beneficiada Ø 2"', qtyReceived: 500, unit: 'KG', lotNumber: 'LT-GER-8813', condition: 'CONFORME' }
      ]
    },
    {
      id: 'rec-02',
      code: 'REC-2026-0502',
      nfeNumber: 'NF-e 019283',
      nfeKey: '35261059105748000120550010000192831092837412',
      supplierName: 'SKF do Brasil Rolamentos',
      receivedAt: '2026-10-01 16:40',
      carrier: 'Jamef Encomendas',
      status: 'EM_CONFERENCIA',
      totalWeightKg: 45,
      inspector: 'Antônio Prado',
      items: [
        { code: 'CMP-ROL-22218', name: 'Rolamento Autocompensador 22218 EK', qtyReceived: 15, unit: 'UN', lotNumber: 'LT-SKF-9921', condition: 'CONFORME' }
      ]
    }
  ], []);

  const [receipts, setReceipts] = useState(() => db?.materialReceipts?.length > 0 ? db.materialReceipts : initialReceipts);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Portaria & Almoxarifado
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 3 / 9 • Entrada de Insumos</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🚚</span> Recebimento & Conferência de Materiais (NF-e)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Conferência cega de notas fiscais de fornecedores, inspeção de integridade física, laudo de entrada e alocação automática de lote no estoque WMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('stock_traffic')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            🚦 Ver Semáforo
          </button>
          <button
            type="button"
            onClick={() => setIsConferenceModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📥</span> Nova Entrada de NF-e
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recebimentos Realizados</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{receipts.length}</div>
          <span className="text-[10px] text-slate-400">Total de cargas</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Em Conferência</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {receipts.filter((r: any) => r.status === 'EM_CONFERENCIA').length}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Na doca de descarga</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Aprovados no Estoque</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {receipts.filter((r: any) => r.status === 'APROVADO_ESTOQUE').length}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Lotes integrados ao WMS</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Peso Total Recebido</span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">
            {receipts.reduce((acc: number, curr: any) => acc + (curr.totalWeightKg || 0), 0)} kg
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Volume físico conferido</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Cód. Entrada / Data</th>
                <th className="p-3.5">Nota Fiscal / Chave</th>
                <th className="p-3.5">Fornecedor</th>
                <th className="p-3.5">Itens & Lotes</th>
                <th className="p-3.5">Conferente</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((rec: any) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono">
                    <span className="font-bold text-indigo-700 block">{rec.code}</span>
                    <span className="text-[10px] text-slate-400">{rec.receivedAt}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{rec.nfeNumber}</div>
                    <div className="text-[9px] font-mono text-slate-400 truncate max-w-xs">{rec.nfeKey}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{rec.supplierName}</div>
                    <div className="text-[10px] text-slate-400">{rec.carrier}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-800 block">{(rec.items || []).length} itens conferidos</span>
                    <span className="text-[10px] font-mono text-emerald-600">Peso: {rec.totalWeightKg} kg</span>
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{rec.inspector}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.status === 'APROVADO_ESTOQUE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      ● {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isConferenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📥</span> Entrada de Materiais e XML NF-e
              </h3>
              <button
                type="button"
                onClick={() => setIsConferenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-900">
              <div className="font-bold flex items-center gap-1.5">
                <span>📑</span> Importação Automática de XML
              </div>
              <p className="text-[11px] text-indigo-700">
                Arraste o arquivo XML da NF-e emitida pelo fornecedor para carregar os itens, NCM, lote e dados fiscais com 1 clique.
              </p>
              <input
                type="file"
                accept=".xml"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    alert('Arquivo XML carregado! Dados do fornecedor e itens da nota importados com sucesso para conferência física.');
                    setIsConferenceModalOpen(false);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConferenceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 4. FORNECEDORES HOMOLOGADOS (suppliers -> suppliers)
// =========================================================================
export function IndustrialSuppliersView({ db, currentUser, currentCompany, suppliers, onUpdateDb, onAddHistoryLog, onNavigateTab }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const initialSuppliers = useMemo(() => [
    {
      id: 'sup-01',
      name: 'Gerdau Aços Especiais S/A',
      tradeName: 'Gerdau Usinagem & Aços',
      cnpj: '33.611.500/0001-19',
      city: 'São Paulo',
      state: 'SP',
      category: 'Aços & Metais Brutos',
      leadTimeDays: 7,
      rating: 'A (ISO 9001 / IATF)',
      status: 'HOMOLOGADO',
      phone: '(11) 3094-6600',
      whatsapp: '(11) 98122-3344',
      email: 'comercial.acos@gerdau.com'
    },
    {
      id: 'sup-02',
      name: 'Sandvik Coromant Ferramentas do Brasil',
      tradeName: 'Sandvik Ferramental',
      cnpj: '60.874.192/0001-44',
      city: 'Jundiaí',
      state: 'SP',
      category: 'Ferramental & Pastilhas',
      leadTimeDays: 4,
      rating: 'A (Certificado Global)',
      status: 'HOMOLOGADO',
      phone: '(11) 4589-7000',
      whatsapp: '(11) 99233-4455',
      email: 'atendimento@sandvik.com'
    },
    {
      id: 'sup-03',
      name: 'SKF do Brasil Rolamentos Ltda',
      tradeName: 'SKF Rolamentos',
      cnpj: '59.105.748/0001-20',
      city: 'Rodovia Anhanguera',
      state: 'SP',
      category: 'Rolamentos & Componentes',
      leadTimeDays: 5,
      rating: 'A (Original OEM)',
      status: 'HOMOLOGADO',
      phone: '(11) 4617-8000',
      whatsapp: '(11) 97344-5566',
      email: 'vendas.ind@skf.com'
    },
    {
      id: 'sup-04',
      name: 'White Martins Gases Industriais',
      tradeName: 'White Martins Gases & Solda',
      cnpj: '35.820.448/0001-30',
      city: 'Osasco',
      state: 'SP',
      category: 'Gases Industriais & Consumíveis',
      leadTimeDays: 2,
      rating: 'A (Gases Medicinais e Fabris)',
      status: 'HOMOLOGADO',
      phone: '(11) 3681-9000',
      whatsapp: '(11) 98455-6677',
      email: 'pedidos@whitemartins.com'
    }
  ], []);

  const [supplierList, setSupplierList] = useState(() => suppliers?.length > 0 ? suppliers : initialSuppliers);

  const filtered = useMemo(() => {
    return supplierList.filter((s: any) => {
      const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.cnpj || '').includes(searchTerm) ||
                          (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || s.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [supplierList, searchTerm, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Homologação Técnica Fabril
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 5 • Qualificação de Cadeia</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🏭</span> Fornecedores Homologados da Indústria
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Cadastro estratégico de fornecedores qualificados por auditoria técnica, certificação ISO, prazos de entrega (lead time) e índice de conformidade CQ.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fornecedores Ativos</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{supplierList.length}</div>
          <span className="text-[10px] text-slate-400">Cadastrados na base</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Homologados ISO</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {supplierList.filter((s: any) => s.status === 'HOMOLOGADO').length}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Auditoria em dia</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Lead Time Médio</span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">4.5 dias</div>
          <span className="text-[10px] text-blue-600 font-medium">Tempo de atendimento</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Índice OTIF</span>
          <div className="text-2xl font-black text-indigo-600 font-mono mt-1">98.2%</div>
          <span className="text-[10px] text-indigo-600 font-medium">No prazo e quantidade</span>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, razão social, CNPJ ou categoria de insumo..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Fornecedor / Razão Social</th>
                <th className="p-3.5">Categoria de Insumo</th>
                <th className="p-3.5">Cidade / UF</th>
                <th className="p-3.5">Lead Time</th>
                <th className="p-3.5">Avaliação CQ</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{s.tradeName || s.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">CNPJ: {s.cnpj}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {s.category || 'Insumos Fabris'}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{s.city}/{s.state}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-800">{s.leadTimeDays} dias</td>
                  <td className="p-3.5">
                    <span className="text-emerald-700 font-bold text-[11px] block">{s.rating}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ● {s.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono text-[11px] text-slate-600">
                    <div>{s.phone}</div>
                    {s.whatsapp && <div className="text-emerald-600 font-bold">WhatsApp: {s.whatsapp}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 5. FAMÍLIAS DE MATERIAIS (categories -> categories)
// =========================================================================
export function MaterialFamiliesView({ db, currentUser, currentCompany, parts = [], onUpdateDb, onAddHistoryLog, onNavigateTab }: any) {
  const [selectedFamily, setSelectedFamily] = useState('ALL');

  const families = useMemo(() => [
    {
      id: 'MP',
      name: 'Matérias-Primas Metálicas',
      code: 'FAM-MP',
      desc: 'Chapas laminadas, tubos industriais, vigas W, perfis estruturais e barras redondas 1020/1045/4140.',
      icon: '🔩',
      color: 'border-blue-300 bg-blue-50/20 text-blue-900',
      badgeColor: 'bg-blue-600 text-white',
      itemType: 'materia_prima',
      unitGroup: 'KG, M, M²'
    },
    {
      id: 'CMP',
      name: 'Componentes Comprados',
      code: 'FAM-CMP',
      desc: 'Rolamentos rígidos e autocompensadores, retentores, vedações hidráulicas, parafusos classe 8.8 e motores elétricos.',
      icon: '⚙️',
      color: 'border-amber-300 bg-amber-50/20 text-amber-900',
      badgeColor: 'bg-amber-600 text-white',
      itemType: 'componente',
      unitGroup: 'UN, CX, JG'
    },
    {
      id: 'SUB',
      name: 'Subconjuntos Fabricados',
      code: 'FAM-SUB',
      desc: 'Conjuntos soldados intermediários, caixas redutoras pré-montadas e blocos usinados que compõem o BOM.',
      icon: '🧩',
      color: 'border-purple-300 bg-purple-50/20 text-purple-900',
      badgeColor: 'bg-purple-600 text-white',
      itemType: 'subconjunto',
      unitGroup: 'UN, PC'
    },
    {
      id: 'PRD',
      name: 'Produtos Acabados',
      code: 'FAM-PRD',
      desc: 'Máquinas montadas, implementos fabris concluídos, prontos para expedição e faturamento ao cliente.',
      icon: '🏭',
      color: 'border-emerald-300 bg-emerald-50/20 text-emerald-900',
      badgeColor: 'bg-emerald-600 text-white',
      itemType: 'produto_acabado',
      unitGroup: 'UN'
    },
    {
      id: 'INS',
      name: 'Insumos & Consumíveis',
      code: 'FAM-INS',
      desc: 'Arames de solda, gases industriais, óleos solúveis de corte CNC, graxas sintéticas, lixas e EPIs.',
      icon: '🧪',
      color: 'border-rose-300 bg-rose-50/20 text-rose-900',
      badgeColor: 'bg-rose-600 text-white',
      itemType: 'insumo',
      unitGroup: 'L, KG, ROLO'
    }
  ], []);

  const itemsList = useMemo(() => {
    if (!parts || parts.length === 0) return [];
    if (selectedFamily === 'ALL') return parts;
    return parts.filter((p: any) => p.itemType === selectedFamily || p.category === selectedFamily);
  }, [parts, selectedFamily]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Classificação & Taxonomia
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 5 • Famílias de Materiais</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🗂️</span> Famílias de Materiais Industriais
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Segmentação estratégica do almoxarifado em matérias-primas brutas, componentes comprados, subconjuntos em processo, produtos acabados e insumos fabris.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('item_master')}
          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          📦 Ver Catálogo Mestre Completo
        </button>
      </div>

      {/* Grid of Families */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {families.map((f: any) => {
          const count = parts.filter((p: any) => p.itemType === f.itemType || (p.category && p.category.includes(f.name))).length;
          const isSelected = selectedFamily === f.itemType;
          return (
            <div
              key={f.id}
              onClick={() => setSelectedFamily(isSelected ? 'ALL' : f.itemType)}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-400' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{f.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeColor}`}>
                    {f.code}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 leading-tight">{f.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{f.desc}</p>
              </div>
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Itens Ativos:</span>
                <span className="font-mono font-black text-slate-900">{count || 12} SKUs</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Items list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> Itens da Família Selecionada: <span className="text-indigo-600">{selectedFamily === 'ALL' ? 'Todas as Famílias' : selectedFamily}</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{itemsList.length} itens encontrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase">
              <tr>
                <th className="p-3">Código SKU</th>
                <th className="p-3">Descrição do Material</th>
                <th className="p-3">Tipo / Categoria</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Saldo Físico</th>
                <th className="p-3">Estoque Mínimo</th>
                <th className="p-3">Custo Unitário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsList.slice(0, 15).map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono font-bold text-indigo-700">{p.code}</td>
                  <td className="p-3 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                      {p.itemType || p.category || 'Geral'}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-600">{p.unit || 'UN'}</td>
                  <td className="p-3 font-mono font-bold text-slate-900">{p.stockQuantity ?? p.stock ?? 0}</td>
                  <td className="p-3 font-mono text-slate-500">{p.minStock ?? 10}</td>
                  <td className="p-3 font-mono text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.costPrice || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 6. TRANSFERÊNCIAS ENTRE POSIÇÕES WMS (ind_almox_mov -> warehouse_transfers)
// =========================================================================
export function WarehouseTransfersView({ db, currentUser, currentCompany, locations = [], parts = [], onSaveLocation, onTransferStock, onUpdateDb, onAddHistoryLog }: any) {
  const [fromLocId, setFromLocId] = useState('');
  const [toLocId, setToLocId] = useState('');
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState('REABASTECIMENTO_LINHA');
  const [successMsg, setSuccessMsg] = useState('');

  const [transferHistory, setTransferHistory] = useState([
    {
      id: 'trf-01',
      date: '2026-10-02 11:20',
      itemCode: 'MP-ACO-1020',
      itemName: 'Barra Redonda Aço 1020 Ø 2"',
      quantity: 50,
      unit: 'KG',
      fromCode: 'ALM-R01-E01',
      toCode: 'FAB-POSTO-TORNO-01',
      operator: 'Paulo Almeida',
      reason: 'Reabastecimento de Posto'
    },
    {
      id: 'trf-02',
      date: '2026-10-01 15:40',
      itemCode: 'CMP-ROL-6205',
      itemName: 'Rolamento 6205-2RS',
      quantity: 100,
      unit: 'UN',
      fromCode: 'DOCA-RECEBIMENTO',
      toCode: 'ALM-R02-E03',
      operator: 'Antônio Prado',
      reason: 'Guarda após Laudo CQ'
    }
  ]);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocId || !toLocId || !partId || !quantity) {
      alert('Selecione endereço de origem, destino, insumo e quantidade válida.');
      return;
    }

    const fromLoc = locations.find((l: any) => l.id === fromLocId);
    const toLoc = locations.find((l: any) => l.id === toLocId);
    const part = parts.find((p: any) => p.id === partId);

    if (onTransferStock) {
      onTransferStock({
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        partId,
        quantity: Number(quantity)
      });
    }

    const newEntry = {
      id: `trf-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      itemCode: part?.code || 'SKU',
      itemName: part?.name || 'Insumo',
      quantity: Number(quantity),
      unit: part?.unit || 'UN',
      fromCode: fromLoc?.code || fromLocId,
      toCode: toLoc?.code || toLocId,
      operator: currentUser?.name || 'Operador Almoxarifado',
      reason: reason === 'REABASTECIMENTO_LINHA' ? 'Reabastecimento de Posto' : 'Remanejamento de Espaço'
    };

    setTransferHistory([newEntry, ...transferHistory]);
    setSuccessMsg('Transferência física WMS concluída e registrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Movimentação Interna WMS
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 9 • Transferência de Posições</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🔄</span> Transferência Entre Posições WMS
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Movimentação de matérias-primas e componentes entre docas, ruas de estoque, prateleiras e bancadas do chão de fábrica com rastreabilidade de operador.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Transfer Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>⚡</span> Executar Movimentação Imediata
        </h3>
        <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Localização de Origem *</label>
              <select
                required
                value={fromLocId}
                onChange={(e) => setFromLocId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                <option value="">Selecione Origem...</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.code} - {loc.name || loc.warehouse}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Localização de Destino *</label>
              <select
                required
                value={toLocId}
                onChange={(e) => setToLocId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                <option value="">Selecione Destino...</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.code} - {loc.name || loc.warehouse}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Material / Insumo *</label>
              <select
                required
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                <option value="">Selecione Item...</option>
                {parts.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantidade a Mover *</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Motivo:</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
              >
                <option value="REABASTECIMENTO_LINHA">Reabastecimento de Posto Fabril</option>
                <option value="REMANEJAMENTO_ESPACO">Remanejamento de Espaço / Otimização</option>
                <option value="QUARENTENA">Envio para Quarentena CQ</option>
                <option value="SEPARACAO_OP">Separação de Kit de OP</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span> Confirmar Transferência WMS
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Histórico Recente de Transferências</h4>
          <span className="text-slate-400 text-xs font-mono">{transferHistory.length} movimentações registradas</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
            <tr>
              <th className="p-3">Data / Hora</th>
              <th className="p-3">Insumo Movimentado</th>
              <th className="p-3">Quantidade</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Destino</th>
              <th className="p-3">Operador</th>
              <th className="p-3">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transferHistory.map((trf: any) => (
              <tr key={trf.id} className="hover:bg-slate-50 transition">
                <td className="p-3 font-mono text-slate-400">{trf.date}</td>
                <td className="p-3 font-bold text-slate-900">{trf.itemName} <span className="font-mono text-slate-400 text-[10px]">({trf.itemCode})</span></td>
                <td className="p-3 font-mono font-bold text-indigo-700">{trf.quantity} {trf.unit}</td>
                <td className="p-3 font-mono text-slate-600 font-bold">{trf.fromCode}</td>
                <td className="p-3 font-mono text-emerald-700 font-bold">{trf.toCode}</td>
                <td className="p-3 text-slate-600">{trf.operator}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">{trf.reason}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// 7. REGISTRO DE PARADAS DE LINHA (ind_rh_paradas -> downtime_registration)
// =========================================================================
export function DowntimeRegistrationView({ db, currentUser, currentCompany, productionOrders = [], operators = [], onUpdateDb, onAddHistoryLog }: any) {
  const [machineName, setMachineName] = useState('Torno CNC Romi Centur 30D');
  const [reasonCategory, setReasonCategory] = useState('FALHA_MECANICA');
  const [operatorName, setOperatorName] = useState('Carlos Mendes');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const [downtimeList, setDowntimeList] = useState([
    {
      id: 'dt-01',
      code: 'PAR-2026-081',
      date: '2026-10-02 09:15',
      machineName: 'Torno CNC Romi Centur 30D',
      category: 'FALHA_MECANICA',
      operator: 'Carlos Mendes',
      durationMinutes: 45,
      rootCause: 'Superaquecimento do rolamento da árvore principal.',
      actionTaken: 'Lubrificação forçada e troca de óleo hidráulico.',
      status: 'RESOLVIDO'
    },
    {
      id: 'dt-02',
      code: 'PAR-2026-082',
      date: '2026-10-01 14:00',
      machineName: 'Prensa Dobradeira CNC 150T',
      category: 'SETUP_FERRAMENTAL',
      operator: 'Marcos Vinicius',
      durationMinutes: 30,
      rootCause: 'Troca de matriz para dobra de chapa 6mm.',
      actionTaken: 'Ajuste de batentes e calibração de ângulo a laser.',
      status: 'RESOLVIDO'
    },
    {
      id: 'dt-03',
      code: 'PAR-2026-083',
      date: '2026-09-30 11:30',
      machineName: 'Posto Soldagem Robotizada',
      category: 'FALTA_MATERIAL',
      operator: 'Roberto Antunes',
      durationMinutes: 60,
      rootCause: 'Aguardando corte de suportes na guilhotina.',
      actionTaken: 'Priorização de corte na programação do PCP.',
      status: 'RESOLVIDO'
    }
  ]);

  const handleRegisterDowntime = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `dt-${Date.now()}`,
      code: `PAR-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      machineName,
      category: reasonCategory,
      operator: operatorName,
      durationMinutes: Number(durationMinutes),
      rootCause: rootCause || 'Intervenção operacional.',
      actionTaken: actionTaken || 'Ajuste realizado.',
      status: 'RESOLVIDO'
    };
    setDowntimeList([newEntry, ...downtimeList]);
    if (onAddHistoryLog) onAddHistoryLog('MANUFATURA', 'Parada de Linha Registrada', `Parada de ${newEntry.durationMinutes}min na ${newEntry.machineName}.`);
    setRootCause('');
    setActionTaken('');
  };

  const totalMinutes = downtimeList.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Eficiência & Disponibilidade
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 4 • Apontamento de Indisponibilidade</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>⚠️</span> Registro de Paradas de Linha de Produção
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Mapeamento de quebras mecânicas, falhas elétricas, tempo de troca de ferramentas (setup), falta de matéria-prima e gargalos operacionais da fábrica.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total de Paradas</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{downtimeList.length}</div>
          <span className="text-[10px] text-slate-400">Ocorrências registradas</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Tempo Total Parado</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">{totalMinutes} min</div>
          <span className="text-[10px] text-rose-600 font-medium">Impacto na disponibilidade</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Maior Causa</span>
          <div className="text-lg font-black text-amber-700 mt-1 truncate">Falha Mecânica</div>
          <span className="text-[10px] text-amber-600 font-medium">45% do tempo parado</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Disponibilidade Geral</span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">94.8%</div>
          <span className="text-[10px] text-emerald-600 font-medium">Dentro da meta (&gt; 90%)</span>
        </div>
      </div>

      {/* Register Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>🛑</span> Apontar Nova Parada de Linha
        </h3>
        <form onSubmit={handleRegisterDowntime} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Máquina / Posto Fabril *</label>
              <select
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                <option value="Torno CNC Romi Centur 30D">Torno CNC Romi Centur 30D</option>
                <option value="Centro de Usinagem 4 Eixos">Centro de Usinagem 4 Eixos</option>
                <option value="Prensa Dobradeira CNC 150T">Prensa Dobradeira CNC 150T</option>
                <option value="Posto Soldagem Robotizada">Posto Soldagem Robotizada</option>
                <option value="Corte a Laser Fibra 3kW">Corte a Laser Fibra 3kW</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoria do Motivo *</label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                <option value="FALHA_MECANICA">Quebra / Falha Mecânica</option>
                <option value="FALHA_ELETRICA">Falha Elétrica / Eletrônica</option>
                <option value="SETUP_FERRAMENTAL">Setup / Troca de Ferramenta</option>
                <option value="FALTA_MATERIAL">Falta de Matéria-Prima</option>
                <option value="ALMOCO_TROCA_TURNO">Troca de Turno / Intervalo</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operador Responsável</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tempo Parado (Minutos) *</label>
              <input
                type="number"
                required
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Causa Raiz da Parada</label>
              <input
                type="text"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Ex: Rompimento de correia, quebra de broca, etc."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ação de Contenção Tomada</label>
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Ex: Substituição por peça sobressalente do almoxarifado."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🛑</span> Registrar Parada de Máquina
            </button>
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Registro Cronológico de Ocorrências</h4>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
            <tr>
              <th className="p-3">Data / Código</th>
              <th className="p-3">Máquina / Posto</th>
              <th className="p-3">Motivo / Categoria</th>
              <th className="p-3">Duração</th>
              <th className="p-3">Operador</th>
              <th className="p-3">Causa & Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {downtimeList.map((dt: any) => (
              <tr key={dt.id} className="hover:bg-slate-50 transition">
                <td className="p-3 font-mono">
                  <span className="font-bold text-rose-700 block">{dt.code}</span>
                  <span className="text-[10px] text-slate-400">{dt.date}</span>
                </td>
                <td className="p-3 font-bold text-slate-900">{dt.machineName}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {dt.category}
                  </span>
                </td>
                <td className="p-3 font-mono font-black text-rose-600">{dt.durationMinutes} min</td>
                <td className="p-3 text-slate-700">{dt.operator}</td>
                <td className="p-3">
                  <div className="text-slate-800 font-medium">{dt.rootCause}</div>
                  <div className="text-[10px] text-slate-400">{dt.actionTaken}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// 8. HORAS TRABALHADAS & OEE (ind_rh_produtividade -> rh_productivity_oee)
// =========================================================================
export function RHProductivityOEEView({ db, currentUser, currentCompany, operators = [], productionOrders = [], onUpdateDb, onAddHistoryLog }: any) {
  const opData = useMemo(() => [
    { id: 'op-01', name: 'Carlos Mendes', role: 'Torneiro CNC Sênior', shift: '1º Turno (06:00 - 15:00)', hoursWorked: 176, overtimeHours: 12, goodsProduced: 1240, scrap: 14, efficiency: 97.4, status: 'PRODUZINDO' },
    { id: 'op-02', name: 'Marcos Vinicius', role: 'Operador de Dobradeira CNC', shift: '1º Turno (06:00 - 15:00)', hoursWorked: 176, overtimeHours: 8, goodsProduced: 980, scrap: 18, efficiency: 95.8, status: 'PRODUZINDO' },
    { id: 'op-03', name: 'Roberto Antunes', role: 'Soldador TIG / MIG Robotizado', shift: '2º Turno (15:00 - 23:45)', hoursWorked: 168, overtimeHours: 16, goodsProduced: 750, scrap: 6, efficiency: 98.2, status: 'DISPONÍVEL' },
    { id: 'op-04', name: 'Eduardo Silveira', role: 'Montador Mecânico Especialista', shift: '1º Turno (06:00 - 15:00)', hoursWorked: 176, overtimeHours: 4, goodsProduced: 520, scrap: 2, efficiency: 99.1, status: 'PRODUZINDO' },
    { id: 'op-05', name: 'Juliana Ferreira', role: 'Inspetora de Qualidade CQ', shift: 'Geral (07:30 - 17:18)', hoursWorked: 176, overtimeHours: 0, goodsProduced: 3200, scrap: 0, efficiency: 100.0, status: 'EM_INSPEÇÃO' }
  ], []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Recursos Humanos & Performance
            </span>
            <span className="text-xs text-slate-300 font-mono">Módulo 4 • Eficiência Global Fabril (OEE)</span>
          </div>
          <h2 className="text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2">
            <span>⚡</span> Produtividade de Operadores & Eficiência Global (OEE)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Acompanhamento de horas normais e extras por turno, produtividade individual de operadores, índice de peças boas vs scrap e OEE da planta industrial.
          </p>
        </div>
      </div>

      {/* OEE Global Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponibilidade (D)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Meta: &gt;90%</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">92.4%</div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '92.4%' }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block">Tempo em produção vs planejado</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Performance (P)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Meta: &gt;85%</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">88.1%</div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88.1%' }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block">Velocidade real vs nominal da máquina</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qualidade (Q)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Meta: &gt;95%</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">96.8%</div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '96.8%' }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block">Taxa de peças boas aprovadas</span>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md space-y-2 border border-indigo-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">OEE Consolidado</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-mono">BOM</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">78.8%</div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '78.8%' }}></div>
          </div>
          <span className="text-[10px] text-slate-300 block">D × P × Q = Eficiência Global</span>
        </div>
      </div>

      {/* Operators Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Desempenho Individual de Operadores Fabris</h4>
          <span className="text-slate-400 text-xs font-mono">{opData.length} colaboradores monitorados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Colaborador / Função</th>
                <th className="p-3.5">Turno</th>
                <th className="p-3.5">Horas Normais</th>
                <th className="p-3.5">Horas Extras</th>
                <th className="p-3.5">Peças Boas</th>
                <th className="p-3.5">Refugo (Scrap)</th>
                <th className="p-3.5">Eficiência (%)</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opData.map((op: any) => (
                <tr key={op.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{op.name}</div>
                    <div className="text-[10px] text-slate-400">{op.role}</div>
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{op.shift}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-800">{op.hoursWorked}h</td>
                  <td className="p-3.5 font-mono font-bold text-amber-700">+{op.overtimeHours}h</td>
                  <td className="p-3.5 font-mono font-black text-emerald-700">{op.goodsProduced} un</td>
                  <td className="p-3.5 font-mono font-bold text-rose-600">{op.scrap} un</td>
                  <td className="p-3.5 font-mono font-black text-slate-900">
                    <span className={`px-2 py-0.5 rounded ${
                      op.efficiency >= 98 ? 'bg-emerald-100 text-emerald-800' :
                      op.efficiency >= 95 ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {op.efficiency}%
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      ● {op.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
