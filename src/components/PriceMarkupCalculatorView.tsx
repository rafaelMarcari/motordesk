import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calculator,
  Settings,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Percent,
  Tag,
  ArrowRight,
  ListFilter,
  Plus,
  Trash2,
  X,
  FileCode,
  Upload,
  Clock,
  History,
  Check,
  Search,
  Building2,
  Calendar,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { AppDatabase, User, Product, PendingPriceRevisionItem, PriceChangeHistoryRecord } from '../types';

export interface PriceMarkupCalculatorViewProps {
  db: AppDatabase;
  currentUser: User;
  onUpdateDb?: (updater: any) => void;
  onSaveProducts?: (products: Product[]) => void;
  onAddHistoryLog?: (entry: any) => void;
  onNavigate?: (routeId: string) => void;
  initialCost?: number;
  initialVarejo?: number;
  initialAtacado?: number;
}

export interface PriceListRule {
  id: string;
  name: string;
  markupPct: number;
  type: 'markup' | 'margin';
  minQuantity: number;
  description: string;
}

// Exemplos iniciais realistas de pendências por NF-e de entrada caso a base esteja limpa
const DEFAULT_PENDING_REVISIONS: PendingPriceRevisionItem[] = [
  {
    id: 'rev-nfe-1042-1',
    code: 'PEC-101',
    name: 'Pastilha de Freio Dianteira Cerâmica Bosch',
    ncm: '87083090',
    unit: 'JG',
    quantity: 12,
    nfeNumber: '1042',
    series: '1',
    accessKey: '35260912345678000190550010000010421234567890',
    supplierName: 'Distribuidora Automotiva Brasil S.A.',
    supplierCnpj: '12.345.678/0001-90',
    importedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    oldCostPrice: 65.00,
    newCostPrice: 82.50,
    oldSalePrice: 110.00,
    suggestedSalePrice: 139.90,
    status: 'pending',
    companyId: 'comp-1'
  },
  {
    id: 'rev-nfe-1042-2',
    code: 'PEC-204',
    name: 'Filtro de Óleo Blindado Fram PH6017A',
    ncm: '84212300',
    unit: 'UN',
    quantity: 24,
    nfeNumber: '1042',
    series: '1',
    accessKey: '35260912345678000190550010000010421234567890',
    supplierName: 'Distribuidora Automotiva Brasil S.A.',
    supplierCnpj: '12.345.678/0001-90',
    importedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    oldCostPrice: 18.50,
    newCostPrice: 24.90,
    oldSalePrice: 35.00,
    suggestedSalePrice: 44.90,
    status: 'pending',
    companyId: 'comp-1'
  },
  {
    id: 'rev-nfe-1042-3',
    code: 'LUB-5W30',
    name: 'Óleo Motor 5W30 Sintético 1L Castrol Magnatec',
    ncm: '27101932',
    unit: 'LT',
    quantity: 48,
    nfeNumber: '1042',
    series: '1',
    accessKey: '35260912345678000190550010000010421234567890',
    supplierName: 'Distribuidora Automotiva Brasil S.A.',
    supplierCnpj: '12.345.678/0001-90',
    importedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    oldCostPrice: 29.00,
    newCostPrice: 38.50,
    oldSalePrice: 48.00,
    suggestedSalePrice: 62.00,
    status: 'pending',
    companyId: 'comp-1'
  }
];

const DEFAULT_PRICE_HISTORY: PriceChangeHistoryRecord[] = [
  {
    id: 'hist-prev-1038-1',
    code: 'VEL-NGK',
    name: 'Jogo de Velas de Ignição Iridium NGK',
    nfeNumber: '1038',
    series: '1',
    supplierName: 'Mogiana Distribuidora de Autopeças Ltda',
    supplierCnpj: '98.765.432/0001-11',
    changedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    userId: 'user-admin',
    userName: 'Administrador do Sistema',
    userRole: 'admin',
    oldCostPrice: 85.00,
    newCostPrice: 105.00,
    oldSalePrice: 145.00,
    newSalePrice: 178.50,
    appliedMarkupPct: 70.0,
    reason: 'Devido à entrada da Nota Fiscal nº 1038 do fornecedor Mogiana Distribuidora de Autopeças Ltda',
    notes: 'Revisão com margem de 41.17% mantida para o varejo.',
    companyId: 'comp-1'
  }
];

export function PriceMarkupCalculatorView({
  db,
  currentUser,
  onUpdateDb,
  onSaveProducts,
  onAddHistoryLog,
  onNavigate,
  initialCost = 17.90,
  initialVarejo = 25.90,
  initialAtacado = 25.30
}: PriceMarkupCalculatorViewProps) {
  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'PENDING_QUEUE' | 'HISTORY'>('PENDING_QUEUE');

  // Fila de pendências e histórico no estado local sincronizado com db
  const pendingRevisions: PendingPriceRevisionItem[] = useMemo(() => {
    if (db.pendingPriceRevisions && Array.isArray(db.pendingPriceRevisions)) {
      return db.pendingPriceRevisions;
    }
    return DEFAULT_PENDING_REVISIONS;
  }, [db.pendingPriceRevisions]);

  const priceHistory: PriceChangeHistoryRecord[] = useMemo(() => {
    if (db.priceChangeHistory && Array.isArray(db.priceChangeHistory)) {
      return db.priceChangeHistory;
    }
    return DEFAULT_PRICE_HISTORY;
  }, [db.priceChangeHistory]);

  // Contagem de pendências ativas
  const activePendingItems = useMemo(() => {
    return pendingRevisions.filter(p => p.status === 'pending');
  }, [pendingRevisions]);

  // Item selecionado para revisão no simulador
  const [activeRevisionItem, setActiveRevisionItem] = useState<PendingPriceRevisionItem | null>(null);

  // Estados da calculadora
  const [costPrice, setCostPrice] = useState<number>(initialCost);
  const [retailPrice, setRetailPrice] = useState<number>(initialVarejo);
  const [wholesalePrice, setWholesalePrice] = useState<number>(initialAtacado);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Filtros da Fila de Pendências
  const [searchPending, setSearchPending] = useState<string>('');
  const [filterSupplier, setFilterSupplier] = useState<string>('ALL');

  // Filtros do Histórico
  const [searchHistory, setSearchHistory] = useState<string>('');
  const [historyNfeFilter, setHistoryNfeFilter] = useState<string>('ALL');

  // Modal "CONFIGURAR LISTAS DE PREÇO"
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [priceLists, setPriceLists] = useState<PriceListRule[]>([
    { id: '1', name: 'Tabela Padrão Varejo', markupPct: 44.69, type: 'margin', minQuantity: 1, description: 'Margem alvo balcão e consumidor final' },
    { id: '2', name: 'Tabela Atacado / Frotistas', markupPct: 41.34, type: 'margin', minQuantity: 5, description: 'Desconto escalonado para pedidos em volume' },
    { id: '3', name: 'Tabela Distribuidor / Concessionária', markupPct: 20.00, type: 'margin', minQuantity: 20, description: 'Preço especial para revendedores' },
    { id: '4', name: 'Tabela Promoção Sazonal', markupPct: 25.00, type: 'margin', minQuantity: 1, description: 'Campanhas promocionais temporárias' }
  ]);

  // Upload direto de XML
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingXml, setIsImportingXml] = useState<boolean>(false);
  const [xmlImportStatus, setXmlImportStatus] = useState<string>('');

  // Fórmulas de Margem de Lucro Bruta:
  // Margem (%) = ((Preço Venda - Custo) / Preço Venda) * 100
  const retailMarginPct = useMemo(() => {
    if (retailPrice <= 0) return 0;
    const margin = ((retailPrice - costPrice) / retailPrice) * 100;
    return Number(margin.toFixed(2));
  }, [costPrice, retailPrice]);

  const wholesaleMarginPct = useMemo(() => {
    if (wholesalePrice <= 0) return 0;
    const margin = ((wholesalePrice - costPrice) / wholesalePrice) * 100;
    return Number(margin.toFixed(2));
  }, [costPrice, wholesalePrice]);

  // Markup sobre o Custo:
  // Markup (%) = ((Preço Venda - Custo) / Custo) * 100
  const retailMarkupPct = useMemo(() => {
    if (costPrice <= 0) return 0;
    return Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(2));
  }, [costPrice, retailPrice]);

  const wholesaleMarkupPct = useMemo(() => {
    if (costPrice <= 0) return 0;
    return Number((((wholesalePrice - costPrice) / costPrice) * 100).toFixed(2));
  }, [costPrice, wholesalePrice]);

  // Transmitir e salvar banco para todos os navegadores conectados
  const persistAndBroadcastDb = async (updatedDb: AppDatabase, actionName: string, actionDetails: string) => {
    try {
      if (onUpdateDb) {
        onUpdateDb(() => updatedDb);
      }
      // BroadcastChannel para atualização instantânea em outros navegadores na mesma máquina
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('motorsync_channel');
        bc.postMessage({ type: 'DATABASE_UPDATED', timestamp: Date.now() });
        bc.close();
      }
      // Sincronização via POST com backend para outros computadores conectados via SSE
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDb)
      }).catch(err => console.warn('Sync POST warning:', err));

      if (onAddHistoryLog) {
        onAddHistoryLog({
          action: actionName,
          description: actionDetails,
          user: currentUser.name,
          date: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Erro ao propagar atualização de banco:', e);
    }
  };

  // Carregar dados de produto existente do catálogo da base
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    setActiveRevisionItem(null);
    const prod = (db.products || db.parts || []).find((p: any) => p.id === prodId);
    if (prod) {
      const c = Number(prod.costPrice) || 17.90;
      const r = Number(prod.salePrice || prod.price) || 25.90;
      const w = Number(prod.wholesalePrice || (r * 0.95)) || 25.30;
      setCostPrice(c);
      setRetailPrice(r);
      setWholesalePrice(w);
    }
  };

  // Carregar um item pendente da NF-e para revisão ativa no simulador
  const handleStartRevision = (item: PendingPriceRevisionItem) => {
    setActiveRevisionItem(item);
    setSelectedProductId(item.partId || '');
    setCostPrice(item.newCostPrice || 0);

    // Sugere preço de venda aplicando margem padrão de 42% ou o sugerido
    const suggestedSale = item.suggestedSalePrice || (item.newCostPrice > 0 ? Number((item.newCostPrice / 0.58).toFixed(2)) : 0);
    const suggestedWholesale = Number((suggestedSale * 0.92).toFixed(2));

    setRetailPrice(suggestedSale);
    setWholesalePrice(suggestedWholesale);
    setRevisionNotes(`Revisão de preço de compra conforme entrada da NF-e nº ${item.nfeNumber} do fornecedor ${item.supplierName}.`);
    setActiveTab('CALCULATOR');
    setSaveSuccessMsg('');
  };

  // SALVAR E BAIXAR PENDÊNCIA (O item SAI da tela e gera o registro de histórico)
  const handleSaveAndResolvePending = async () => {
    if (!activeRevisionItem) {
      handleSaveStandardProduct();
      return;
    }

    if (costPrice <= 0 || retailPrice <= 0) {
      alert('Informe valores válidos para o Custo e para o Preço de Venda Varejo.');
      return;
    }

    setIsSaving(true);
    try {
      const nfeNum = activeRevisionItem.nfeNumber;
      const suppName = activeRevisionItem.supplierName;
      const prodCode = activeRevisionItem.code;
      const prodName = activeRevisionItem.name;

      // 1. Remove o item da lista de pendências
      const updatedPendingList = pendingRevisions.filter(p => p.id !== activeRevisionItem.id);

      // 2. Cria registro histórico detalhado com o motivo explícito
      const newHistoryEntry: PriceChangeHistoryRecord = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        revisionId: activeRevisionItem.id,
        partId: activeRevisionItem.partId,
        code: prodCode,
        name: prodName,
        nfeNumber: nfeNum,
        series: activeRevisionItem.series || '1',
        accessKey: activeRevisionItem.accessKey || '',
        supplierName: suppName,
        supplierCnpj: activeRevisionItem.supplierCnpj || '',
        changedAt: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        oldCostPrice: activeRevisionItem.oldCostPrice,
        newCostPrice: costPrice,
        oldSalePrice: activeRevisionItem.oldSalePrice,
        newSalePrice: retailPrice,
        oldWholesalePrice: activeRevisionItem.oldSalePrice * 0.95,
        newWholesalePrice: wholesalePrice,
        appliedMarkupPct: retailMarkupPct,
        reason: `Devido à entrada da Nota Fiscal número ${nfeNum} do fornecedor ${suppName}`,
        notes: revisionNotes || `Revisão de margem efetuada com sucesso pelo operador @${currentUser.name}.`,
        companyId: activeRevisionItem.companyId || currentUser.companyId || 'comp-1'
      };

      const updatedHistory = [newHistoryEntry, ...priceHistory];

      // 3. Atualiza o cadastro da peça/produto no estoque (db.parts e db.products)
      const updatedParts = (db.parts || []).map((p: any) => {
        if (p.id === activeRevisionItem.partId || p.code === prodCode || p.name.toLowerCase() === prodName.toLowerCase()) {
          return {
            ...p,
            costPrice: costPrice,
            price: retailPrice,
            wholesalePrice: wholesalePrice,
            lastPriceUpdate: new Date().toISOString()
          };
        }
        return p;
      });

      const updatedProducts = (db.products || []).map((p: any) => {
        if (p.id === activeRevisionItem.partId || p.code === prodCode || p.name.toLowerCase() === prodName.toLowerCase()) {
          return {
            ...p,
            costPrice: costPrice,
            salePrice: retailPrice,
            wholesalePrice: wholesalePrice,
            lastPriceUpdate: new Date().toISOString()
          };
        }
        return p;
      });

      // 4. Monta banco consolidado atualizado
      const updatedDb: AppDatabase = {
        ...db,
        parts: updatedParts,
        products: updatedProducts,
        pendingPriceRevisions: updatedPendingList,
        priceChangeHistory: updatedHistory
      };

      // 5. Salva e propaga para todos os navegadores
      await persistAndBroadcastDb(
        updatedDb,
        'PRICE_REVISION_NFE',
        `Revisão de Preço Concluída (Entrada NF-e nº ${nfeNum}): Item "${prodName}" [${prodCode}] atualizado. Custo: R$ ${activeRevisionItem.oldCostPrice.toFixed(2)} ➔ R$ ${costPrice.toFixed(2)}, Venda: R$ ${activeRevisionItem.oldSalePrice.toFixed(2)} ➔ R$ ${retailPrice.toFixed(2)} (${retailMarginPct}% margem). Motivo: Devido à entrada da Nota Fiscal número ${nfeNum}.`
      );

      setSaveSuccessMsg(
        `Item "${prodName}" atualizado com sucesso! Saiu da fila de pendências e foi arquivado no Histórico da NF-e nº ${nfeNum}.`
      );

      // Limpa item ativo
      const nextPending = updatedPendingList.find(p => p.status === 'pending');
      setActiveRevisionItem(null);

      // Se ainda restarem pendências, podemos voltar para a fila ou sugerir o próximo
      setTimeout(() => {
        if (nextPending) {
          setActiveTab('PENDING_QUEUE');
        } else {
          setActiveTab('HISTORY');
        }
        setSaveSuccessMsg('');
      }, 2500);

    } catch (err: any) {
      console.error('Erro ao salvar revisão de preço:', err);
      alert('Erro ao salvar revisão de preço: ' + (err.message || 'Falha inesperada'));
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar produto comum sem pendência de NF
  const handleSaveStandardProduct = async () => {
    if (!selectedProductId) {
      alert('Selecione um produto do catálogo ou vincule a um item pendente da NF-e.');
      return;
    }
    const updated = (db.products || db.parts || []).map((p: any) => {
      if (p.id === selectedProductId) {
        return {
          ...p,
          costPrice: costPrice,
          salePrice: retailPrice,
          price: retailPrice,
          wholesalePrice: wholesalePrice
        };
      }
      return p;
    });

    const updatedDb: AppDatabase = {
      ...db,
      products: updated,
      parts: updated
    };

    await persistAndBroadcastDb(
      updatedDb,
      'UPDATE_PRODUCT_PRICES',
      `Preços do produto #${selectedProductId} recalculados: Custo R$ ${costPrice.toFixed(2)}, Varejo R$ ${retailPrice.toFixed(2)} (${retailMarginPct}%), Atacado R$ ${wholesalePrice.toFixed(2)}.`
    );
    alert('Preços atualizados com sucesso no cadastro do produto!');
  };

  // Upload e Parsing direto de XML de Nota Fiscal (NF-e)
  const handleXmlFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingXml(true);
    setXmlImportStatus('Lendo e interpretando arquivo XML da Nota Fiscal...');

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Validação básica se é NFe
      const nfeProc = xmlDoc.querySelector('nfeProc, NFe, infNFe');
      if (!nfeProc) {
        throw new Error('Arquivo XML inválido ou não compatível com o padrão NF-e SEFAZ.');
      }

      // Dados do cabeçalho da nota
      const nfeNumber = xmlDoc.querySelector('ide > nNF')?.textContent || '9999';
      const series = xmlDoc.querySelector('ide > serie')?.textContent || '1';
      const supplierName = xmlDoc.querySelector('emit > xNome')?.textContent || 'Fornecedor XML';
      const supplierCnpj = xmlDoc.querySelector('emit > CNPJ')?.textContent || '00.000.000/0001-00';
      const chNFe = xmlDoc.querySelector('infProt > chNFe')?.textContent || xmlDoc.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '';

      // Itens da nota
      const detElements = xmlDoc.querySelectorAll('det');
      if (detElements.length === 0) {
        throw new Error('Nenhum item de produto encontrado na tag <det> da NF-e.');
      }

      const importedItems: PendingPriceRevisionItem[] = [];

      detElements.forEach((det, idx) => {
        const prod = det.querySelector('prod');
        if (!prod) return;

        const code = prod.querySelector('cProd')?.textContent || `COD-${idx + 1}`;
        const name = prod.querySelector('xProd')?.textContent || `Item NF-e ${idx + 1}`;
        const ncm = prod.querySelector('NCM')?.textContent || '';
        const cest = prod.querySelector('CEST')?.textContent || '';
        const unit = prod.querySelector('uCom')?.textContent || 'UN';
        const quantity = parseFloat(prod.querySelector('qCom')?.textContent || '1') || 1;
        const unitPrice = parseFloat(prod.querySelector('vUnCom')?.textContent || '0') || 0;

        // Localiza se o produto já existe no estoque para comparar o custo anterior
        const existing = (db.parts || db.products || []).find((p: any) =>
          p.code === code || p.ncm === ncm || p.name?.toLowerCase() === name.toLowerCase()
        );

        const oldCost = existing ? (Number(existing.costPrice) || 0) : 0;
        const oldSale = existing ? (Number(existing.salePrice || existing.price) || Number((unitPrice * 1.45).toFixed(2))) : Number((unitPrice * 1.45).toFixed(2));
        const suggestedSale = unitPrice > 0 ? Number((unitPrice / 0.58).toFixed(2)) : 0; // Margem padrão ~42%

        importedItems.push({
          id: `rev-xml-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          partId: existing?.id,
          code,
          name,
          ncm,
          cest,
          unit,
          quantity,
          nfeNumber,
          series,
          accessKey: chNFe,
          supplierName,
          supplierCnpj,
          importedAt: new Date().toISOString(),
          oldCostPrice: oldCost,
          newCostPrice: unitPrice,
          oldSalePrice: oldSale,
          suggestedSalePrice: suggestedSale,
          status: 'pending',
          companyId: currentUser.companyId || (db.companyInfo?.id) || 'comp-1'
        });
      });

      // Adiciona os novos itens pendentes à fila
      const updatedPendingList = [...importedItems, ...pendingRevisions];

      const updatedDb: AppDatabase = {
        ...db,
        pendingPriceRevisions: updatedPendingList
      };

      await persistAndBroadcastDb(
        updatedDb,
        'XML_NFE_IMPORTED_PRICE_REVISION',
        `Importação de XML da NF-e nº ${nfeNumber} (${supplierName}): ${importedItems.length} item(ns) incluídos na Fila de Formação de Preço para revisão obrigatória.`
      );

      setXmlImportStatus(`Sucesso! ${importedItems.length} item(ns) da NF-e nº ${nfeNumber} foram adicionados à Fila de Revisão de Preço.`);
      setActiveTab('PENDING_QUEUE');

    } catch (err: any) {
      console.error('Erro na importação do XML:', err);
      alert('Falha ao processar arquivo XML: ' + (err.message || 'Arquivo corrompido ou fora do padrão SEFAZ.'));
    } finally {
      setIsImportingXml(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filtragem de pendências
  const filteredPending = useMemo(() => {
    return activePendingItems.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchPending.toLowerCase()) ||
        item.code.toLowerCase().includes(searchPending.toLowerCase()) ||
        item.nfeNumber.includes(searchPending) ||
        item.supplierName.toLowerCase().includes(searchPending.toLowerCase());

      const matchSupplier = filterSupplier === 'ALL' || item.supplierName === filterSupplier;

      return matchSearch && matchSupplier;
    });
  }, [activePendingItems, searchPending, filterSupplier]);

  // Lista de fornecedores únicos para filtro
  const uniqueSuppliers = useMemo(() => {
    const list = Array.from(new Set(activePendingItems.map(p => p.supplierName).filter(Boolean)));
    return list;
  }, [activePendingItems]);

  // Filtragem do Histórico
  const filteredHistory = useMemo(() => {
    return priceHistory.filter(h => {
      const matchSearch =
        h.name.toLowerCase().includes(searchHistory.toLowerCase()) ||
        h.code.toLowerCase().includes(searchHistory.toLowerCase()) ||
        h.nfeNumber.includes(searchHistory) ||
        h.supplierName.toLowerCase().includes(searchHistory.toLowerCase()) ||
        h.reason.toLowerCase().includes(searchHistory.toLowerCase()) ||
        h.userName.toLowerCase().includes(searchHistory.toLowerCase());

      const matchNfe = historyNfeFilter === 'ALL' || h.nfeNumber === historyNfeFilter;

      return matchSearch && matchNfe;
    });
  }, [priceHistory, searchHistory, historyNfeFilter]);

  const uniqueHistoryNfes = useMemo(() => {
    return Array.from(new Set(priceHistory.map(h => h.nfeNumber).filter(Boolean)));
  }, [priceHistory]);

  return (
    <div className="space-y-4 font-sans text-slate-800" id="view-price-markup-calculator">
      {/* CABEÇALHO DA TELA COM ABAS */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Formação de Preço, Markup & Custos de NF-e
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                Auditoria & Sincronização em Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisão obrigatória de preços e margens disparada pela entrada de notas fiscais de fornecedores.
            </p>
          </div>
        </div>

        {/* Botão de Importação Direta de XML de NF-e */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleXmlFileUpload}
            accept=".xml"
            className="hidden"
            id="xml-nfe-file-input"
          />
          <button
            type="button"
            id="btn-import-xml-nfe-price"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImportingXml}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Importar arquivo XML de NF-e para colocar itens na Fila de Formação de Preço"
          >
            <Upload className={`w-3.5 h-3.5 text-indigo-400 ${isImportingXml ? 'animate-bounce' : ''}`} />
            <span>{isImportingXml ? 'Importando XML...' : 'Importar XML da NF-e'}</span>
          </button>

          <button
            type="button"
            id="btn-configurar-listas-preco-top"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Políticas de Preço</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK STATUS DE IMPORTAÇÃO */}
      {xmlImportStatus && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{xmlImportStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setXmlImportStatus('')}
            className="text-indigo-400 hover:text-indigo-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO ENTRE ABAS */}
      <div className="flex border-b border-slate-300 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        <button
          type="button"
          id="tab-pending-queue"
          onClick={() => { setActiveTab('PENDING_QUEUE'); setSaveSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'PENDING_QUEUE'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Fila de Revisão por NF-e</span>
          {activePendingItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-3xs">
              {activePendingItems.length} pendente(s)
            </span>
          )}
        </button>

        <button
          type="button"
          id="tab-calculator"
          onClick={() => { setActiveTab('CALCULATOR'); setSaveSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'CALCULATOR'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Calculadora & Formação de Preço</span>
          {activeRevisionItem && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
              Revisando NF #{activeRevisionItem.nfeNumber}
            </span>
          )}
        </button>

        <button
          type="button"
          id="tab-history"
          onClick={() => { setActiveTab('HISTORY'); setSaveSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Alterações de Preço por NF-e</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {priceHistory.length}
          </span>
        </button>
      </div>

      {/* =================================================================================== */}
      {/* ABA 1: FILA DE REVISÃO POR NF-E (O item fica aqui até o usuário revisar e salvar)   */}
      {/* =================================================================================== */}
      {activeTab === 'PENDING_QUEUE' && (
        <div className="space-y-4">
          {/* Card de Regra de Negócio Explicada */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black uppercase tracking-wider text-[11px] block">
                Controle Obrigatório de Formação de Preço por Entrada de NF-e:
              </span>
              <p className="leading-relaxed">
                Quando uma Nota Fiscal de compra é importada, todos os itens entram nesta fila para conferência de custo e reajuste da margem de venda.
                <strong> O item só sai desta tela quando você clicar em "Revisar & Precificar" e salvar as novas margens.</strong> Ao salvar, o sistema registra permanentemente o histórico indicando o motivo: <em>"Devido à entrada da Nota Fiscal número tal"</em>.
              </p>
            </div>
          </div>

          {/* Barra de Filtros da Fila */}
          <div className="bg-white rounded-xl border border-slate-300 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por item, código, NF-e ou fornecedor..."
                  value={searchPending}
                  onChange={(e) => setSearchPending(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {uniqueSuppliers.length > 0 && (
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">Todos os Fornecedores ({uniqueSuppliers.length})</option>
                  {uniqueSuppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
              <span>{filteredPending.length} de {activePendingItems.length} item(ns) pendentes</span>
            </div>
          </div>

          {/* Lista de Itens Pendentes */}
          {filteredPending.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-300 p-12 text-center space-y-3 shadow-2xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">
                Nenhum Item Pendente de Revisão de Preço!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todos os produtos importados de Notas Fiscais anteriores já foram revisados, precificados e arquivados no histórico.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-3xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar Novo XML de NF-e para Testar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10.5px] tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-3 px-4">Item / Código</th>
                    <th className="py-3 px-3">Origem NF-e & Fornecedor</th>
                    <th className="py-3 px-3 text-center">Data Importação</th>
                    <th className="py-3 px-3 text-right">Custo Anterior</th>
                    <th className="py-3 px-3 text-right">Novo Custo (NF-e)</th>
                    <th className="py-3 px-3 text-center">Variação Custo</th>
                    <th className="py-3 px-3 text-right">Preço Venda Atual</th>
                    <th className="py-3 px-3 text-right">Venda Sugerida</th>
                    <th className="py-3 px-4 text-center">Ação Obrigatória</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPending.map(item => {
                    const costDiff = item.newCostPrice - item.oldCostPrice;
                    const costDiffPct = item.oldCostPrice > 0 ? (costDiff / item.oldCostPrice) * 100 : 0;
                    const isIncrease = costDiff > 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 text-xs">{item.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">{item.code}</span>
                            {item.ncm && <span>NCM: {item.ncm}</span>}
                            <span>• Qtd: {item.quantity} {item.unit}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>NF-e nº {item.nfeNumber}</span>
                            {item.series && <span className="text-[10px] text-slate-400">/ Série {item.series}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={item.supplierName}>
                            {item.supplierName}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center text-[11px] text-slate-600 font-mono">
                          {new Date(item.importedAt).toLocaleDateString('pt-BR')} <br />
                          <span className="text-[10px] text-slate-400">{new Date(item.importedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-500">
                          R$ {item.oldCostPrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 bg-amber-50/50">
                          R$ {item.newCostPrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {costDiff === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              0,0% (Estável)
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-extrabold ${
                              isIncrease ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isIncrease ? '▲ +' : '▼ '}{costDiffPct.toFixed(1)}%
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          R$ {item.oldSalePrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-700 bg-indigo-50/40">
                          R$ {item.suggestedSalePrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartRevision(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer shadow-3xs hover:shadow-xs"
                          >
                            <span>Revisar & Precificar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================================== */}
      {/* ABA 2: CALCULADORA & SIMULADOR DE FORMAÇÃO DE PREÇO (REVISÃO ATIVA)                 */}
      {/* =================================================================================== */}
      {activeTab === 'CALCULATOR' && (
        <div className="space-y-4">
          {/* BANNER DE REVISÃO ATIVA DE NF-E */}
          {activeRevisionItem ? (
            <div className="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-300 text-indigo-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white">
                      REVISÃO EM ANDAMENTO
                    </span>
                    <span className="text-xs font-extrabold text-indigo-900">
                      NF-e nº {activeRevisionItem.nfeNumber} ({activeRevisionItem.supplierName})
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-1">
                    {activeRevisionItem.name} — Código: <code className="font-mono text-indigo-700">{activeRevisionItem.code}</code>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Custo Anterior: R$ {activeRevisionItem.oldCostPrice.toFixed(2)} ➔ Novo Custo da NF: R$ {activeRevisionItem.newCostPrice.toFixed(2)} (Variação: {activeRevisionItem.oldCostPrice > 0 ? (((activeRevisionItem.newCostPrice - activeRevisionItem.oldCostPrice) / activeRevisionItem.oldCostPrice) * 100).toFixed(1) : '0'}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveRevisionItem(null); }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Cancelar Revisão
                </button>
              </div>
            </div>
          ) : (
            /* Seletor Rápido de Produto do Catálogo Livre */
            <div className="px-6 py-3 bg-white rounded-xl border border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <Package className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-bold text-slate-700">Simular com Produto do Estoque:</span>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 flex-1 max-w-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Cálculo Livre / Selecionar Produto --</option>
                  {(db.products || db.parts || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ` : ''}{p.name} - Custo: R$ {p.costPrice ? Number(p.costPrice).toFixed(2) : '0.00'} | Venda: R$ {p.salePrice || p.price ? Number(p.salePrice || p.price).toFixed(2) : '0.00'}
                    </option>
                  ))}
                </select>
              </div>

              {activePendingItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING_QUEUE')}
                  className="text-xs font-black text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Existem {activePendingItems.length} produto(s) pendentes da NF-e para revisar</span>
                </button>
              )}
            </div>
          )}

          {/* MENSAGEM DE SUCESSO AO SALVAR */}
          {saveSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs flex items-center gap-3 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="font-bold">{saveSuccessMsg}</div>
            </div>
          )}

          {/* CARD PRINCIPAL DE FORMAÇÃO DE PREÇO */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
                  PRECIFICAÇÃO & MARGENS
                </h2>
              </div>
              <button
                type="button"
                id="btn-configurar-listas-preco"
                onClick={() => setShowConfigModal(true)}
                className="text-xs font-black tracking-wider text-indigo-600 hover:text-indigo-800 hover:underline uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>CONFIGURAR TABELAS DE PREÇO</span>
              </button>
            </div>

            {/* Grid dos Campos de Custo e Venda */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Coluna Esquerda: CUSTO DE ENTRADA (Última compra / NF-e) */}
              <div className="md:col-span-5 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  CUSTO DE ENTRADA (NF-e / Compra)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-black text-slate-500 select-none">
                    R$
                  </span>
                  <input
                    id="input-preco-custo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 text-lg font-black font-mono text-slate-900 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-indigo-600 rounded-lg focus:outline-hidden transition shadow-3xs"
                    placeholder="17,90"
                  />
                </div>
                <div className="text-[11px] text-slate-500 font-sans flex items-center gap-1">
                  <span className="font-semibold">
                    {activeRevisionItem ? `Valor extraído da NF-e nº ${activeRevisionItem.nfeNumber}` : 'Preço de entrada da NF-e ou Custo Médio Ponderado.'}
                  </span>
                </div>

                {/* Justificativa / Observações da alteração */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Justificativa / Motivo da Troca:
                  </label>
                  <textarea
                    rows={2}
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Ex: Devido à entrada da Nota Fiscal número 1042..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Este motivo será registrado de forma perpétua na trilha de auditoria do sistema.
                  </div>
                </div>
              </div>

              {/* Coluna Direita: VENDA VAREJO E VENDA ATACADO */}
              <div className="md:col-span-7 space-y-6">
                {/* Bloco 1: VENDA VAREJO */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    PREÇO DE VENDA VAREJO (Balcão & Consumidor)
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-48">
                      <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-500 select-none">
                        R$
                      </span>
                      <input
                        id="input-preco-venda-varejo"
                        type="number"
                        step="0.01"
                        min="0"
                        value={retailPrice}
                        onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-3 py-2 text-base font-black font-mono text-slate-900 bg-white border-2 border-slate-300 focus:border-indigo-600 rounded-lg focus:outline-hidden transition shadow-3xs"
                        placeholder="25,90"
                      />
                    </div>

                    {/* Badge de Margem de Lucro Verde em Destaque */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        {retailMarginPct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} %
                      </span>
                      <div className="flex flex-col text-[10.5px] font-extrabold uppercase text-slate-600 leading-tight">
                        <span>MARGEM DE LUCRO</span>
                        <span className="text-slate-400 font-bold">(APROXIMADA NO VAREJO)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                    <span>Markup s/ Custo: <strong className="text-slate-700">{retailMarkupPct}%</strong></span>
                    <span>•</span>
                    <span>Lucro Bruto Unitário: <strong className="text-emerald-700">R$ {(retailPrice - costPrice > 0 ? retailPrice - costPrice : 0).toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* Bloco 2: VENDA ATACADO */}
                <div className="space-y-1.5 pt-4 border-t border-slate-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    PREÇO DE VENDA ATACADO (Frotistas & Revendas)
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-48">
                      <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-500 select-none">
                        R$
                      </span>
                      <input
                        id="input-preco-venda-atacado"
                        type="number"
                        step="0.01"
                        min="0"
                        value={wholesalePrice}
                        onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-3 py-2 text-base font-black font-mono text-slate-900 bg-white border-2 border-slate-300 focus:border-indigo-600 rounded-lg focus:outline-hidden transition shadow-3xs"
                        placeholder="25,30"
                      />
                    </div>

                    {/* Badge de Margem de Lucro Verde no Atacado */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        {wholesaleMarginPct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} %
                      </span>
                      <div className="flex flex-col text-[10.5px] font-extrabold uppercase text-slate-600 leading-tight">
                        <span>MARGEM DE LUCRO</span>
                        <span className="text-slate-400 font-bold">(APROXIMADA NO ATACADO)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                    <span>Markup s/ Custo: <strong className="text-slate-700">{wholesaleMarkupPct}%</strong></span>
                    <span>•</span>
                    <span>Lucro Bruto Unitário: <strong className="text-emerald-700">R$ {(wholesalePrice - costPrice > 0 ? wholesalePrice - costPrice : 0).toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulador Rápido de Margem Alvo com Atalhos */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-700">Margem Alvo Varejo:</span>
                {[20, 25, 30, 35, 40, 45, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      if (costPrice > 0) {
                        const calculated = costPrice / (1 - pct / 100);
                        setRetailPrice(Number(calculated.toFixed(2)));
                      }
                    }}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 border border-slate-300 text-indigo-700 font-bold font-mono transition cursor-pointer shadow-3xs"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-700">Margem Alvo Atacado:</span>
                {[15, 20, 25, 28, 30, 35].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      if (costPrice > 0) {
                        const calculated = costPrice / (1 - pct / 100);
                        setWholesalePrice(Number(calculated.toFixed(2)));
                      }
                    }}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 border border-slate-300 text-emerald-700 font-bold font-mono transition cursor-pointer shadow-3xs"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* RODAPÉ DO CARD: BOTÃO PRINCIPAL DE SALVAR E BAIXAR PENDÊNCIA */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {activeRevisionItem ? (
                  <span>
                    Ao salvar, o item <strong>{activeRevisionItem.name}</strong> sairá da fila de pendências e será arquivado no Histórico da NF-e nº <strong>{activeRevisionItem.nfeNumber}</strong>.
                  </span>
                ) : (
                  <span>Altere as margens e clique em Salvar para atualizar os preços no catálogo.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeRevisionItem && (
                  <button
                    type="button"
                    onClick={() => setActiveRevisionItem(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer border border-slate-300"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  id="btn-salvar-precificacao"
                  onClick={handleSaveAndResolvePending}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>
                    {isSaving
                      ? 'Salvando e Sincronizando...'
                      : activeRevisionItem
                      ? 'Salvar Alterações e Baixar Pendência da NF'
                      : 'Salvar no Cadastro do Produto'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* ABA 3: HISTÓRICO DE ALTERAÇÕES DE PREÇO POR NF-E (AUDITORIA PERPÉTUA)               */}
      {/* =================================================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Barra de Filtros do Histórico */}
          <div className="bg-white rounded-xl border border-slate-300 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar histórico por item, NF-e, fornecedor ou operador..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {uniqueHistoryNfes.length > 0 && (
                <select
                  value={historyNfeFilter}
                  onChange={(e) => setHistoryNfeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">Todas as Notas Fiscais ({uniqueHistoryNfes.length})</option>
                  {uniqueHistoryNfes.map(nfe => (
                    <option key={nfe} value={nfe}>NF-e nº {nfe}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Total de {filteredHistory.length} alteração(ões) registrada(s)
            </div>
          </div>

          {/* Tabela de Histórico */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-300 p-12 text-center space-y-2 shadow-2xs">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Nenhum registro de histórico encontrado</h3>
              <p className="text-xs text-slate-500">
                Assim que você revisar e salvar um item vindo de uma NF-e, o histórico será registrado aqui.
              </p>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10.5px] tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-3">Operador</th>
                    <th className="py-3 px-3">Produto / Código</th>
                    <th className="py-3 px-4">Motivo Obrigatório da Alteração</th>
                    <th className="py-3 px-3 text-right">Custo Anterior</th>
                    <th className="py-3 px-3 text-right">Novo Custo</th>
                    <th className="py-3 px-3 text-right">Preço Venda Anterior</th>
                    <th className="py-3 px-3 text-right">Novo Preço Venda</th>
                    <th className="py-3 px-3 text-center">Markup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredHistory.map(entry => {
                    const isIncrease = entry.newCostPrice > entry.oldCostPrice;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-[11px] text-slate-600 font-mono">
                          {new Date(entry.changedAt).toLocaleDateString('pt-BR')} <br />
                          <span className="text-[10px] text-slate-400">
                            {new Date(entry.changedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{entry.userName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{entry.userRole || 'operador'}</span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 text-xs">{entry.name}</div>
                          <div className="text-[10px] text-indigo-700 font-mono font-bold">{entry.code}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{entry.reason}</span>
                          </div>
                          {entry.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 italic">
                              "{entry.notes}"
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-500">
                          R$ {entry.oldCostPrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-amber-50/40">
                          R$ {entry.newCostPrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          R$ {entry.oldSalePrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                          R$ {entry.newSalePrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-100 text-indigo-900">
                            {entry.appliedMarkupPct ? `${entry.appliedMarkupPct.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================================== */}
      {/* MODAL CONFIGURAR LISTAS DE PREÇO                                                    */}
      {/* =================================================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Configuração de Tabelas e Listas de Preço</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Configure as políticas de markup e margem para cada canal de venda (Varejo, Atacado, Revendedores, e Campanhas Promocionais).
              </p>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-200">Nome da Tabela</th>
                      <th className="p-2 border-r border-slate-200 text-center">Tipo</th>
                      <th className="p-2 border-r border-slate-200 text-right">% Alvo</th>
                      <th className="p-2 border-r border-slate-200 text-center">Qtd Mín.</th>
                      <th className="p-2 border-r border-slate-200">Descrição / Canal</th>
                      <th className="p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {priceLists.map((pl) => (
                      <tr key={pl.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{pl.name}</td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                            {pl.type === 'margin' ? 'MARGEM' : 'MARKUP'}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                          {pl.markupPct.toFixed(2)}%
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">
                          {pl.minQuantity} un
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{pl.description}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (costPrice > 0) {
                                const newPrice = costPrice / (1 - pl.markupPct / 100);
                                if (pl.id === '1') setRetailPrice(Number(newPrice.toFixed(2)));
                                else setWholesalePrice(Number(newPrice.toFixed(2)));
                                setShowConfigModal(false);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition cursor-pointer"
                            title="Aplicar regra ao cálculo atual"
                          >
                            Aplicar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer shadow-3xs"
                >
                  Fechar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
