import React, { useState, useMemo } from 'react';
import { AppDatabase } from '../data/mockData';
import { 
  Carrier, 
  User, 
  FreightType, 
  ShippingOperation 
} from '../types';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Filter, 
  RefreshCw, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowRight,
  Boxes,
  HelpCircle
} from 'lucide-react';

interface CarriersViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveCarriers: (carriers: Carrier[]) => void;
  onAddHistoryLog?: (module: string, action: string, details: string, previousState?: any, newState?: any) => void;
}

type ModalMode = 'create' | 'edit' | 'view';

export default function CarriersView({
  db,
  currentUser,
  onSaveCarriers,
  onAddHistoryLog
}: CarriersViewProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [operationFilter, setOperationFilter] = useState<'all' | 'direct' | 'redespacho'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Carrier>>({
    corporateName: '',
    tradeName: '',
    cnpj: '',
    stateRegistration: '',
    rntrc: '',
    internalCode: '',
    phone: '',
    cellphone: '',
    whatsapp: '',
    email: '',
    contactName: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    status: 'active',
    supportsRedispersion: false,
    shippingOperations: ['direct'],
    defaultFreightType: 'FOB',
    logisticsHub: '',
    trackingUrl: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Carriers List for current company
  const carriersList = useMemo(() => {
    return (db.carriers || []).map(c => ({
      ...c,
      status: c.status || 'active',
      shippingOperations: c.shippingOperations || ['direct']
    }));
  }, [db.carriers]);

  // Filtered List
  const filteredCarriers = useMemo(() => {
    return carriersList.filter(c => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        c.corporateName.toLowerCase().includes(q) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
        c.cnpj.toLowerCase().includes(q) ||
        (c.internalCode && c.internalCode.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        (c.contactName && c.contactName.toLowerCase().includes(q));

      // Status
      const matchStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && c.status === 'active') ||
        (statusFilter === 'inactive' && c.status === 'inactive');

      // Operation
      const matchOperation = 
        operationFilter === 'all' ||
        (operationFilter === 'redespacho' && (c.supportsRedispersion || c.shippingOperations?.includes('redespacho'))) ||
        (operationFilter === 'direct' && c.shippingOperations?.includes('direct'));

      return matchSearch && matchStatus && matchOperation;
    });
  }, [carriersList, searchQuery, statusFilter, operationFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = carriersList.length;
    const active = carriersList.filter(c => c.status === 'active').length;
    const redespacho = carriersList.filter(c => c.supportsRedispersion || c.shippingOperations?.includes('redespacho')).length;
    const distinctCities = new Set(carriersList.map(c => c.city).filter(Boolean)).size;

    return { total, active, redespacho, distinctCities };
  }, [carriersList]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      corporateName: '',
      tradeName: '',
      cnpj: '',
      stateRegistration: '',
      rntrc: '',
      internalCode: `TR-${String(carriersList.length + 1).padStart(3, '0')}`,
      phone: '',
      cellphone: '',
      whatsapp: '',
      email: '',
      contactName: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      status: 'active',
      supportsRedispersion: false,
      shippingOperations: ['direct'],
      defaultFreightType: 'FOB',
      logisticsHub: '',
      trackingUrl: '',
      notes: '',
    });
    setFormErrors({});
    setModalMode('create');
    setSelectedCarrier(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (carrier: Carrier) => {
    setFormData({ ...carrier });
    setFormErrors({});
    setModalMode('edit');
    setSelectedCarrier(carrier);
    setIsModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (carrier: Carrier) => {
    setFormData({ ...carrier });
    setFormErrors({});
    setModalMode('view');
    setSelectedCarrier(carrier);
    setIsModalOpen(true);
  };

  // Validate Form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.corporateName?.trim()) {
      errors.corporateName = 'Razão Social é obrigatória';
    }

    if (!formData.cnpj?.trim()) {
      errors.cnpj = 'CNPJ ou CPF é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const companyId = db.companyInfo?.id || 'comp-1';

    if (modalMode === 'create') {
      const newCarrier: Carrier = {
        id: `car-${Date.now()}`,
        companyId,
        corporateName: formData.corporateName!.trim(),
        tradeName: formData.tradeName?.trim() || formData.corporateName!.trim(),
        cnpj: formData.cnpj!.trim(),
        stateRegistration: formData.stateRegistration?.trim() || '',
        rntrc: formData.rntrc?.trim() || '',
        internalCode: formData.internalCode?.trim() || `TR-${String(carriersList.length + 1).padStart(3, '0')}`,
        phone: formData.phone?.trim() || '',
        cellphone: formData.cellphone?.trim() || '',
        whatsapp: formData.whatsapp?.trim() || '',
        email: formData.email?.trim() || '',
        contactName: formData.contactName?.trim() || '',
        cep: formData.cep?.trim() || '',
        street: formData.street?.trim() || '',
        number: formData.number?.trim() || '',
        complement: formData.complement?.trim() || '',
        neighborhood: formData.neighborhood?.trim() || '',
        city: formData.city?.trim() || '',
        state: formData.state?.trim().toUpperCase() || '',
        active: (formData.status || 'active') === 'active',
        status: formData.status || 'active',
        supportsRedispersion: Boolean(formData.supportsRedispersion),
        shippingOperations: formData.shippingOperations && formData.shippingOperations.length > 0 
          ? formData.shippingOperations 
          : ['direct'],
        defaultFreightType: formData.defaultFreightType || 'FOB',
        logisticsHub: formData.logisticsHub?.trim() || '',
        trackingUrl: formData.trackingUrl?.trim() || '',
        notes: formData.notes?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updated = [...carriersList, newCarrier];
      onSaveCarriers(updated);

      if (onAddHistoryLog) {
        onAddHistoryLog(
          'logistics',
          'Cadastro de Transportadora',
          `Transportadora "${newCarrier.tradeName}" (CNPJ: ${newCarrier.cnpj}) cadastrada com sucesso por ${currentUser.name}.`
        );
      }
    } else if (modalMode === 'edit' && selectedCarrier) {
      const updatedCarrier: Carrier = {
        ...selectedCarrier,
        corporateName: formData.corporateName!.trim(),
        tradeName: formData.tradeName?.trim() || formData.corporateName!.trim(),
        cnpj: formData.cnpj!.trim(),
        stateRegistration: formData.stateRegistration?.trim() || '',
        rntrc: formData.rntrc?.trim() || '',
        internalCode: formData.internalCode?.trim() || selectedCarrier.internalCode || '',
        phone: formData.phone?.trim() || '',
        cellphone: formData.cellphone?.trim() || '',
        whatsapp: formData.whatsapp?.trim() || '',
        email: formData.email?.trim() || '',
        contactName: formData.contactName?.trim() || '',
        cep: formData.cep?.trim() || '',
        street: formData.street?.trim() || '',
        number: formData.number?.trim() || '',
        complement: formData.complement?.trim() || '',
        neighborhood: formData.neighborhood?.trim() || '',
        city: formData.city?.trim() || '',
        state: formData.state?.trim().toUpperCase() || '',
        active: (formData.status || 'active') === 'active',
        status: formData.status || 'active',
        supportsRedispersion: Boolean(formData.supportsRedispersion),
        shippingOperations: formData.shippingOperations || ['direct'],
        defaultFreightType: formData.defaultFreightType || 'FOB',
        logisticsHub: formData.logisticsHub?.trim() || '',
        trackingUrl: formData.trackingUrl?.trim() || '',
        notes: formData.notes?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      const updated = carriersList.map(c => c.id === selectedCarrier.id ? updatedCarrier : c);
      onSaveCarriers(updated);

      if (onAddHistoryLog) {
        onAddHistoryLog(
          'logistics',
          'Atualização de Transportadora',
          `Dados da transportadora "${updatedCarrier.tradeName}" atualizados por ${currentUser.name}.`
        );
      }
    }

    setIsModalOpen(false);
  };

  // Toggle Status
  const handleToggleStatus = (carrier: Carrier) => {
    const nextStatus: 'active' | 'inactive' = (carrier.status === 'active' || carrier.active) ? 'inactive' : 'active';
    const updated = carriersList.map(c => {
      if (c.id === carrier.id) {
        return { 
          ...c, 
          status: nextStatus, 
          active: nextStatus === 'active',
          updatedAt: new Date().toISOString() 
        };
      }
      return c;
    });
    onSaveCarriers(updated);

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'logistics',
        'Alteração de Status de Transportadora',
        `Transportadora "${carrier.tradeName}" alterada para status ${nextStatus === 'active' ? 'Ativo' : 'Inativo'} por ${currentUser.name}.`
      );
    }
  };

  // Delete Handler
  const handleDeleteCarrier = (id: string) => {
    const carrier = carriersList.find(c => c.id === id);
    const updated = carriersList.filter(c => c.id !== id);
    onSaveCarriers(updated);
    setDeleteConfirmId(null);

    if (onAddHistoryLog && carrier) {
      onAddHistoryLog(
        'logistics',
        'Exclusão de Transportadora',
        `Transportadora "${carrier.tradeName}" removida do cadastro por ${currentUser.name}.`
      );
    }
  };

  // Print Carrier Data Sheet
  const handlePrintCarrierSheet = (carrier: Carrier) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const company = db.companyInfo || { name: 'MotorDesk', cnpj: '', phone: '', address: '' };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha da Transportadora - ${carrier.tradeName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #1e293b; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .card-title { font-size: 13px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; }
            .item { font-size: 12px; margin-bottom: 6px; }
            .item strong { color: #334155; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .badge-active { background: #dcfce7; color: #166534; }
            .badge-inactive { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${company.name}</div>
              <div class="subtitle">CNPJ: ${company.cnpj || '-'} | Telefone: ${company.phone || '-'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: bold; color: #2563eb;">FICHA DE TRANSPORTADORA</div>
              <div style="font-size: 11px; color: #64748b;">Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">1. Dados Cadastrais & Fiscais</div>
              <div class="item"><strong>Código Interno:</strong> ${carrier.internalCode || '-'}</div>
              <div class="item"><strong>Razão Social:</strong> ${carrier.corporateName}</div>
              <div class="item"><strong>Nome Fantasia:</strong> ${carrier.tradeName || '-'}</div>
              <div class="item"><strong>CNPJ / CPF:</strong> ${carrier.cnpj}</div>
              <div class="item"><strong>Inscrição Estadual (IE):</strong> ${carrier.stateRegistration || 'Isento / Não inf.'}</div>
              <div class="item"><strong>RNTRC / ANTT:</strong> ${carrier.rntrc || '-'}</div>
              <div class="item"><strong>Status:</strong> <span class="badge ${carrier.status === 'active' ? 'badge-active' : 'badge-inactive'}">${carrier.status === 'active' ? 'ATIVO' : 'INATIVO'}</span></div>
            </div>

            <div class="card">
              <div class="card-title">2. Logística & Operação de Frete</div>
              <div class="item"><strong>Operações:</strong> ${(carrier.shippingOperations || ['direct']).map(op => op === 'direct' ? 'Transporte Direto' : op === 'redespacho' ? 'Redespacho' : 'Transporte Normal').join(', ')}</div>
              <div class="item"><strong>Permite Redespacho:</strong> ${carrier.supportsRedispersion ? 'Sim' : 'Não'}</div>
              <div class="item"><strong>Hub Logístico / Ponto de Coleta:</strong> ${carrier.logisticsHub || 'Não informado'}</div>
              <div class="item"><strong>Modalidade Padrão:</strong> ${carrier.defaultFreightType || 'FOB'}</div>
              <div class="item"><strong>Link de Rastreamento:</strong> ${carrier.trackingUrl || 'Não cadastrado'}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">3. Contato & Atendimento</div>
              <div class="item"><strong>Pessoa de Contato:</strong> ${carrier.contactName || '-'}</div>
              <div class="item"><strong>Telefone Fixo:</strong> ${carrier.phone || '-'}</div>
              <div class="item"><strong>WhatsApp / Celular:</strong> ${carrier.whatsapp || carrier.cellphone || '-'}</div>
              <div class="item"><strong>E-mail Operacional:</strong> ${carrier.email || '-'}</div>
            </div>

            <div class="card">
              <div class="card-title">4. Endereço & Base Operacional</div>
              <div class="item"><strong>Endereço:</strong> ${carrier.street ? `${carrier.street}, ${carrier.number || 'S/N'} ${carrier.complement ? `(${carrier.complement})` : ''}` : '-'}</div>
              <div class="item"><strong>Bairro:</strong> ${carrier.neighborhood || '-'}</div>
              <div class="item"><strong>Cidade / UF:</strong> ${carrier.city ? `${carrier.city} - ${carrier.state}` : '-'}</div>
              <div class="item"><strong>CEP:</strong> ${carrier.cep || '-'}</div>
            </div>
          </div>

          ${carrier.notes ? `
            <div class="card" style="margin-top: 10px;">
              <div class="card-title">5. Observações Comerciais & Operacionais</div>
              <div style="font-size: 12px; color: #475569; white-space: pre-wrap;">${carrier.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            MotorDesk Sistema Integrado de Gestão &bull; Documento gerado para controle interno de expedição e transporte.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="space-y-6" id="carriers-module-view">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
                Cadastro de Transportadoras & Logística de Frete
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestão centralizada de parceiros de frete, rotas de transporte, redespacho e integração com pedidos de venda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-new-carrier"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Transportadora</span>
          </button>
        </div>
      </div>

      {/* METRIC BADGES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Cadastrado</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Ativas para Frete</p>
            <p className="text-lg font-extrabold text-emerald-700 font-mono">{metrics.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Parceiras Redespacho</p>
            <p className="text-lg font-extrabold text-indigo-700 font-mono">{metrics.redespacho}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Polos / Cidades</p>
            <p className="text-lg font-extrabold text-amber-700 font-mono">{metrics.distinctCities}</p>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-carriers"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ, Cidade, Código..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Todos ({carriersList.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Ativos ({metrics.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'inactive' ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Inativos ({metrics.total - metrics.active})
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setOperationFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${operationFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Qualquer Operação
            </button>
            <button
              onClick={() => setOperationFilter('redespacho')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${operationFilter === 'redespacho' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Redespacho
            </button>
          </div>
        </div>
      </div>

      {/* CARRIERS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredCarriers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhuma transportadora encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery ? 'Tente ajustar os termos de pesquisa ou filtros selecionados.' : 'Cadastre sua primeira transportadora para gerenciar fretes e despachos.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Cadastrar Transportadora
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-carriers-list">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Código / Transportadora</th>
                  <th className="py-3 px-4">CNPJ & IE</th>
                  <th className="py-3 px-4">Operação & Modalidade</th>
                  <th className="py-3 px-4">Base / Cidade</th>
                  <th className="py-3 px-4">Contato / Telefone</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredCarriers.map(carrier => (
                  <tr key={carrier.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-100">
                          {carrier.internalCode || 'TR'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer" onClick={() => handleOpenView(carrier)}>
                            {carrier.tradeName || carrier.corporateName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">{carrier.corporateName}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-800 font-medium">{carrier.cnpj}</p>
                      <p className="text-[11px] text-slate-500">IE: {carrier.stateRegistration || 'Isento'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {carrier.defaultFreightType || 'FOB'}
                        </span>
                        {carrier.supportsRedispersion && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Redespacho
                          </span>
                        )}
                      </div>
                      {carrier.logisticsHub && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[160px]" title={carrier.logisticsHub}>
                          Hub: {carrier.logisticsHub}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-medium">{carrier.city ? `${carrier.city} / ${carrier.state}` : 'Não informado'}</p>
                      <p className="text-[11px] text-slate-500">{carrier.neighborhood || '-'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-800">{carrier.phone || carrier.whatsapp || carrier.cellphone || '-'}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{carrier.email || carrier.contactName || '-'}</p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(carrier)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                          carrier.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                        title="Clique para alternar o status da transportadora"
                      >
                        {carrier.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintCarrierSheet(carrier)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                          title="Imprimir Ficha Cadastral"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenView(carrier)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(carrier)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(carrier.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                          title="Excluir Transportadora"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL (CREATE / EDIT / VIEW) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            {/* MODAL HEADER */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {modalMode === 'create' && 'Nova Transportadora'}
                    {modalMode === 'edit' && `Editar Transportadora: ${formData.tradeName || formData.corporateName}`}
                    {modalMode === 'view' && `Visualizar Transportadora: ${formData.tradeName || formData.corporateName}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">Preencha os dados fiscais, endereço e parâmetros operacionais de frete</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL BODY */}
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* SECTION 1: IDENTIFICAÇÃO E DADOS FISCAIS */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">1. Identificação & Dados Fiscais</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Razão Social *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.corporateName || ''}
                      onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                      placeholder="Ex: Braspress Transportes Urgentes Ltda"
                      className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition ${formErrors.corporateName ? 'border-rose-500' : 'border-slate-200'}`}
                    />
                    {formErrors.corporateName && <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.corporateName}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.tradeName || ''}
                      onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                      placeholder="Ex: Braspress"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CNPJ ou CPF *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.cnpj || ''}
                      onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="Ex: 48.740.351/0001-65"
                      className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition ${formErrors.cnpj ? 'border-rose-500' : 'border-slate-200'}`}
                    />
                    {formErrors.cnpj && <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.cnpj}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Inscrição Estadual (IE)</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.stateRegistration || ''}
                      onChange={e => setFormData({ ...formData, stateRegistration: e.target.value })}
                      placeholder="Ex: 112.445.890.115 ou Isento"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Código Interno / Sigla</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.internalCode || ''}
                      onChange={e => setFormData({ ...formData, internalCode: e.target.value })}
                      placeholder="Ex: TR-001"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: OPERAÇÃO LOGÍSTICA & REDESPACHO */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">2. Logística, Operação & Redespacho</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Modalidade Padrão de Frete</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={formData.defaultFreightType || 'FOB'}
                      onChange={e => setFormData({ ...formData, defaultFreightType: e.target.value as FreightType })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="FOB">FOB - Por conta do Destinatário</option>
                      <option value="CIF">CIF - Por conta do Emitente</option>
                      <option value="THIRD_PARTY">Terceiros</option>
                      <option value="NONE">Sem Frete / Retirada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Hub Logístico / Ponto de Coleta</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.logisticsHub || ''}
                      onChange={e => setFormData({ ...formData, logisticsHub: e.target.value })}
                      placeholder="Ex: CD São Paulo / Terminal Anhanguera"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Registro ANTT / RNTRC</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.rntrc || ''}
                      onChange={e => setFormData({ ...formData, rntrc: e.target.value })}
                      placeholder="Ex: 12345678"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="md:col-span-3 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          id="check-redispersion"
                          type="checkbox"
                          disabled={modalMode === 'view'}
                          checked={Boolean(formData.supportsRedispersion)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const currentOps = formData.shippingOperations || ['direct'];
                            let updatedOps = [...currentOps];
                            if (checked && !updatedOps.includes('redespacho')) {
                              updatedOps.push('redespacho');
                            } else if (!checked) {
                              updatedOps = updatedOps.filter(o => o !== 'redespacho');
                            }
                            setFormData({
                              ...formData,
                              supportsRedispersion: checked,
                              shippingOperations: updatedOps
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="check-redispersion" className="text-xs font-bold text-blue-950 cursor-pointer">
                          Habilitar como Transportadora de Redespacho / Cross-docking
                        </label>
                      </div>
                      <span className="text-[10px] text-blue-700 font-medium">Permite transbordo e entrega final regional</span>
                    </div>
                    <p className="text-[11px] text-slate-600 pl-6">
                      Ao ativar esta opção, esta transportadora ficará disponível no seletor de <strong>"Transportadora de Redespacho"</strong> nos pedidos de venda e cotações logísticas.
                    </p>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">URL / Portal de Rastreamento</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.trackingUrl || ''}
                      onChange={e => setFormData({ ...formData, trackingUrl: e.target.value })}
                      placeholder="Ex: https://rastreio.transportadora.com.br?tracking="
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CONTATO E ATENDIMENTO */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">3. Contato & Atendimento</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Contato Responsável</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.contactName || ''}
                      onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Ex: Marcos Silva (Operações)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefone Fixo</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ex: (11) 3456-7890"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">WhatsApp / Celular</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.whatsapp || formData.cellphone || ''}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value, cellphone: e.target.value })}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">E-mail Operacional / CTe</label>
                    <input
                      type="email"
                      disabled={modalMode === 'view'}
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Ex: expedicao@braspress.com.br"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: ENDEREÇO E BASE */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">4. Endereço da Filial / Garagem</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CEP</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.cep || ''}
                      onChange={e => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="Ex: 01001-000"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Logradouro</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.street || ''}
                      onChange={e => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Ex: Rodovia Presidente Dutra"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Número</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.number || ''}
                      onChange={e => setFormData({ ...formData, number: e.target.value })}
                      placeholder="Ex: KM 220"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bairro</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.neighborhood || ''}
                      onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Ex: Vila Maria"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formData.city || ''}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Ex: São Paulo"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">UF</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      maxLength={2}
                      value={formData.state || ''}
                      onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      placeholder="Ex: SP"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: OBSERVAÇÕES */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">5. Observações & Restrições de Coleta</h4>
                </div>

                <textarea
                  disabled={modalMode === 'view'}
                  rows={3}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações contratuais, horários de corte para coleta, tipos de veículo aceitos..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {modalMode !== 'create' && (
                    <span className="text-[11px] text-slate-400">
                      ID: {formData.id} &bull; Status: <strong className={formData.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}>{formData.status === 'active' ? 'Ativo' : 'Inativo'}</strong>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                  </button>

                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{modalMode === 'create' ? 'Cadastrar Transportadora' : 'Salvar Alterações'}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Confirmar Exclusão</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Tem certeza que deseja remover esta transportadora? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCarrier(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
