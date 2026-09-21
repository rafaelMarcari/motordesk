import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Printer,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FileText,
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react';
import { AppDatabase, User, CompanyInfo } from '../types';

export interface RepresentativeOrdersProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>> | ((fn: (prev: AppDatabase) => AppDatabase) => void);
  currentUser: User;
  activeCompanyId?: string;
  onAddHistoryLog?: (entry: any) => void;
  onNavigateToView?: (viewId: string) => void;
}

export function RepresentativeOrdersView({
  db,
  setDb,
  currentUser,
  activeCompanyId,
  onAddHistoryLog,
  onNavigateToView
}: RepresentativeOrdersProps) {
  const companyId = activeCompanyId || currentUser.companyId || (db.companyInfo?.id) || 'comp-1';

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRep, setSelectedRep] = useState('ALL');
  const [selectedFactory, setSelectedFactory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Ordenação por Coluna com Flechinhas
  const [sortField, setSortField] = useState<string>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modais
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<any | null>(null);
  const [showBillingModal, setShowBillingModal] = useState<any | null>(null);
  const [factoryInvoiceNumber, setFactoryInvoiceNumber] = useState('');
  const [factoryInvoiceDate, setFactoryInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Form de Novo Pedido da Representação
  const [formRepName, setFormRepName] = useState(currentUser.name || 'Representante Externo');
  const [formFactoryId, setFormFactoryId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formNewClientName, setFormNewClientName] = useState('');
  const [formNewClientCnpj, setFormNewClientCnpj] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('28/42/56 dias faturado direto');
  const [formFreight, setFormFreight] = useState('CIF');
  const [formCarrierName, setFormCarrierName] = useState('Transportadora Indicada pela Fábrica');
  const [formCommissionRate, setFormCommissionRate] = useState('5');
  const [formNotes, setFormNotes] = useState('');

  // Itens do Pedido no Form
  const [items, setItems] = useState<Array<{
    id: string;
    description: string;
    quantity: number;
    tablePrice: number;
    discountPercent: number;
    unitPrice: number;
    totalPrice: number;
    commissionPercent: number;
    commissionAmount: number;
  }>>([
    {
      id: 'it-init-1',
      description: 'Lote de Peças / Produtos Linha Fábrica A',
      quantity: 10,
      tablePrice: 250,
      discountPercent: 0,
      unitPrice: 250,
      totalPrice: 2500,
      commissionPercent: 5,
      commissionAmount: 125
    }
  ]);

  // Empresas Representadas (Fábricas parceiras)
  const representedCompanies = useMemo(() => {
    return (db as any).representedCompanies && (db as any).representedCompanies.length > 0
      ? (db as any).representedCompanies
      : [
          {
            id: 'prin-abc-01',
            companyId,
            tradeName: 'Fábrica ABC Indústria de Peças S/A',
            cnpj: '01.234.567/0001-89',
            contactPerson: 'Carlos Eduardo (Gerente Comercial)',
            defaultCommissionPercentage: 5,
            leadTimeDays: 15
          },
          {
            id: 'prin-metal-02',
            companyId,
            tradeName: 'Metalúrgica Precision & Usinagem Ltda',
            cnpj: '45.888.999/0001-22',
            contactPerson: 'Marcos Vinicius',
            defaultCommissionPercentage: 6,
            leadTimeDays: 20
          },
          {
            id: 'prin-tratores-03',
            companyId,
            tradeName: 'AgroParts Implementos Fabris',
            cnpj: '77.333.111/0001-55',
            contactPerson: 'Juliana Castro',
            defaultCommissionPercentage: 4.5,
            leadTimeDays: 12
          }
        ];
  }, [(db as any).representedCompanies, companyId]);

  // Lista de Pedidos de Representação
  const representativeOrders = useMemo(() => {
    const rawList = (db as any).representativeOrders || [];
    if (rawList.length > 0) return rawList;

    // Dados de demonstração padrão se vazio
    return [
      {
        id: 'ord-rep-000123',
        companyId,
        orderNumber: 'REP-2026-001',
        representedId: 'prin-abc-01',
        representedName: 'Fábrica ABC Indústria de Peças S/A',
        representativeName: 'Roberto Representações',
        clientId: 'cli-silva-01',
        clientName: 'Auto Peças Silva & Filhos Ltda',
        clientCnpjCpf: '12.345.678/0001-90',
        clientCityUf: 'Campinas/SP',
        orderDate: '2026-09-02',
        paymentCondition: '28/56 dias faturado direto',
        freightType: 'CIF',
        carrierName: 'Expresso Rodoviário Brasil',
        items: [
          { description: 'Amortecedores Dianteiros Pressurizados Heavy', quantity: 20, unitPrice: 400, totalPrice: 8000, commissionAmount: 400 },
          { description: 'Kits de Pastilhas de Freio Cerâmica', quantity: 35, unitPrice: 200, totalPrice: 7000, commissionAmount: 350 },
          { description: 'Kits de Correia Dentada & Tensores', quantity: 25, unitPrice: 200, totalPrice: 5000, commissionAmount: 250 }
        ],
        totalOrderAmount: 20000,
        commissionPercentage: 5,
        commissionAmount: 1000,
        status: 'FATURADO_TOTAL',
        factoryOrderNumbers: ['NF-45871'],
        factoryInvoiceDate: '2026-09-05',
        commissionStatus: 'LIBERADA',
        createdBy: currentUser.name || 'Roberto'
      },
      {
        id: 'ord-rep-000124',
        companyId,
        orderNumber: 'REP-2026-002',
        representedId: 'prin-metal-02',
        representedName: 'Metalúrgica Precision & Usinagem Ltda',
        representativeName: 'Roberto Representações',
        clientId: 'cli-demo-2',
        clientName: 'Centro Automotivo Paulista S/A',
        clientCnpjCpf: '44.555.666/0001-11',
        clientCityUf: 'São Paulo/SP',
        orderDate: '2026-09-08',
        paymentCondition: '30/60 dias direto com a fábrica',
        freightType: 'FOB',
        carrierName: 'Transvale Cargas Rápidas',
        items: [
          { description: 'Flanges Usinadas em Alumínio 6061-T6', quantity: 150, unitPrice: 90, totalPrice: 13500, commissionAmount: 810 }
        ],
        totalOrderAmount: 13500,
        commissionPercentage: 6,
        commissionAmount: 810,
        status: 'ENVIADO_FABRICA',
        factoryOrderNumbers: [],
        commissionStatus: 'A_RECEBER',
        createdBy: currentUser.name || 'Roberto'
      },
      {
        id: 'ord-rep-000125',
        companyId,
        orderNumber: 'REP-2026-003',
        representedId: 'prin-tratores-03',
        representedName: 'AgroParts Implementos Fabris',
        representativeName: 'Lucas Oliveira (Representante)',
        clientId: 'cli-demo-3',
        clientName: 'Cooperativa Agrícola Centro-Oeste',
        clientCnpjCpf: '33.222.111/0001-99',
        clientCityUf: 'Ribeirão Preto/SP',
        orderDate: '2026-09-12',
        paymentCondition: 'Sinal 30% + 70% a 30 ddl',
        freightType: 'CIF',
        carrierName: 'Braspress Transportes',
        items: [
          { description: 'Ponteiras Forjadas de Subsolador Agrícola', quantity: 80, unitPrice: 220, totalPrice: 17600, commissionAmount: 792 }
        ],
        totalOrderAmount: 17600,
        commissionPercentage: 4.5,
        commissionAmount: 792,
        status: 'EM_DIGITACAO',
        factoryOrderNumbers: [],
        commissionStatus: 'A_RECEBER',
        createdBy: 'Lucas Oliveira'
      }
    ];
  }, [(db as any).representativeOrders, companyId, currentUser.name]);

  // Lista de Clientes disponíveis no MotorDesk
  const clientsList = useMemo(() => {
    return (db.clients || []).filter(c => !c.companyId || c.companyId === companyId);
  }, [db.clients, companyId]);

  // Função para alternar ordenação ao clicar no cabeçalho
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtragem e Ordenação
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...representativeOrders];

    // Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.clientName && o.clientName.toLowerCase().includes(q)) ||
        (o.representedName && o.representedName.toLowerCase().includes(q)) ||
        (o.representativeName && o.representativeName.toLowerCase().includes(q))
      );
    }

    // Filtro por Representante
    if (selectedRep !== 'ALL') {
      result = result.filter(o => o.representativeName === selectedRep);
    }

    // Filtro por Fábrica
    if (selectedFactory !== 'ALL') {
      result = result.filter(o => o.representedId === selectedFactory || o.representedName === selectedFactory);
    }

    // Filtro por Status
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Filtro por Data
    if (startDate) {
      result = result.filter(o => o.orderDate >= startDate);
    }
    if (endDate) {
      result = result.filter(o => o.orderDate <= endDate);
    }

    // Ordenação com flechinhas
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [representativeOrders, searchTerm, selectedRep, selectedFactory, statusFilter, startDate, endDate, sortField, sortDirection]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const totalOrders = filteredAndSortedOrders.length;
    const totalOrderAmount = filteredAndSortedOrders.reduce((acc, it) => acc + (Number(it.totalOrderAmount) || 0), 0);
    const totalCommission = filteredAndSortedOrders.reduce((acc, it) => acc + (Number(it.commissionAmount) || 0), 0);
    const paidCommission = filteredAndSortedOrders
      .filter(it => it.commissionStatus === 'PAGA' || it.commissionStatus === 'LIBERADA')
      .reduce((acc, it) => acc + (Number(it.commissionAmount) || 0), 0);
    const pendingCommission = totalCommission - paidCommission;

    return { totalOrders, totalOrderAmount, totalCommission, paidCommission, pendingCommission };
  }, [filteredAndSortedOrders]);

  // Lista única de representantes para o filtro
  const uniqueReps = useMemo(() => {
    const set = new Set<string>();
    representativeOrders.forEach(o => {
      if (o.representativeName) set.add(o.representativeName);
    });
    return Array.from(set);
  }, [representativeOrders]);

  // Atualizar itens no form de novo pedido
  const handleItemChange = (index: number, field: string, val: any) => {
    setItems(prev => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      const q = Number(target.quantity) || 1;
      const tp = Number(target.tablePrice) || 0;
      const disc = Number(target.discountPercent) || 0;
      const commRate = Number(target.commissionPercent) || Number(formCommissionRate) || 5;

      const unitPrice = tp * (1 - disc / 100);
      const totalPrice = unitPrice * q;
      const commissionAmount = totalPrice * (commRate / 100);

      target.unitPrice = Number(unitPrice.toFixed(2));
      target.totalPrice = Number(totalPrice.toFixed(2));
      target.commissionAmount = Number(commissionAmount.toFixed(2));

      next[index] = target;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `it-${Date.now()}`,
        description: '',
        quantity: 1,
        tablePrice: 100,
        discountPercent: 0,
        unitPrice: 100,
        totalPrice: 100,
        commissionPercent: Number(formCommissionRate) || 5,
        commissionAmount: (100 * (Number(formCommissionRate) || 5)) / 100
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar Novo Pedido da Representação
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Adicione ao menos um item ao pedido da representação.');
      return;
    }

    const factory = representedCompanies.find(f => f.id === formFactoryId) || representedCompanies[0];
    let clientName = formNewClientName;
    let clientCnpj = formNewClientCnpj;

    if (formClientId) {
      const foundClient = clientsList.find(c => c.id === formClientId);
      if (foundClient) {
        clientName = foundClient.name;
        clientCnpj = foundClient.cpfCnpj || foundClient.cpf || '';
      }
    }

    if (!clientName.trim()) {
      alert('Informe o cliente comprador do pedido.');
      return;
    }

    const totalOrderAmount = items.reduce((acc, it) => acc + it.totalPrice, 0);
    const commPct = Number(formCommissionRate) || 5;
    const commissionAmount = Number((totalOrderAmount * (commPct / 100)).toFixed(2));

    const newOrderNumber = `REP-${new Date().getFullYear()}-${String(representativeOrders.length + 1).padStart(3, '0')}`;
    const newOrder = {
      id: `ord-rep-${Date.now()}`,
      companyId,
      orderNumber: newOrderNumber,
      representedId: factory?.id || 'prin-1',
      representedName: factory?.tradeName || 'Fábrica Representada',
      representativeName: formRepName,
      clientId: formClientId || `cli-temp-${Date.now()}`,
      clientName,
      clientCnpjCpf: clientCnpj,
      clientCityUf: 'Brasil',
      orderDate: new Date().toISOString().split('T')[0],
      paymentCondition: formPaymentTerms,
      freightType: formFreight,
      carrierName: formCarrierName,
      items,
      totalOrderAmount,
      commissionPercentage: commPct,
      commissionAmount,
      status: 'EM_DIGITACAO',
      factoryOrderNumbers: [],
      commissionStatus: 'A_RECEBER',
      notes: formNotes,
      createdBy: currentUser.name || currentUser.username
    };

    const updated = [newOrder, ...representativeOrders];
    (setDb as any)(prev => ({
      ...prev,
      representativeOrders: updated
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog({
        type: 'commercial',
        action: 'REPRESENTATION_ORDER_CREATED',
        description: `Novo Pedido de Representação #${newOrderNumber} digitado para ${factory.tradeName} (Cliente: ${clientName}, Total: R$ ${totalOrderAmount.toFixed(2)})`,
        companyId,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }

    setShowNewModal(false);
    alert(`✅ Pedido de Representação #${newOrderNumber} gerado com sucesso!`);
  };

  // Transmitir para Fábrica
  const handleSendToFactory = (order: any) => {
    if (!confirm(`Deseja enviar o pedido ${order.orderNumber} para a fábrica representada (${order.representedName})?`)) return;

    const updated = representativeOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'ENVIADO_FABRICA',
          sentToFactoryAt: new Date().toISOString()
        };
      }
      return o;
    });

    (setDb as any)(prev => ({ ...prev, representativeOrders: updated }));
    alert(`📡 Pedido ${order.orderNumber} enviado com sucesso para a esteira comercial da fábrica ${order.representedName}!`);
  };

  // Registrar Faturamento da Fábrica
  const handleConfirmBilling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBillingModal) return;

    const updated = representativeOrders.map(o => {
      if (o.id === showBillingModal.id) {
        return {
          ...o,
          status: 'FATURADO_TOTAL',
          factoryOrderNumbers: [factoryInvoiceNumber || 'NF-FBR-001'],
          factoryInvoiceDate: factoryInvoiceDate,
          commissionStatus: 'LIBERADA'
        };
      }
      return o;
    });

    (setDb as any)(prev => ({ ...prev, representativeOrders: updated }));
    setShowBillingModal(null);
    setFactoryInvoiceNumber('');
    alert(`🎉 Faturamento da Fábrica registrado! A comissão de R$ ${showBillingModal.commissionAmount?.toFixed(2)} foi LIBERADA para recebimento.`);
  };

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = [
      'Nº Pedido',
      'Data',
      'Representante',
      'Fábrica Representada',
      'Cliente',
      'CNPJ/CPF',
      'Valor Pedido (R$)',
      '% Comissão',
      'Valor Comissão (R$)',
      'Status Pedido',
      'Status Comissão',
      'NF Fábrica'
    ];

    const rows = filteredAndSortedOrders.map(o => [
      o.orderNumber,
      o.orderDate,
      `"${(o.representativeName || '').replace(/"/g, '""')}"`,
      `"${(o.representedName || '').replace(/"/g, '""')}"`,
      `"${(o.clientName || '').replace(/"/g, '""')}"`,
      o.clientCnpjCpf || '',
      o.totalOrderAmount.toFixed(2),
      o.commissionPercentage,
      o.commissionAmount.toFixed(2),
      o.status,
      o.commissionStatus,
      (o.factoryOrderNumbers || []).join('; ')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedidos_representacao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Componente Auxiliar para Flechinhas de Ordenação
  const SortArrow = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold ml-1 inline" />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" id="representative-orders-view">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Pedidos da Representação Comercial
              </h1>
              <p className="text-xs text-slate-500">
                Gestão de pedidos de vendas externas para indústrias e fábricas parceiras, com conciliação e comissões automáticas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-export-rep-orders-csv"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            id="btn-new-representation-order"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Digitar Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pedidos Emitidos</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpis.totalOrders}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pedidos no período selecionado</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume Faturado Fábricas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            R$ {kpis.totalOrderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total vendido para as representadas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comissões a Receber</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            R$ {kpis.pendingCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Aguardando faturamento/pagamento</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comissões Liberadas</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700">
            R$ {kpis.paidCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Prontas para saque ou creditadas</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Textual */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar pedido, cliente, fábrica..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Filtro Fábrica */}
          <div>
            <select
              value={selectedFactory}
              onChange={e => setSelectedFactory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
            >
              <option value="ALL">Todas as Fábricas Representadas</option>
              {representedCompanies.map(f => (
                <option key={f.id} value={f.id}>{f.tradeName}</option>
              ))}
            </select>
          </div>

          {/* Filtro Representante */}
          <div>
            <select
              value={selectedRep}
              onChange={e => setSelectedRep(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
            >
              <option value="ALL">Todos os Representantes</option>
              {uniqueReps.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="EM_DIGITACAO">Em Digitação / Rascunho</option>
              <option value="ENVIADO_FABRICA">Enviado à Fábrica</option>
              <option value="FATURADO_PARCIAL">Faturado Parcial</option>
              <option value="FATURADO_TOTAL">Faturado Total</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Filtro Período */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-1/2 px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              title="Data Inicial"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-1/2 px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              title="Data Final"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos da Representação com Flechinhas de Ordenação */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => handleSort('orderNumber')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none"
                  title="Clique para ordenar por número do pedido"
                >
                  <div className="flex items-center">
                    <span>Nº Pedido</span>
                    <SortArrow field="orderNumber" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('orderDate')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none"
                  title="Clique para ordenar por data"
                >
                  <div className="flex items-center">
                    <span>Data</span>
                    <SortArrow field="orderDate" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('representativeName')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none"
                  title="Clique para ordenar por representante"
                >
                  <div className="flex items-center">
                    <span>Representante</span>
                    <SortArrow field="representativeName" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('representedName')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none"
                  title="Clique para ordenar por fábrica representada"
                >
                  <div className="flex items-center">
                    <span>Fábrica Representada</span>
                    <SortArrow field="representedName" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('clientName')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none"
                  title="Clique para ordenar por cliente"
                >
                  <div className="flex items-center">
                    <span>Cliente Comprador</span>
                    <SortArrow field="clientName" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalOrderAmount')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none text-right"
                  title="Clique para ordenar por valor total"
                >
                  <div className="flex items-center justify-end">
                    <span>Valor Total</span>
                    <SortArrow field="totalOrderAmount" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('commissionAmount')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none text-right"
                  title="Clique para ordenar por comissão"
                >
                  <div className="flex items-center justify-end">
                    <span>Comissão (R$)</span>
                    <SortArrow field="commissionAmount" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none text-center"
                  title="Clique para ordenar por status"
                >
                  <div className="flex items-center justify-center">
                    <span>Status Pedido</span>
                    <SortArrow field="status" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('commissionStatus')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none text-center"
                  title="Clique para ordenar por status da comissão"
                >
                  <div className="flex items-center justify-center">
                    <span>Comissão</span>
                    <SortArrow field="commissionStatus" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Nenhum pedido de representação encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrders.map(order => {
                  const isBilled = order.status === 'FATURADO_TOTAL' || order.status === 'FATURADO_PARCIAL';
                  const isSent = order.status === 'ENVIADO_FABRICA';
                  const isDraft = order.status === 'EM_DIGITACAO';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition group">
                      <td className="p-3.5 font-bold font-mono text-blue-700">
                        {order.orderNumber}
                      </td>
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        {order.orderDate}
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {order.representativeName || 'Representante'}
                      </td>
                      <td className="p-3.5 font-semibold text-indigo-900">
                        {order.representedName}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{order.clientName}</div>
                        <div className="text-[10px] text-slate-400">{order.clientCnpjCpf}</div>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        R$ {Number(order.totalOrderAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        R$ {Number(order.commissionAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({order.commissionPercentage}%)
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block uppercase tracking-wider ${
                            isBilled
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isSent
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : isDraft
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status === 'FATURADO_TOTAL'
                            ? 'Faturado Total'
                            : order.status === 'ENVIADO_FABRICA'
                            ? 'Enviado à Fábrica'
                            : order.status === 'EM_DIGITACAO'
                            ? 'Em Digitação'
                            : order.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            order.commissionStatus === 'LIBERADA' || order.commissionStatus === 'PAGA'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {order.commissionStatus === 'LIBERADA' ? 'Liberada' : 'A Receber'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Espelho do Pedido */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForView(order)}
                            title="Ver espelho do pedido da representação"
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Enviar à Fábrica se em Digitação */}
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleSendToFactory(order)}
                              title="Transmitir pedido para a fábrica representada"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Lançar Faturamento da Fábrica */}
                          {isSent && (
                            <button
                              type="button"
                              onClick={() => setShowBillingModal(order)}
                              title="Registrar faturamento da NF-e pela fábrica"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg transition border border-emerald-200"
                            >
                              Lançar Faturamento
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Digitar Novo Pedido de Representação */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Digitar Novo Pedido da Representação
                  </h3>
                  <p className="text-xs text-slate-500">
                    Venda externa para faturamento e despacho direto pela indústria parceira.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Fábrica Representada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fábrica / Indústria Representada *
                  </label>
                  <select
                    value={formFactoryId}
                    onChange={e => {
                      setFormFactoryId(e.target.value);
                      const f = representedCompanies.find(rc => rc.id === e.target.value);
                      if (f && f.defaultCommissionPercentage) {
                        setFormCommissionRate(String(f.defaultCommissionPercentage));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Selecione a Fábrica Parceira</option>
                    {representedCompanies.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.tradeName} (Comissão padrão: {f.defaultCommissionPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Representante Comercial */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome do Representante Comercial *
                  </label>
                  <input
                    type="text"
                    value={formRepName}
                    onChange={e => setFormRepName(e.target.value)}
                    required
                    placeholder="Ex: Roberto Vendas & Representações"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cliente Comprador (Cadastrado)
                  </label>
                  <select
                    value={formClientId}
                    onChange={e => {
                      setFormClientId(e.target.value);
                      const cl = clientsList.find(c => c.id === e.target.value);
                      if (cl) {
                        setFormNewClientName(cl.name);
                        setFormNewClientCnpj(cl.cpfCnpj || cl.cpf || '');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">-- Selecionar Cliente Existente ou Digitar Novo --</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cpfCnpj || c.cpf || 'Sem doc'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Razão Social / Nome do Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Razão Social / Nome Fantasia do Comprador *
                  </label>
                  <input
                    type="text"
                    value={formNewClientName}
                    onChange={e => setFormNewClientName(e.target.value)}
                    required
                    placeholder="Ex: Auto Peças Silva & Filhos Ltda"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {/* CNPJ / CPF */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CNPJ / CPF do Comprador
                  </label>
                  <input
                    type="text"
                    value={formNewClientCnpj}
                    onChange={e => setFormNewClientCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Alíquota de Comissão */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alíquota de Comissão (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formCommissionRate}
                    onChange={e => {
                      setFormCommissionRate(e.target.value);
                      const rate = Number(e.target.value) || 0;
                      setItems(prev =>
                        prev.map(it => ({
                          ...it,
                          commissionPercent: rate,
                          commissionAmount: Number((it.totalPrice * (rate / 100)).toFixed(2))
                        }))
                      );
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Condição de Pagamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Condição de Pagamento Direto com a Fábrica
                  </label>
                  <input
                    type="text"
                    value={formPaymentTerms}
                    onChange={e => setFormPaymentTerms(e.target.value)}
                    placeholder="Ex: 28/42/56 ddl faturado"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Frete e Transportadora */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Frete</label>
                    <select
                      value={formFreight}
                      onChange={e => setFormFreight(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="CIF">CIF (Por conta da fábrica)</option>
                      <option value="FOB">FOB (Por conta do cliente)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Transportadora</label>
                    <input
                      type="text"
                      value={formCarrierName}
                      onChange={e => setFormCarrierName(e.target.value)}
                      placeholder="Nome Transp."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Itens do Pedido */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Itens / Produtos do Pedido
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={it.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Descrição do item/peça..."
                          value={it.description}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={it.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                          title="Quantidade"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Preço Tab."
                          value={it.tablePrice}
                          onChange={e => handleItemChange(idx, 'tablePrice', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                          title="Preço Tabela (R$)"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="% Desc"
                          value={it.discountPercent}
                          onChange={e => handleItemChange(idx, 'discountPercent', e.target.value)}
                          className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                          title="% Desconto"
                        />
                      </div>
                      <div className="sm:col-span-2 text-right font-bold text-slate-800">
                        R$ {it.totalPrice.toFixed(2)}
                      </div>
                      <div className="sm:col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo de Totais */}
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 mt-2">
                  <div>
                    <span>Total do Pedido: </span>
                    <strong className="text-base text-blue-700 ml-1">
                      R$ {items.reduce((acc, it) => acc + it.totalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span>Comissão Estimada ({formCommissionRate}%): </span>
                    <strong className="text-base text-emerald-700 ml-1">
                      R$ {(items.reduce((acc, it) => acc + it.totalPrice, 0) * (Number(formCommissionRate) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Salvar Pedido da Representação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Espelho / Visualização do Pedido */}
      {selectedOrderForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Espelho do Pedido {selectedOrderForView.orderNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForView(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Fábrica Representada</p>
                  <p className="font-bold text-slate-800">{selectedOrderForView.representedName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Representante Comercial</p>
                  <p className="font-bold text-slate-800">{selectedOrderForView.representativeName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Cliente Comprador</p>
                  <p className="font-bold text-slate-800">{selectedOrderForView.clientName}</p>
                  <p className="text-[10px] text-slate-500">{selectedOrderForView.clientCnpjCpf}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Condição de Pagamento</p>
                  <p className="font-bold text-slate-800">{selectedOrderForView.paymentCondition}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] tracking-wider">Itens do Pedido</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Qtd</th>
                        <th className="p-2 text-right">Unitário</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedOrderForView.items || []).map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2 font-medium text-slate-800">{it.description}</td>
                          <td className="p-2 text-center font-mono">{it.quantity}</td>
                          <td className="p-2 text-right font-mono">R$ {Number(it.unitPrice || 0).toFixed(2)}</td>
                          <td className="p-2 text-right font-bold font-mono">R$ {Number(it.totalPrice || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between font-bold">
                <div>
                  <span className="text-emerald-900">Total Faturado Fábrica: </span>
                  <strong className="text-base text-emerald-800">
                    R$ {Number(selectedOrderForView.totalOrderAmount || 0).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-900">Comissão ({selectedOrderForView.commissionPercentage}%): </span>
                  <strong className="text-base text-emerald-800">
                    R$ {Number(selectedOrderForView.commissionAmount || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar Faturamento da Fábrica */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Registrar Faturamento da Fábrica
            </h3>
            <p className="text-xs text-slate-500">
              Informe os dados da Nota Fiscal emitida pela fábrica {showBillingModal.representedName} para liberar a comissão correspondente.
            </p>

            <form onSubmit={handleConfirmBilling} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Número da NF-e Emitida pela Fábrica *
                </label>
                <input
                  type="text"
                  required
                  value={factoryInvoiceNumber}
                  onChange={e => setFactoryInvoiceNumber(e.target.value)}
                  placeholder="Ex: NF-e 45890 Série 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Data de Emissão da NF da Fábrica
                </label>
                <input
                  type="date"
                  value={factoryInvoiceDate}
                  onChange={e => setFactoryInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                <p className="font-bold">Comissão Calculada:</p>
                <p className="text-base font-extrabold text-indigo-700">
                  R$ {Number(showBillingModal.commissionAmount || 0).toFixed(2)} ({showBillingModal.commissionPercentage}%)
                </p>
                <p className="text-[10px] text-indigo-600 mt-1">Ao confirmar, o status da comissão passará para LIBERADA.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBillingModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Confirmar Faturamento & Liberar Comissão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
