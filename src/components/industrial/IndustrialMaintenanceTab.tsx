/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Wrench, Cpu, Search, Plus, CheckCircle2, AlertTriangle, Clock, 
  Calendar, Check, X, ShieldCheck, User as UserIcon, Settings, 
  Layers, Boxes, FileText, ArrowRight, Activity
} from 'lucide-react';
import { 
  InstalledEquipment, EquipmentMaintenancePlan, EquipmentMaintenanceOrder, 
  Part, User, Client 
} from '../../types';

interface IndustrialMaintenanceTabProps {
  equipment: InstalledEquipment[];
  maintenancePlans: EquipmentMaintenancePlan[];
  maintenanceOrders: EquipmentMaintenanceOrder[];
  parts: Part[];
  clients: Client[];
  currentUser: User;
  onSaveEquipment: (eq: InstalledEquipment) => void;
  onSaveMaintenanceOrder: (om: EquipmentMaintenanceOrder) => void;
  onCompleteMaintenanceOrder: (omId: string, replacedParts: { partId: string; quantity: number }[], notes: string) => void;
}

export const IndustrialMaintenanceTab: React.FC<IndustrialMaintenanceTabProps> = ({
  equipment,
  maintenancePlans,
  maintenanceOrders,
  parts,
  clients,
  currentUser,
  onSaveEquipment,
  onSaveMaintenanceOrder,
  onCompleteMaintenanceOrder
}) => {
  const [subTab, setSubTab] = useState<'equipment' | 'orders' | 'plans'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected items & modals
  const [selectedEquipment, setSelectedEquipment] = useState<InstalledEquipment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<EquipmentMaintenanceOrder | null>(null);
  const [showNewEquipmentModal, setShowNewEquipmentModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showExecuteOrderModal, setShowExecuteOrderModal] = useState(false);

  // Form states for New Equipment
  const [newEqName, setNewEqName] = useState('');
  const [newEqTag, setNewEqTag] = useState('');
  const [newEqSerialNumber, setNewEqSerialNumber] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqLocation, setNewEqLocation] = useState('Galpão Principal - Linha 1');
  const [newEqClientId, setNewEqClientId] = useState('');
  const [newEqWarrantyExp, setNewEqWarrantyExp] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  // Form states for New Maintenance Order
  const [newOmEquipmentId, setNewOmEquipmentId] = useState('');
  const [newOmType, setNewOmType] = useState<'PREVENTIVA' | 'CORRETIVA' | 'PREDITIVA'>('PREVENTIVA');
  const [newOmPriority, setNewOmPriority] = useState<'BAIXA' | 'NORMAL' | 'ALTA' | 'CRITICA'>('NORMAL');
  const [newOmDescription, setNewOmDescription] = useState('');
  const [newOmTechnician, setNewOmTechnician] = useState(currentUser.name || 'Técnico Especialista');

  // Execution modal states
  const [execNotes, setExecNotes] = useState('');
  const [execReplacedParts, setExecReplacedParts] = useState<{ partId: string; quantity: number }[]>([
    { partId: '', quantity: 1 }
  ]);

  const handleCreateEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const createdEq: InstalledEquipment = {
      id: `eq-${Date.now()}`,
      name: newEqName,
      tag: newEqTag || `TAG-${Math.floor(100 + Math.random() * 900)}`,
      serialNumber: newEqSerialNumber,
      model: newEqModel,
      manufacturer: 'Industrial Tech',
      location: newEqLocation,
      clientId: newEqClientId || undefined,
      clientName: clients.find(c => c.id === newEqClientId)?.name,
      installationDate: new Date().toISOString().split('T')[0],
      warrantyExpirationDate: newEqWarrantyExp,
      status: 'OPERATIONAL',
      operatingHours: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveEquipment(createdEq);
    setShowNewEquipmentModal(false);
    setNewEqName('');
    setNewEqTag('');
    setNewEqSerialNumber('');
  };

  const handleCreateOmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find(item => item.id === newOmEquipmentId);
    if (!eq) {
      alert('Selecione o equipamento.');
      return;
    }

    const count = maintenanceOrders.length + 1;
    const year = new Date().getFullYear();
    const code = `OM-${year}-${String(count).padStart(4, '0')}`;

    const createdOm: EquipmentMaintenanceOrder = {
      id: `om-${Date.now()}`,
      code,
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentTag: eq.tag,
      type: newOmType,
      priority: newOmPriority,
      status: 'ABERTA',
      description: newOmDescription,
      assignedTechnician: newOmTechnician,
      scheduledDate: new Date().toISOString().split('T')[0],
      checklist: [
        { id: `chk-${Date.now()}-1`, description: 'Inspeção visual de vazamentos e trincas', item: 'Inspeção visual de vazamentos e trincas', checked: false, completed: false },
        { id: `chk-${Date.now()}-2`, description: 'Verificação de lubrificação e filtros', item: 'Verificação de lubrificação e filtros', checked: false, completed: false },
        { id: `chk-${Date.now()}-3`, description: 'Teste de isolamento elétrico e aterramento', item: 'Teste de isolamento elétrico e aterramento', checked: false, completed: false },
        { id: `chk-${Date.now()}-4`, description: 'Aferição de torque e alinhamento mecânico', item: 'Aferição de torque e alinhamento mecânico', checked: false, completed: false }
      ],
      replacedParts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveMaintenanceOrder(createdOm);
    setShowNewOrderModal(false);
    setNewOmDescription('');
  };

  const handleExecuteOmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const validParts = execReplacedParts.filter(p => p.partId && p.quantity > 0);
    onCompleteMaintenanceOrder(selectedOrder.id, validParts, execNotes);

    setShowExecuteOrderModal(false);
    setSelectedOrder(null);
    setExecNotes('');
    setExecReplacedParts([{ partId: '', quantity: 1 }]);
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSubTab('orders')}
            className={`px-3 py-1.5 rounded-md font-bold text-xs cursor-pointer transition-colors ${
              subTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ordens de Manutenção (OM) ({maintenanceOrders.length})
          </button>

          <button
            onClick={() => setSubTab('equipment')}
            className={`px-3 py-1.5 rounded-md font-bold text-xs cursor-pointer transition-colors ${
              subTab === 'equipment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Parque de Equipamentos ({equipment.length})
          </button>

          <button
            onClick={() => setSubTab('plans')}
            className={`px-3 py-1.5 rounded-md font-bold text-xs cursor-pointer transition-colors ${
              subTab === 'plans' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Planos Preventivos ({maintenancePlans.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'equipment' && (
            <button
              onClick={() => setShowNewEquipmentModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Novo Equipamento
            </button>
          )}

          {subTab === 'orders' && (
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Nova Ordem (OM)
            </button>
          )}
        </div>
      </div>

      {/* Orders SubTab */}
      {subTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Código / Tipo</th>
                  <th className="p-3.5">Equipamento / TAG</th>
                  <th className="p-3.5">Descrição do Serviço</th>
                  <th className="p-3.5">Técnico</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Prioridade</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenanceOrders.map(om => {
                  const isDone = om.status === 'APROVADA' || (om.status as any) === 'concluida';
                  const isInProgress = om.status === 'EM_EXECUCAO';
                  const isOpen = om.status === 'ABERTA';

                  return (
                    <tr key={om.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900">{om.code}</div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                          om.type === 'CORRETIVA' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {om.type}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{om.equipmentName}</div>
                        <div className="font-mono text-[10px] text-slate-400">TAG: {om.equipmentTag}</div>
                      </td>

                      <td className="p-3.5 max-w-xs truncate text-slate-700">
                        {om.description}
                      </td>

                      <td className="p-3.5 text-slate-600">
                        {om.assignedTechnician || 'Não atribuído'}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isDone ? 'bg-emerald-100 text-emerald-800' :
                          isInProgress ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {om.status}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          om.priority === 'EMERGENCIAL' || (om.priority as any) === 'CRITICA' ? 'bg-rose-100 text-rose-800' :
                          om.priority === 'ALTA' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {om.priority}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {!isDone && (
                          <button
                            onClick={() => {
                              setSelectedOrder(om);
                              setShowExecuteOrderModal(true);
                            }}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs inline-flex items-center gap-1"
                          >
                            <Wrench className="w-3 h-3" /> Executar & Baixar
                          </button>
                        )}
                        {isDone && (
                          <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment SubTab */}
      {subTab === 'equipment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(eq => {
            const isOperational = eq.status === 'OPERATIONAL';

            return (
              <div 
                key={eq.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      TAG: {eq.tag}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isOperational ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {eq.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">
                    {eq.name}
                  </h4>

                  <div className="text-xs text-slate-500 mb-3">
                    <span>{eq.manufacturer} • {eq.model}</span>
                    <span className="block font-mono text-[10px] text-slate-400">Nº Série: {eq.serialNumber}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Localização:</span>
                      <span className="font-semibold text-slate-800">{eq.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Horímetro:</span>
                      <span className="font-bold text-indigo-700">{eq.operatingHours || 0} h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Garantia até:</span>
                      <span className="font-medium text-slate-700">{eq.warrantyExpirationDate || 'Indeterminada'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                  <button
                    onClick={() => {
                      setNewOmEquipmentId(eq.id);
                      setNewOmDescription(`Manutenção preventiva periódica do ativo ${eq.name} (TAG: ${eq.tag})`);
                      setShowNewOrderModal(true);
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Abrir Ordem de Manutenção
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plans SubTab */}
      {subTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {maintenancePlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-slate-900">{plan.name}</h4>
                <span className="font-mono text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                  A cada {plan.periodicityDays || 90} dias / {plan.periodicityHours || 500}h
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">{plan.description}</p>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-800 block mb-1.5">Checklist Padrão:</span>
                <ul className="space-y-1 text-slate-600">
                  {plan.checklist?.map((chk, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>{chk.item || chk.task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execute OM Modal */}
      {showExecuteOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Execução e Laudo da Manutenção</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedOrder.code} - {selectedOrder.equipmentName}</span>
              </div>
              <button
                onClick={() => setShowExecuteOrderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteOmSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Peça Substituída do Almoxarifado (Baixa Automática)</label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-8">
                    <select
                      value={execReplacedParts[0]?.partId}
                      onChange={e => setExecReplacedParts([{ partId: e.target.value, quantity: 1 }])}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="">Nenhuma peça trocada</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name} (Disp: {p.stockQuantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min="1"
                      value={execReplacedParts[0]?.quantity || 1}
                      onChange={e => setExecReplacedParts([{ partId: execReplacedParts[0]?.partId || '', quantity: Number(e.target.value) }])}
                      placeholder="Qtd"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Laudo Técnico de Encerramento & Parecer</label>
                <textarea
                  rows={3}
                  value={execNotes}
                  onChange={e => setExecNotes(e.target.value)}
                  placeholder="Descreva as ações realizadas, ajustes, aferições e estado final do equipamento..."
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExecuteOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Concluir Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Equipment Modal */}
      {showNewEquipmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                Cadastrar Novo Equipamento
              </h3>
              <button
                onClick={() => setShowNewEquipmentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEquipmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome do Equipamento</label>
                <input
                  type="text"
                  value={newEqName}
                  onChange={e => setNewEqName(e.target.value)}
                  placeholder="Ex: Torno CNC 4 Eixos"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">TAG de Identificação</label>
                  <input
                    type="text"
                    value={newEqTag}
                    onChange={e => setNewEqTag(e.target.value)}
                    placeholder="Ex: CNC-01"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Número de Série</label>
                  <input
                    type="text"
                    value={newEqSerialNumber}
                    onChange={e => setNewEqSerialNumber(e.target.value)}
                    placeholder="Ex: SN-98471"
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Localização no Pátio</label>
                <input
                  type="text"
                  value={newEqLocation}
                  onChange={e => setNewEqLocation(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Garantia Válida Até</label>
                <input
                  type="date"
                  value={newEqWarrantyExp}
                  onChange={e => setNewEqWarrantyExp(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEquipmentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New OM Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Nova Ordem de Manutenção (OM)
              </h3>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOmSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Equipamento Alvo</label>
                <select
                  value={newOmEquipmentId}
                  onChange={e => setNewOmEquipmentId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione o equipamento...</option>
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.tag} - {eq.name} ({eq.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipo</label>
                  <select
                    value={newOmType}
                    onChange={e => setNewOmType(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREDITIVA">Preditiva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade</label>
                  <select
                    value={newOmPriority}
                    onChange={e => setNewOmPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Descrição / Sintomas / Tarefas</label>
                <textarea
                  rows={3}
                  value={newOmDescription}
                  onChange={e => setNewOmDescription(e.target.value)}
                  placeholder="Detalhes da manutenção a ser executada..."
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Emitir Ordem de Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
