/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — MÓDULO COMPLETO DE REPRESENTAÇÃO COMERCIAL & CONCILIAÇÃO 1:N
 * Estrutura em 9 abas operacionais com conciliação inteligente e integração ao Contas a Receber
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  AppDatabase,
  User,
  RepresentedCompany,
  RepresentativeOrder,
  RepresentativeFactoryOrder,
  FactoryInvoice,
  FactoryBillingImport,
  ReconciliationResultItem,
  RepresentativeCommission,
  AccountReceivable,
  FinancialTransaction,
} from '../types';
import {
  Building2,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  TrendingUp,
  Download,
  Share2,
  Check,
  AlertCircle,
  FileCheck,
  Percent,
  X,
  Sparkles,
  Layers,
  UploadCloud,
  BarChart3,
  CreditCard,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { RepresentativeOrdersView } from './RepresentativeOrdersView';
import { RepresentativeReconciliationView } from './RepresentativeReconciliationView';
import { RepresentativeCommissionsTab } from './representative/RepresentativeCommissionsTab';
import { RepresentativeReportsTab } from './representative/RepresentativeReportsTab';
import { RepresentativeImportModal } from './representative/RepresentativeImportModal';
import { runRepresentativeReconciliation } from '../utils/representativeUtils';

interface RepresentativeCommerceViewProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: User;
  activeCompanyId: string;
  initialTab?: RepTabId;
  onAddHistoryLog?: (type: string, title: string, description: string, referenceId?: string, clientName?: string) => void;
  onNavigateToView?: (view: any) => void;
}

export type RepTabId =
  | 'dashboard'
  | 'principals'
  | 'orders'
  | 'factory_invoicing'
  | 'imports'
  | 'reconciliation'
  | 'commissions'
  | 'receivables'
  | 'reports';

export const RepresentativeCommerceView: React.FC<RepresentativeCommerceViewProps> = ({
  db,
  setDb,
  currentUser,
  activeCompanyId,
  initialTab,
  onAddHistoryLog,
  onNavigateToView,
}) => {
  const [activeTab, setActiveTab] = useState<RepTabId>(initialTab || 'dashboard');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewPrincipalModal, setShowNewPrincipalModal] = useState(false);

  // Sincroniza aba ativa se initialTab mudar externamente
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form states for New Principal
  const [principalForm, setPrincipalForm] = useState({
    tradeName: '',
    corporateName: '',
    cnpj: '',
    contactName: '',
    email: '',
    phone: '',
    defaultCommissionPercentage: 5,
    leadTimeDays: 30,
  });

  // Garante sementes de demonstração caso a base esteja vazia
  useEffect(() => {
    const existingPrincipals = db.representedCompanies || [];
    if (existingPrincipals.length === 0) {
      const demoPrincipal: RepresentedCompany = {
        id: `prin-abc-01`,
        companyId: activeCompanyId,
        corporateName: 'Fábrica ABC Indústria de Autopeças S/A',
        tradeName: 'Fábrica ABC',
        cnpj: '01.234.567/0001-89',
        contactPerson: 'Carlos Eduardo (Gerente Comercial)',
        email: 'vendas@fabricaabc.com.br',
        phone: '(11) 3456-7890',
        whatsapp: '11987654321',
        defaultCommissionPercentage: 5,
        commissionPaymentRule: 'UPON_INVOICE',
        commissionPaymentTerms: '30 dias após emissão da NF-e',
        active: true,
        createdAt: new Date().toISOString(),
      };

      const demoOrder: RepresentativeOrder = {
        id: `ord-rep-000123`,
        companyId: activeCompanyId,
        orderNumber: 'REP-000123',
        representedId: demoPrincipal.id,
        representedName: demoPrincipal.tradeName,
        clientId: 'cli-silva-01',
        clientName: 'Auto Peças Silva & Filhos Ltda',
        clientCnpjCpf: '12.345.678/0001-90',
        orderDate: '2026-09-01',
        paymentCondition: '28/56 dias direto com a fábrica',
        carrierName: 'Expresso Rodoviário Brasil',
        freightType: 'CIF',
        items: [
          {
            id: 'it-1',
            description: 'Amortecedores Dianteiros Pressurizados',
            quantity: 20,
            tablePrice: 400,
            discountPercentage: 0,
            unitPrice: 400,
            totalPrice: 8000,
            commissionPercentage: 5,
            commissionAmount: 400,
          },
          {
            id: 'it-2',
            description: 'Kits de Pastilhas de Freio Cerâmica',
            quantity: 35,
            tablePrice: 200,
            discountPercentage: 0,
            unitPrice: 200,
            totalPrice: 7000,
            commissionPercentage: 5,
            commissionAmount: 350,
          },
          {
            id: 'it-3',
            description: 'Kits de Correia Dentada & Tensores',
            quantity: 25,
            tablePrice: 200,
            discountPercentage: 0,
            unitPrice: 200,
            totalPrice: 5000,
            commissionPercentage: 5,
            commissionAmount: 250,
          },
        ],
        subtotal: 20000,
        totalDiscount: 0,
        totalOrderAmount: 20000,
        commissionPercentage: 5,
        commissionAmount: 1000,
        estimatedTotalCommission: 1000,
        status: 'invoiced_total',
        factoryOrderNumbers: ['45871', '45872', '45873'],
        createdBy: currentUser.name || currentUser.username,
        createdAt: '2026-09-01T10:00:00Z',
      };

      // Pedido 2: Enviado à fábrica, aguardando faturamento / NECESSITA ANÁLISE PARA LIGAR
      const demoOrder2: RepresentativeOrder = {
        id: `rep-ord-demo-2`,
        companyId: activeCompanyId,
        orderNumber: 'REP-000124',
        code: 'REP-000124',
        indexCode: 'IND-2026-092',
        representedId: demoPrincipal.id,
        representedName: demoPrincipal.tradeName,
        clientId: 'cli-demo-2',
        clientName: 'Centro Automotivo Paulista S/A',
        clientCnpjCpf: '44.555.666/0001-11',
        orderDate: '2026-09-08',
        paymentCondition: '30/60 dias direto com a fábrica',
        carrierName: 'Expresso Mercúrio Cargas',
        freightType: 'CIF',
        items: [
          {
            id: 'it-4',
            description: 'Velas de Ignição Iridium Alta Performance',
            quantity: 50,
            tablePrice: 90,
            discountPercentage: 0,
            unitPrice: 90,
            totalPrice: 4500,
            commissionPercentage: 6,
            commissionAmount: 270,
          },
          {
            id: 'it-5',
            description: 'Filtros de Óleo e Combustível Sintético',
            quantity: 100,
            tablePrice: 100,
            discountPercentage: 0,
            unitPrice: 100,
            totalPrice: 10000,
            commissionPercentage: 6,
            commissionAmount: 600,
          },
        ],
        subtotal: 14500,
        totalDiscount: 0,
        totalOrderAmount: 14500,
        taxesAmount: 1740,
        commissionPercentage: 6,
        commissionAmount: 870,
        estimatedTotalCommission: 870,
        status: 'sent_to_factory',
        factoryOrderNumbers: [], // VAZIO: Necessita de análise para ligar!
        needsIndexingReview: true, // Destaque visual na tela!
        createdBy: currentUser.name || currentUser.username,
        createdAt: '2026-09-08T08:30:00Z',
      };

      const demoFactoryOrders: RepresentativeFactoryOrder[] = [
        {
          id: `fo-45871`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeOrderNumber: demoOrder.orderNumber,
          representedCompanyId: demoPrincipal.id,
          representedCompanyName: demoPrincipal.tradeName,
          factoryOrderNumber: '45871',
          orderDate: '2026-09-02',
          customer: demoOrder.clientName,
          customerCnpjCpf: demoOrder.clientCnpjCpf,
          totalValue: 8000,
          status: 'invoiced',
          createdAt: '2026-09-02T14:00:00Z',
        },
        {
          id: `fo-45872`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeOrderNumber: demoOrder.orderNumber,
          representedCompanyId: demoPrincipal.id,
          representedCompanyName: demoPrincipal.tradeName,
          factoryOrderNumber: '45872',
          orderDate: '2026-09-03',
          customer: demoOrder.clientName,
          customerCnpjCpf: demoOrder.clientCnpjCpf,
          totalValue: 7000,
          status: 'invoiced',
          createdAt: '2026-09-03T11:00:00Z',
        },
        {
          id: `fo-45873`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeOrderNumber: demoOrder.orderNumber,
          representedCompanyId: demoPrincipal.id,
          representedCompanyName: demoPrincipal.tradeName,
          factoryOrderNumber: '45873',
          orderDate: '2026-09-04',
          customer: demoOrder.clientName,
          customerCnpjCpf: demoOrder.clientCnpjCpf,
          totalValue: 5000,
          status: 'invoiced',
          createdAt: '2026-09-04T09:00:00Z',
        },
      ];

      const demoInvoices: FactoryInvoice[] = [
        {
          id: `inv-8921`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeFactoryOrderId: demoFactoryOrders[0].id,
          factoryOrderNumber: '45871',
          representedCompanyId: demoPrincipal.id,
          number: '8921',
          series: '1',
          issueDate: '2026-09-02',
          totalAmount: 8000,
          issuerName: demoPrincipal.corporateName,
          issuerCnpj: demoPrincipal.cnpj,
          recipientName: demoOrder.clientName,
          recipientCnpj: demoOrder.clientCnpjCpf,
          status: 'authorized',
          createdAt: '2026-09-02T16:00:00Z',
        },
        {
          id: `inv-8922`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeFactoryOrderId: demoFactoryOrders[1].id,
          factoryOrderNumber: '45872',
          representedCompanyId: demoPrincipal.id,
          number: '8922',
          series: '1',
          issueDate: '2026-09-03',
          totalAmount: 7000,
          issuerName: demoPrincipal.corporateName,
          issuerCnpj: demoPrincipal.cnpj,
          recipientName: demoOrder.clientName,
          recipientCnpj: demoOrder.clientCnpjCpf,
          status: 'authorized',
          createdAt: '2026-09-03T15:00:00Z',
        },
        {
          id: `inv-8923`,
          companyId: activeCompanyId,
          representativeOrderId: demoOrder.id,
          representativeFactoryOrderId: demoFactoryOrders[2].id,
          factoryOrderNumber: '45873',
          representedCompanyId: demoPrincipal.id,
          number: '8923',
          series: '1',
          issueDate: '2026-09-04',
          totalAmount: 5000,
          issuerName: demoPrincipal.corporateName,
          issuerCnpj: demoPrincipal.cnpj,
          recipientName: demoOrder.clientName,
          recipientCnpj: demoOrder.clientCnpjCpf,
          status: 'authorized',
          createdAt: '2026-09-04T12:00:00Z',
        },
      ];

      const demoCommission: RepresentativeCommission = {
        id: `comm-rep-000123`,
        companyId: activeCompanyId,
        representativeOrderId: demoOrder.id,
        orderNumber: demoOrder.orderNumber,
        representedCompanyId: demoPrincipal.id,
        representedCompanyName: demoPrincipal.tradeName,
        orderAmount: 20000,
        invoicedAmount: 20000,
        commissionPercentage: 5,
        commissionAmount: 1000,
        confirmedAmount: 1000,
        expectedPaymentDate: '2026-09-30',
        status: 'CONFIRMADA',
        createdAt: '2026-09-04T12:30:00Z',
      };

      setDb(prev => ({
        ...prev,
        representedCompanies: [demoPrincipal],
        representativeOrders: [demoOrder, demoOrder2],
        representativeFactoryOrders: demoFactoryOrders,
        factoryInvoices: demoInvoices,
        representativeCommissions: [demoCommission],
      }));
    }
  }, [activeCompanyId, db.representedCompanies]);

  // Listas filtradas por empresa ativa
  const principals = useMemo(() => {
    return (db.representedCompanies || []).filter(p => (p.companyId || 'comp-1') === activeCompanyId);
  }, [db.representedCompanies, activeCompanyId]);

  const orders = useMemo(() => {
    return (db.representativeOrders || []).filter(o => (o.companyId || 'comp-1') === activeCompanyId);
  }, [db.representativeOrders, activeCompanyId]);

  const factoryOrders = useMemo(() => {
    return (db.representativeFactoryOrders || []).filter(f => (f.companyId || 'comp-1') === activeCompanyId);
  }, [db.representativeFactoryOrders, activeCompanyId]);

  const factoryInvoices = useMemo(() => {
    return (db.factoryInvoices || []).filter(inv => (inv.companyId || 'comp-1') === activeCompanyId);
  }, [db.factoryInvoices, activeCompanyId]);

  const imports = useMemo(() => {
    return (db.factoryBillingImports || []).filter(i => (i.companyId || 'comp-1') === activeCompanyId);
  }, [db.factoryBillingImports, activeCompanyId]);

  const commissions = useMemo(() => {
    return (db.representativeCommissions || []).filter(c => (c.companyId || 'comp-1') === activeCompanyId);
  }, [db.representativeCommissions, activeCompanyId]);

  // Lançamentos no Contas a Receber oriundos de Comissões
  const receivables = useMemo(() => {
    return (db.accountsReceivable || []).filter(r => {
      const matchComp = (r.companyId || 'comp-1') === activeCompanyId;
      const isCommission = r.origin === 'commission' || r.originType === 'commission' || !!r.commissionId;
      return matchComp && isCommission;
    });
  }, [db.accountsReceivable, activeCompanyId]);

  // Executa ou recupera a conciliação 1:N com as ordens atuais
  const reconciliationItems = useMemo(() => {
    // Coleta todas as linhas importadas de planilhas
    const importedRows = imports.flatMap(imp => imp.rawData || []);
    const lastImport = imports[0];
    const columnMapping = lastImport?.columnMapping || {
      factoryOrderNumber: 'Pedido_Fabrica',
      representativeOrderNumber: 'Pedido_MotorDesk',
      clientName: 'Cliente',
      clientCnpj: 'CNPJ',
      invoiceNumber: 'Numero_NF',
      invoiceDate: 'Data_Faturamento',
      invoicedAmount: 'Valor_Faturado',
      commissionRate: 'Perc_Comissao',
    };

    const { results } = runRepresentativeReconciliation({
      orders,
      importedRows,
      columnMapping,
      factoryOrders,
      factoryInvoices,
      representedCompany: principals[0],
    });

    return results;
  }, [orders, imports, factoryOrders, factoryInvoices, principals]);

  // Métricas do Dashboard
  const dashboardMetrics = useMemo(() => {
    const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
    const totalInvoiced = factoryInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCommissionsConfirmed = commissions.reduce((sum, c) => sum + (c.confirmedAmount || c.commissionAmount || 0), 0);
    const totalCommissionsReceived = commissions.filter(c => c.status === 'RECEBIDA').reduce((sum, c) => sum + (c.confirmedAmount || c.commissionAmount || 0), 0);
    const totalCommissionsPending = totalCommissionsConfirmed - totalCommissionsReceived;

    return {
      totalOrdersAmount,
      totalInvoiced,
      totalCommissionsConfirmed,
      totalCommissionsReceived,
      totalCommissionsPending: Math.max(0, totalCommissionsPending),
      ordersCount: orders.length,
      principalsCount: principals.length,
      conciliatedCount: reconciliationItems.filter(r => r.status === 'CONCILIADO').length,
    };
  }, [orders, factoryInvoices, commissions, principals, reconciliationItems]);

  // Handler: Salvar ou atualizar pedido
  const handleSaveOrder = (newOrder: RepresentativeOrder) => {
    setDb(prev => {
      const existing = (prev.representativeOrders || []).findIndex(o => o.id === newOrder.id);
      let updatedOrders = [...(prev.representativeOrders || [])];
      if (existing >= 0) {
        updatedOrders[existing] = newOrder;
      } else {
        updatedOrders = [newOrder, ...updatedOrders];
      }
      return { ...prev, representativeOrders: updatedOrders };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'sale',
        'Pedido de Representação Comercial Salvo',
        `Pedido ${newOrder.orderNumber} para o cliente ${newOrder.clientName} no valor de R$ ${(newOrder.totalOrderAmount || 0).toFixed(2)}.`,
        newOrder.id,
        newOrder.clientName
      );
    }
  };

  // Handler: Atualizar status do pedido
  const handleUpdateOrderStatus = (orderId: string, newStatus: any) => {
    setDb(prev => {
      const updated = (prev.representativeOrders || []).map(o => {
        if (o.id === orderId) {
          return { ...o, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return o;
      });
      return { ...prev, representativeOrders: updated };
    });
  };

  // Handler: Adicionar Pedido da Fábrica 1:N
  const handleAddFactoryOrder = (fo: RepresentativeFactoryOrder) => {
    setDb(prev => ({
      ...prev,
      representativeFactoryOrders: [...(prev.representativeFactoryOrders || []), fo],
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'sale',
        'Pedido de Fábrica Vinculado',
        `Pedido da fábrica ${fo.factoryOrderNumber} vinculado ao pedido de representação comercial.`,
        fo.id,
        fo.factoryOrderNumber
      );
    }
  };

  // Handler: Nova Importação Concluída
  const handleImportCompleted = (
    importRecord: FactoryBillingImport,
    rawData: Record<string, any>[],
    columnMapping: Record<string, string>
  ) => {
    setDb(prev => {
      // Salva importação no banco
      const updatedImports = [importRecord, ...(prev.factoryBillingImports || [])];

      // Salva layout de colunas se solicitado
      let updatedLayouts = [...(prev.representedCompanyLayouts || [])];
      if (importRecord.representedCompanyId) {
        const existingLayoutIdx = updatedLayouts.findIndex(l => l.representedCompanyId === importRecord.representedCompanyId);
        const layoutObj = {
          id: `layout-${Date.now()}`,
          companyId: activeCompanyId,
          representedCompanyId: importRecord.representedCompanyId,
          layoutName: `Padrão ${importRecord.representedCompanyName}`,
          columnMapping,
          delimiter: ';',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (existingLayoutIdx >= 0) {
          updatedLayouts[existingLayoutIdx] = layoutObj;
        } else {
          updatedLayouts.push(layoutObj);
        }
      }

      return {
        ...prev,
        factoryBillingImports: updatedImports,
        representedCompanyLayouts: updatedLayouts,
      };
    });

    setActiveTab('reconciliation');
  };

  // Handler: Confirmar Item de Conciliação e Liberar para Contas a Receber
  const handleConfirmReconciliationItem = (item: ReconciliationResultItem) => {
    if (!item.representativeOrderId && !item.invoices.length) {
      alert('Registro não possui informações suficientes para confirmação.');
      return;
    }

    const orderObj = (db.representativeOrders || []).find(o => o.id === item.representativeOrderId);
    const targetRepresentedId = orderObj?.representedId || (orderObj as any)?.representedCompanyId;
    const represented = (db.representedCompanies || []).find(p => p.id === targetRepresentedId) || principals[0] || {
      id: 'prin-rep',
      tradeName: item.clientName || 'Fábrica Representada',
      corporateName: item.clientName || 'Fábrica Representada',
    };

    const dueDate = new Date(Date.now() + 25 * 86400000).toISOString().substring(0, 10);
    const commId = `COMM-${item.representativeOrderId || item.representativeOrderNumber || Date.now()}`;
    const recId = `CR-REP-${item.representativeOrderId || item.representativeOrderNumber || Date.now()}`;

    // 1. Cria / Atualiza Comissão
    const commissionRecord: RepresentativeCommission = {
      id: commId,
      companyId: activeCompanyId,
      representativeOrderId: item.representativeOrderId || '',
      orderNumber: item.representativeOrderNumber || 'REP',
      invoiceNumber: item.invoices.map(i => i.invoiceNumber).join(', '),
      representedCompanyId: represented?.id || '',
      representedCompanyName: represented?.tradeName || 'Representada',
      orderAmount: item.orderAmount,
      invoicedAmount: item.totalInvoicedAmount,
      commissionPercentage: item.commissionPercentage,
      commissionAmount: item.expectedCommission,
      confirmedAmount: item.confirmedCommission,
      expectedPaymentDate: dueDate,
      status: 'A_RECEBER',
      financialReceivableId: recId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Cria Título no Contas a Receber
    const newReceivable: AccountReceivable = {
      id: recId,
      companyId: activeCompanyId,
      code: `REC-${item.representativeOrderNumber || 'REP'}`,
      title: `Comissão Rep. Comercial — Pedido ${item.representativeOrderNumber || 'Avulso'} (${represented?.tradeName})`,
      description: `Comissão Rep. Comercial — Pedido ${item.representativeOrderNumber || 'Avulso'} (${represented?.tradeName})`,
      clientId: item.representativeOrderId || 'REP-CLIENT',
      clientName: represented?.tradeName || 'Fábrica Representada',
      orderId: item.representativeOrderId,
      amount: item.confirmedCommission,
      totalAmount: item.confirmedCommission,
      netAmount: item.confirmedCommission,
      paidAmount: 0,
      remainingAmount: item.confirmedCommission,
      dueDate,
      issueDate: new Date().toISOString().substring(0, 10),
      paymentMethod: 'PIX',
      status: 'pending',
      installmentsCount: 1,
      installmentNumber: 1,
      installments: [
        {
          id: `inst-${recId}-1`,
          installmentNumber: 1,
          totalInstallments: 1,
          amount: item.confirmedCommission,
          paidAmount: 0,
          dueDate,
          status: 'pending',
        },
      ],
      origin: 'commission',
      originType: 'commission',
      commissionId: commId,
      nature: 'income',
      classification: 'variable',
      periodicity: 'single',
      isRecurring: false,
      notes: `Gerado automaticamente via Conciliação Inteligente 1:N. NF-e: ${item.invoices.map(i => i.invoiceNumber).join(', ')}`,
      createdAt: new Date().toISOString(),
    };

    setDb(prev => {
      // Atualiza comissões evitando duplicidade
      const existingCommIdx = (prev.representativeCommissions || []).findIndex(
        c => c.id === commId || (item.representativeOrderId && c.representativeOrderId === item.representativeOrderId)
      );
      let updatedComms = [...(prev.representativeCommissions || [])];
      if (existingCommIdx >= 0) {
        updatedComms[existingCommIdx] = { ...updatedComms[existingCommIdx], ...commissionRecord, id: updatedComms[existingCommIdx].id };
      } else {
        updatedComms = [commissionRecord, ...updatedComms];
      }

      // Atualiza Contas a Receber com proteção estrita contra duplicidade
      const existingRecIdx = (prev.accountsReceivable || []).findIndex(
        r => r.id === recId || (commId && r.commissionId === commId) || (item.representativeOrderId && r.orderId === item.representativeOrderId && r.origin === 'commission')
      );
      let updatedReceivables = [...(prev.accountsReceivable || [])];
      if (existingRecIdx >= 0) {
        updatedReceivables[existingRecIdx] = { ...updatedReceivables[existingRecIdx], ...newReceivable, id: updatedReceivables[existingRecIdx].id };
      } else {
        updatedReceivables = [newReceivable, ...updatedReceivables];
      }

      // Atualiza status do pedido para 'commission_pending'
      const updatedOrders = (prev.representativeOrders || []).map(o => {
        if (o.id === item.representativeOrderId) {
          return { ...o, status: 'commission_pending' as const, updatedAt: new Date().toISOString() };
        }
        return o;
      });

      return {
        ...prev,
        representativeCommissions: updatedComms,
        accountsReceivable: updatedReceivables,
        representativeOrders: updatedOrders,
      };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'financial',
        'Conciliação Confirmada & Comissão Gerada',
        `Conciliação do pedido ${item.representativeOrderNumber || 'avulso'} confirmada. Gerado título a receber de R$ ${item.confirmedCommission.toFixed(2)} (${represented?.tradeName}).`,
        item.representativeOrderId || recId,
        represented?.tradeName
      );
    }

    alert(`Conciliação confirmada com sucesso!\n\nFoi gerado um lançamento de R$ ${item.confirmedCommission.toFixed(2)} no Contas a Receber (Vencimento: ${dueDate}).`);
  };

  // Handler: Dar Baixa em Título no Contas a Receber (Comissão Paga pela Fábrica)
  const handleSettleReceivable = (receivableId: string) => {
    const rec = (db.accountsReceivable || []).find(r => r.id === receivableId);
    if (!rec) return;

    const paymentDate = new Date().toISOString().substring(0, 10);
    const recAmount = rec.totalAmount || rec.amount || 0;

    // Movimentação no Fluxo de Caixa
    const newTx = {
      id: `FT-COM-${Date.now()}`,
      companyId: activeCompanyId,
      type: 'income' as const,
      category: 'Comissões de Representação',
      description: `Recebimento de Comissão - Pedido ${rec.title || rec.code}`,
      amount: recAmount,
      date: new Date().toISOString(),
      paymentMethod: rec.paymentMethod || 'PIX',
      referenceId: rec.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setDb(prev => {
      // Baixa no Contas a Receber
      const updatedReceivables = (prev.accountsReceivable || []).map(r => {
        if (r.id === receivableId) {
          return {
            ...r,
            status: 'paid' as const,
            paidAmount: recAmount,
            remainingAmount: 0,
            settlementDate: paymentDate,
          };
        }
        return r;
      });

      // Atualiza comissão vinculada para 'RECEBIDA'
      const updatedComms = (prev.representativeCommissions || []).map(c => {
        if (c.id === rec.commissionId || c.financialReceivableId === receivableId) {
          return {
            ...c,
            status: 'RECEBIDA' as const,
            paymentDate,
            actualPaymentDate: paymentDate,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      // Atualiza status do pedido para 'commission_received'
      const orderIdToMatch = rec.representativeOrderId || rec.orderId;
      const updatedOrders = (prev.representativeOrders || []).map(o => {
        if (o.id === orderIdToMatch) {
          return { ...o, status: 'commission_received' as const, commissionReceivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        }
        return o;
      });

      return {
        ...prev,
        accountsReceivable: updatedReceivables,
        representativeCommissions: updatedComms,
        representativeOrders: updatedOrders,
        financialTransactions: [newTx, ...(prev.financialTransactions || [])],
      };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'payment',
        'Comissão de Representação Recebida',
        `Baixa efetuada no título ${rec.code} no valor de R$ ${recAmount.toFixed(2)} referente à comissão da fábrica ${rec.clientName}.`,
        rec.id,
        rec.clientName
      );
    }

    alert('Título baixado e comissão marcada como RECEBIDA com sucesso!');
  };

  // Criação de Nova Representada
  const handleSavePrincipal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalForm.tradeName.trim()) {
      alert('Informe o nome da representada.');
      return;
    }

    const newP: RepresentedCompany = {
      id: `prin-${Date.now()}`,
      companyId: activeCompanyId,
      corporateName: principalForm.corporateName || principalForm.tradeName,
      tradeName: principalForm.tradeName,
      cnpj: principalForm.cnpj,
      contactPerson: principalForm.contactName,
      email: principalForm.email,
      phone: principalForm.phone,
      whatsapp: principalForm.phone,
      defaultCommissionPercentage: Number(principalForm.defaultCommissionPercentage) || 5,
      commissionPaymentRule: 'UPON_INVOICE',
      commissionPaymentTerms: `${Number(principalForm.leadTimeDays) || 30} dias`,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      representedCompanies: [...(prev.representedCompanies || []), newP],
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'client',
        'Representada Cadastrada',
        `Indústria/Representada ${newP.tradeName} (CNPJ: ${newP.cnpj || 'Não informado'}) cadastrada com comissão padrão de ${newP.defaultCommissionPercentage}%.`,
        newP.id,
        newP.tradeName
      );
    }

    setShowNewPrincipalModal(false);
    setPrincipalForm({
      tradeName: '',
      corporateName: '',
      cnpj: '',
      contactName: '',
      email: '',
      phone: '',
      defaultCommissionPercentage: 5,
      leadTimeDays: 30,
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Main Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Building2 className="w-3.5 h-3.5" /> Módulo Segmentado — Comércio & Representação Comercial
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Representação Comercial & Conciliação Inteligente 1:N
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Ciclo operacional real de ponta a ponta: emissão de pedidos de representação, desdobramentos na fábrica (1:N),
              conferência de notas fiscais, conciliação automática e liquidação financeira de comissões.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <UploadCloud className="w-4 h-4" />
              Importar Faturamento
            </button>
            <button
              onClick={() => setShowNewPrincipalModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Fábrica
            </button>
          </div>
        </div>

        {/* 9 Abas de Navegação */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-6 border-t border-slate-800/80 mt-6 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('principals')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'principals' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Representadas ({principals.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Pedidos de Representação ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('factory_invoicing')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'factory_invoicing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Pedidos Fábrica & NF-e ({factoryInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab('imports')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'imports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Importações ({imports.length})
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reconciliation' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Conciliação 1:N ({reconciliationItems.length})
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'commissions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Comissões ({commissions.length})
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'receivables' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Contas a Receber ({receivables.length})
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Relatórios
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase">Volume de Pedidos</span>
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                R$ {dashboardMetrics.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">{dashboardMetrics.ordersCount} pedidos emitidos</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Faturado Fábrica</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                R$ {dashboardMetrics.totalInvoiced.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-medium">{dashboardMetrics.conciliatedCount} pedidos conciliados</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase">Comissões a Receber</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                R$ {dashboardMetrics.totalCommissionsPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-amber-600 mt-1 font-medium">Aguardando repasse da representada</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase">Comissões Recebidas</span>
                <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-teal-700 mt-2">
                R$ {dashboardMetrics.totalCommissionsReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-teal-600 mt-1 font-medium">Baixadas no caixa com sucesso</p>
            </div>
          </div>

          {/* Atalho para Conciliação Rápida */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Conciliação Inteligente de Pedidos e Faturamento 1:N
              </h3>
              <p className="text-xs text-indigo-700 mt-1 max-w-2xl leading-relaxed">
                O MotorDesk confronta automaticamente os pedidos de representação com relatórios de expedição,
                desdobramentos parciais da fábrica e arquivos XML de NF-e sem corromper seus registros originais.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('reconciliation')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
              >
                Abrir Painel de Conciliação
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Conteúdo da Aba 2: REPRESENTADAS */}
      {activeTab === 'principals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Indústrias & Empresas Representadas</h2>
            <button
              onClick={() => setShowNewPrincipalModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              + Nova Representada
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {principals.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.tradeName}</h3>
                    <p className="text-xs text-slate-500">{p.corporateName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">CNPJ: {p.cnpj}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Comissão: {p.defaultCommissionPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400">Regra de Pagamento:</span>
                    <div className="font-semibold text-slate-800">{p.commissionPaymentRule || 'Por Faturamento'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Prazo / Termos:</span>
                    <div className="font-semibold text-slate-800">{p.commissionPaymentTerms || '30 dias'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Contato:</span>
                    <div className="font-semibold text-slate-800">{p.contactPerson || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Telefone / WhatsApp:</span>
                    <div className="font-semibold text-slate-800">{p.whatsapp || p.phone || '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: PEDIDOS DE REPRESENTAÇÃO */}
      {activeTab === 'orders' && (
        <RepresentativeOrdersView
          orders={orders}
          representedCompanies={principals}
          factoryOrders={factoryOrders}
          factoryInvoices={factoryInvoices}
          clients={db.clients || []}
          parts={db.parts || []}
          user={currentUser}
          currentCompany={db.registeredCompanies?.[0] || db.companyInfo}
          db={db}
          onSaveOrder={handleSaveOrder}
          onUpdateStatus={handleUpdateOrderStatus}
          onAddFactoryOrder={handleAddFactoryOrder}
          onNavigateToView={onNavigateToView}
          onNavigateToTab={(tab: string) => setActiveTab(tab as any)}
        />
      )}

      {/* Conteúdo da Aba 4: FATURAMENTO & PEDIDOS FÁBRICA / NF-E */}
      {activeTab === 'factory_invoicing' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">
              Pedidos Internos da Representada & Notas Fiscais Emitidas
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rastreamento de notas fiscais (NF-e) geradas pela fábrica vinculadas aos pedidos comerciais.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Número NF-e</th>
                  <th className="px-4 py-3">Pedido Fábrica</th>
                  <th className="px-4 py-3">Pedido MotorDesk</th>
                  <th className="px-4 py-3">Data Emissão</th>
                  <th className="px-4 py-3">Cliente / Destinatário</th>
                  <th className="px-4 py-3 text-right">Valor Faturado</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {factoryInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-indigo-700 font-mono">NF-e #{inv.number}</td>
                    <td className="px-4 py-3 font-mono">#{inv.factoryOrderNumber || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {orders.find(o => o.id === inv.representativeOrderId)?.orderNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{inv.issueDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{inv.recipientName}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      R$ {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {inv.status || 'Autorizada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 5: IMPORTAÇÕES DE FATURAMENTO */}
      {activeTab === 'imports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">Histórico de Planilhas de Faturamento Importadas</h2>
              <p className="text-xs text-slate-500">Planilhas XLSX, CSV e XMLs importados das representadas.</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" /> Nova Importação
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Representada</th>
                  <th className="px-4 py-3">Data Importação</th>
                  <th className="px-4 py-3 text-center">Linhas</th>
                  <th className="px-4 py-3 text-center">Formato</th>
                  <th className="px-4 py-3">Importado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {imports.map(imp => (
                  <tr key={imp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" /> {imp.fileName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{imp.representedCompanyName}</td>
                    <td className="px-4 py-3 text-slate-500">{imp.importedAt.substring(0, 10)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{imp.rowsCount}</td>
                    <td className="px-4 py-3 text-center uppercase font-mono text-[10px]">{imp.fileType}</td>
                    <td className="px-4 py-3 text-slate-600">{imp.importedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 6: CONCILIAÇÃO INTELIGENTE 1:N */}
      {activeTab === 'reconciliation' && (
        <RepresentativeReconciliationView
          reconciliationItems={reconciliationItems}
          representedCompanies={principals}
          orders={orders}
          factoryOrders={factoryOrders}
          factoryInvoices={factoryInvoices}
          user={currentUser}
          currentCompany={db.registeredCompanies?.[0] || db.companyInfo}
          db={db}
          onConfirmReconciliationItem={handleConfirmReconciliationItem}
          onImportCompleted={handleImportCompleted}
        />
      )}

      {/* Conteúdo da Aba 7: COMISSÕES */}
      {activeTab === 'commissions' && (
        <RepresentativeCommissionsTab
          commissions={commissions}
          representedCompanies={principals}
          user={currentUser}
          db={db}
          onSettleCommission={(id, val, dt) => {
            const comm = commissions.find(c => c.id === id);
            if (comm && comm.financialReceivableId) {
              handleSettleReceivable(comm.financialReceivableId);
            } else {
              setDb(prev => ({
                ...prev,
                representativeCommissions: (prev.representativeCommissions || []).map(c => {
                  if (c.id === id) {
                    return { ...c, status: 'RECEBIDA', paymentDate: dt };
                  }
                  return c;
                }),
              }));
            }
          }}
          onSendToReceivable={(id, dt) => {
            const comm = commissions.find(c => c.id === id);
            if (comm) {
              const repOrderId = comm.representativeOrderId || comm.orderId;
              const item: ReconciliationResultItem = reconciliationItems.find(r => r.representativeOrderId === repOrderId) || {
                id: comm.id,
                representativeOrderId: repOrderId,
                representativeOrderNumber: comm.orderNumber,
                clientName: comm.clientName || 'Cliente do Pedido',
                clientCnpjCpf: '',
                orderAmount: comm.orderAmount || 0,
                factoryOrders: [],
                invoices: [],
                totalInvoicedAmount: comm.invoicedAmount || comm.orderAmount || 0,
                difference: 0,
                commissionPercentage: comm.commissionPercentage || 0,
                expectedCommission: comm.commissionAmount || 0,
                confirmedCommission: comm.confirmedAmount || comm.confirmedCommissionAmount || comm.commissionAmount || 0,
                confidenceLevel: 'HIGH',
                matchCriteria: ['order_number'],
                status: 'CONCILIADO' as const,
              };
              handleConfirmReconciliationItem(item);
            }
          }}
        />
      )}

      {/* Conteúdo da Aba 8: CONTAS A RECEBER (INTEGRAÇÃO FINANCEIRA) */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Lançamentos no Contas a Receber (Comissões Integradas)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Títulos financeiros gerados automaticamente pela conciliação de pedidos e faturamento.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
              {receivables.length} títulos de comissão
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            {receivables.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Nenhum título de comissão a receber no momento. Confirme conciliações para gerar títulos automáticos.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Devedor (Representada)</th>
                    <th className="px-4 py-3">Descrição / Origem</th>
                    <th className="px-4 py-3 text-right">Valor da Comissão</th>
                    <th className="px-4 py-3 text-center">Vencimento</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivables.map(r => {
                    const rAmount = r.totalAmount || r.amount || 0;
                    const rDesc = r.title || r.description || 'Comissão de Representação';
                    const isPaid = r.status === 'paid' || (r.status as string) === 'settled';
                    const sDate = r.settlementDate || r.dueDate;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-700">{r.code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.clientName}</td>
                        <td className="px-4 py-3 text-slate-600">{rDesc}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">
                          R$ {rAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">{r.dueDate}</td>
                        <td className="px-4 py-3 text-center">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Pago em {sDate}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Aberto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isPaid && (
                            <button
                              onClick={() => handleSettleReceivable(r.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition-colors"
                            >
                              Dar Baixa (Receber)
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 9: RELATÓRIOS ANALÍTICOS */}
      {activeTab === 'reports' && (
        <RepresentativeReportsTab
          orders={orders}
          commissions={commissions}
          representedCompanies={principals}
          reconciliationItems={reconciliationItems}
          user={currentUser}
          db={db}
        />
      )}

      {/* Modal Nova Representada */}
      {showNewPrincipalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Cadastrar Empresa Representada (Fábrica)
              </h3>
              <button onClick={() => setShowNewPrincipalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrincipal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia da Fábrica *:</label>
                <input
                  type="text"
                  value={principalForm.tradeName}
                  onChange={(e) => setPrincipalForm({ ...principalForm, tradeName: e.target.value })}
                  placeholder="Ex: Fábrica ABC Autopeças"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social:</label>
                <input
                  type="text"
                  value={principalForm.corporateName}
                  onChange={(e) => setPrincipalForm({ ...principalForm, corporateName: e.target.value })}
                  placeholder="Ex: ABC Indústria de Peças Ltda"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ:</label>
                  <input
                    type="text"
                    value={principalForm.cnpj}
                    onChange={(e) => setPrincipalForm({ ...principalForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">% Comissão Padrão:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={principalForm.defaultCommissionPercentage}
                    onChange={(e) => setPrincipalForm({ ...principalForm, defaultCommissionPercentage: parseFloat(e.target.value) || 5 })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contato / Gerente:</label>
                  <input
                    type="text"
                    value={principalForm.contactName}
                    onChange={(e) => setPrincipalForm({ ...principalForm, contactName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Fone:</label>
                  <input
                    type="text"
                    value={principalForm.phone}
                    onChange={(e) => setPrincipalForm({ ...principalForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewPrincipalModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Salvar Representada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Planilhas */}
      {showImportModal && (
        <RepresentativeImportModal
          representedCompanies={principals}
          user={currentUser}
          db={db}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(imp, raw, mapping) => {
            handleImportCompleted(imp, raw, mapping);
            setShowImportModal(false);
          }}
        />
      )}

    </div>
  );
};
