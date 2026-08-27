import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, Search, Filter, Calendar, ArrowUpDown, Download, 
  Building2, TrendingUp, TrendingDown, DollarSign, Package, CheckCircle,
  ExternalLink, Sparkles
} from 'lucide-react';
import { AppDatabase } from '../../data/mockData';
import { exportToCsv } from '../../utils/csvExporter';

interface PurchasingReportsProps {
  db: AppDatabase;
  subType: 'purchase_history' | 'popular_purchases' | 'product_vs_supplier' | 'supplier_performance';
  startDate: string;
  endDate: string;
  searchTerm: string;
  selectedSupplierId: string;
}

export const PurchasingReports: React.FC<PurchasingReportsProps> = ({
  db,
  subType,
  startDate,
  endDate,
  searchTerm,
  selectedSupplierId,
}) => {
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const suppliers = db.suppliers || [];
  const parts = db.parts || [];
  const quotations = db.quotations || [];
  const stockMovements = db.stockMovements || [];
  const supplierPartPrices = db.supplierPartPrices || [];

  // Helper map for fast supplier lookups
  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  // Helper map for fast parts lookups
  const partsMap = useMemo(() => {
    const map = new Map<string, any>();
    parts.forEach(p => map.set(p.id, p));
    return map;
  }, [parts]);

  // --- REPORT 1: Purchase History ---
  const purchaseHistoryData = useMemo(() => {
    const entries: any[] = [];

    // From stock movements (entry/in)
    stockMovements
      .filter(m => (m.type === 'in' || (m.type as string) === 'entry'))
      .forEach(m => {
        const part = partsMap.get(m.partId);
        const pDate = (m.date || m.timestamp || '').substring(0, 10);
        if (startDate && pDate < startDate) return;
        if (endDate && pDate > endDate) return;

        const supName = m.supplierOrNFe || 'Distribuidora Padrão';
        const partName = part?.name || m.partName || 'Peça Automotiva';
        const partCode = part?.code || m.partCode || 'PECA';

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (!partName.toLowerCase().includes(term) && !partCode.toLowerCase().includes(term) && !supName.toLowerCase().includes(term)) {
            return;
          }
        }

        const qty = m.quantity || 1;
        const unitCost = m.unitCost || part?.costPrice || (part?.price ? part.price * 0.6 : 30.00);
        const total = (m as any).totalCost || (qty * unitCost);

        entries.push({
          id: m.id,
          date: m.date || m.timestamp || new Date().toISOString(),
          supplierName: supName,
          supplierId: (m as any).supplierId || 'sup-1',
          partCode,
          partName,
          quantity: qty,
          unit: part?.unit || 'UN',
          unitCost,
          totalCost: total,
          docNumber: m.sourceDocument || (m as any).invoiceNumber || `NF-${m.id.replace('mov-', '')}`,
          userName: m.userName || m.operatorName || 'Comprador Matriz'
        });
      });

    // Also include approved/converted quotations if not in stock movements yet
    quotations
      .filter(q => q.status === 'converted' || q.status === 'approved' || (q.status as string) === 'completed')
      .forEach(q => {
        const qDate = (q.createdAt || '').substring(0, 10);
        if (startDate && qDate < startDate) return;
        if (endDate && qDate > endDate) return;
        if (selectedSupplierId && q.supplierId !== selectedSupplierId) return;

        const supName = supplierMap.get(q.supplierId) || q.supplierName || 'Distribuidor Autorizado';

        (q.items || []).forEach((item, idx) => {
          const part = partsMap.get(item.partId);
          const partName = item.partName || part?.name || 'Item de Compra';
          const partCode = item.partCode || part?.code || 'COD';

          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!partName.toLowerCase().includes(term) && !partCode.toLowerCase().includes(term) && !supName.toLowerCase().includes(term)) {
              return;
            }
          }

          const qty = item.quantity || 1;
          const unitCost = item.quotedCost || item.lastPurchaseCost || item.targetCost || ((item.totalCost && qty) ? item.totalCost / qty : 45.00);
          const total = item.totalCost || (qty * unitCost);

          entries.push({
            id: `${q.id}-item-${idx}`,
            date: q.createdAt,
            supplierName: supName,
            supplierId: q.supplierId,
            partCode,
            partName,
            quantity: qty,
            unit: item.packageUnit || part?.unit || 'UN',
            unitCost,
            totalCost: total,
            docNumber: `PED-${q.code}`,
            userName: q.createdBy || 'Gestor de Compras'
          });
        });
      });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, quotations, partsMap, supplierMap, startDate, endDate, selectedSupplierId, searchTerm]);

  // --- REPORT 2: Most Utilized & Purchased Parts ---
  const popularPurchasesData = useMemo(() => {
    const statsMap: { [code: string]: any } = {};

    // Count usage from OS items and Sales items
    (db.serviceOrders || []).forEach(os => {
      (os.items || []).forEach(item => {
        if (item.type === 'part') {
          const key = item.itemId || item.name;
          if (!statsMap[key]) {
            const p = parts.find(x => x.id === item.itemId || x.name === item.name);
            statsMap[key] = {
              partId: item.itemId,
              code: p?.code || 'PECA',
              name: p?.name || item.name,
              unit: item.unit || p?.unit || 'UN',
              usedQty: 0,
              purchasedQty: 0,
              currentStock: p?.stock ?? 0,
              minStock: p?.minStock ?? 5,
              costPrice: p?.costPrice || (p?.price ? p.price * 0.6 : 35.00),
              price: p?.price || 50.00,
              lastSupplier: 'Distribuidora Principal',
              lastPurchaseDate: '2026-08-15',
              totalPurchasedValue: 0
            };
          }
          statsMap[key].usedQty += (item.quantity || 1);
        }
      });
    });

    (db.sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        const key = item.partId || item.partName || item.partCode;
        if (!statsMap[key]) {
          const p = parts.find(x => x.id === item.partId || x.code === item.partCode);
          statsMap[key] = {
            partId: item.partId,
            code: item.partCode || p?.code || 'PECA',
            name: item.partName || p?.name || 'Item',
            unit: item.unit || p?.unit || 'UN',
            usedQty: 0,
            purchasedQty: 0,
            currentStock: p?.stock ?? 0,
            minStock: p?.minStock ?? 5,
            costPrice: p?.costPrice || 35.00,
            price: p?.price || item.unitPrice || 50.00,
            lastSupplier: 'Distribuidora Principal',
            lastPurchaseDate: '2026-08-10',
            totalPurchasedValue: 0
          };
        }
        statsMap[key].usedQty += (item.quantity || 1);
      });
    });

    // Count purchase data
    purchaseHistoryData.forEach(p => {
      const key = p.partCode || p.partName;
      if (statsMap[key]) {
        statsMap[key].purchasedQty += p.quantity;
        statsMap[key].totalPurchasedValue += p.totalCost;
        statsMap[key].lastSupplier = p.supplierName;
        statsMap[key].lastPurchaseDate = p.date;
        statsMap[key].costPrice = p.unitCost;
      }
    });

    return Object.values(statsMap)
      .filter(item => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => b.usedQty - a.usedQty);
  }, [db.serviceOrders, db.sales, parts, purchaseHistoryData, searchTerm]);

  // --- REPORT 3: Product vs Supplier Comparison ---
  const productVsSupplierData = useMemo(() => {
    const list: any[] = [];

    supplierPartPrices.forEach(spp => {
      const part = partsMap.get(spp.partId);
      const sup = suppliers.find(s => s.id === spp.supplierId);
      if (!part || !sup) return;

      if (selectedSupplierId && sup.id !== selectedSupplierId) return;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!part.name.toLowerCase().includes(term) && !part.code.toLowerCase().includes(term) && !sup.name.toLowerCase().includes(term)) {
          return;
        }
      }

      const factor = spp.conversionRatio || (spp as any).packagingFactor || 1;
      const unitCost = spp.lastQuotedCost / factor;
      const baseCost = part.costPrice || (part.price * 0.6);
      const diffPercent = baseCost > 0 ? ((unitCost - baseCost) / baseCost) * 100 : 0;

      list.push({
        id: spp.id,
        partCode: part.code,
        partName: part.name,
        unit: part.unit || 'UN',
        supplierName: sup.name,
        supplierTrade: sup.tradeName,
        packageType: spp.packageUnit || (spp as any).packagingType || 'UN',
        packageFactor: factor,
        packagePrice: spp.lastQuotedCost,
        unitCost,
        currentBaseCost: baseCost,
        diffPercent,
        lastPurchaseDate: spp.lastPurchaseDate || '2026-08-10',
        paymentTerms: sup.paymentTerms || '30 dias',
        leadTimeDays: sup.notes?.includes('dias') ? 2 : 3
      });
    });

    return list.sort((a, b) => a.partName.localeCompare(b.partName));
  }, [supplierPartPrices, partsMap, suppliers, selectedSupplierId, searchTerm]);

  // --- REPORT 4: Supplier Performance ---
  const supplierPerformanceData = useMemo(() => {
    const supStats: { [id: string]: any } = {};

    suppliers.forEach(s => {
      supStats[s.id] = {
        id: s.id,
        name: s.name,
        tradeName: s.tradeName,
        cnpjCpf: s.cnpjCpf,
        phone: s.phone,
        totalPurchased: 0,
        ordersCount: 0,
        uniqueProductsCount: new Set<string>(),
        lastPurchaseDate: null as string | null,
        paymentTerms: s.paymentTerms || '30 dias',
      };
    });

    purchaseHistoryData.forEach(p => {
      const sid = p.supplierId || suppliers[0]?.id;
      if (sid && supStats[sid]) {
        supStats[sid].totalPurchased += p.totalCost;
        supStats[sid].ordersCount += 1;
        supStats[sid].uniqueProductsCount.add(p.partCode);
        if (!supStats[sid].lastPurchaseDate || new Date(p.date) > new Date(supStats[sid].lastPurchaseDate)) {
          supStats[sid].lastPurchaseDate = p.date;
        }
      }
    });

    const totalAllPurchases = Object.values(supStats).reduce((sum, s) => sum + s.totalPurchased, 0) || 1;

    return Object.values(supStats)
      .map(s => ({
        ...s,
        productsCount: s.uniqueProductsCount.size,
        avgTicket: s.ordersCount > 0 ? s.totalPurchased / s.ordersCount : 0,
        sharePercent: (s.totalPurchased / totalAllPurchases) * 100
      }))
      .filter(s => {
        if (selectedSupplierId && s.id !== selectedSupplierId) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return s.name.toLowerCase().includes(term) || (s.tradeName && s.tradeName.toLowerCase().includes(term));
        }
        return true;
      })
      .sort((a, b) => b.totalPurchased - a.totalPurchased);
  }, [suppliers, purchaseHistoryData, selectedSupplierId, searchTerm]);

  // Handler for CSV Export
  const handleExportCsv = () => {
    if (subType === 'purchase_history') {
      const headers = ['Data', 'Fornecedor', 'Código', 'Descrição do Produto', 'Qtd', 'Unidade', 'Valor Unitário (R$)', 'Valor Total (R$)', 'Documento / Pedido', 'Usuário Comprador'];
      const rows = purchaseHistoryData.map(r => [
        r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '',
        r.supplierName,
        r.partCode,
        r.partName,
        r.quantity,
        r.unit,
        r.unitCost.toFixed(2),
        r.totalCost.toFixed(2),
        r.docNumber,
        r.userName
      ]);
      exportToCsv('Relatorio_Historico_Compras', headers, rows);
    } else if (subType === 'popular_purchases') {
      const headers = ['Código', 'Produto / Peça', 'Unidade', 'Qtd Utilizada (OS/Vendas)', 'Estoque Atual', 'Estoque Mínimo', 'Custo Atual (R$)', 'Preço Venda (R$)', 'Último Fornecedor', 'Data Última Compra'];
      const rows = popularPurchasesData.map(r => [
        r.code,
        r.name,
        r.unit,
        r.usedQty,
        r.currentStock,
        r.minStock,
        r.costPrice.toFixed(2),
        r.price.toFixed(2),
        r.lastSupplier,
        r.lastPurchaseDate ? new Date(r.lastPurchaseDate).toLocaleDateString('pt-BR') : ''
      ]);
      exportToCsv('Relatorio_Pecas_Mais_Utilizadas_Compradas', headers, rows);
    } else if (subType === 'product_vs_supplier') {
      const headers = ['Código', 'Produto', 'Fornecedor', 'Embalagem', 'Fator', 'Preço Embalagem (R$)', 'Custo Unitário (R$)', 'Custo Base (R$)', 'Variação (%)', 'Condição Pagto'];
      const rows = productVsSupplierData.map(r => [
        r.partCode,
        r.partName,
        r.supplierName,
        r.packageType,
        r.packageFactor,
        r.packagePrice.toFixed(2),
        r.unitCost.toFixed(2),
        r.currentBaseCost.toFixed(2),
        `${r.diffPercent.toFixed(1)}%`,
        r.paymentTerms
      ]);
      exportToCsv('Relatorio_Produto_vs_Fornecedor', headers, rows);
    } else if (subType === 'supplier_performance') {
      const headers = ['Fornecedor', 'CNPJ/CPF', 'Telefone', 'Total Comprado (R$)', 'Qtd Pedidos', 'Ticket Médio (R$)', 'Produtos Distintos', 'Participação (%)', 'Última Compra'];
      const rows = supplierPerformanceData.map(r => [
        r.name,
        r.cnpjCpf,
        r.phone,
        r.totalPurchased.toFixed(2),
        r.ordersCount,
        r.avgTicket.toFixed(2),
        r.productsCount,
        `${r.sharePercent.toFixed(1)}%`,
        r.lastPurchaseDate ? new Date(r.lastPurchaseDate).toLocaleDateString('pt-BR') : ''
      ]);
      exportToCsv('Relatorio_Desempenho_Fornecedores', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar with CSV Download */}
      <div className="flex items-center justify-between no-print">
        <span className="text-xs text-slate-500 font-medium">
          {subType === 'purchase_history' && `${purchaseHistoryData.length} registros de compras encontrados`}
          {subType === 'popular_purchases' && `${popularPurchasesData.length} produtos analisados`}
          {subType === 'product_vs_supplier' && `${productVsSupplierData.length} cotações comparativas`}
          {subType === 'supplier_performance' && `${supplierPerformanceData.length} fornecedores monitorados`}
        </span>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Exportar CSV / Excel
        </button>
      </div>

      {/* ================= VIEW 1: PURCHASE HISTORY ================= */}
      {subType === 'purchase_history' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total em Compras no Período</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block font-mono">
                R$ {purchaseHistoryData.reduce((sum, r) => sum + r.totalCost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Entradas confirmadas e faturas</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Volume Total de Itens</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                {purchaseHistoryData.reduce((sum, r) => sum + r.quantity, 0)} unidades
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Total de peças adquiridas</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Média por Aquisição</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
                R$ {(purchaseHistoryData.length > 0 ? purchaseHistoryData.reduce((sum, r) => sum + r.totalCost, 0) / purchaseHistoryData.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Custo médio por linha de compra</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Fornecedor</th>
                    <th className="p-3.5">Código / Produto</th>
                    <th className="p-3.5 text-center">Qtd</th>
                    <th className="p-3.5 text-right">Valor Unit. (R$)</th>
                    <th className="p-3.5 text-right">Total (R$)</th>
                    <th className="p-3.5">Doc / Pedido</th>
                    <th className="p-3.5">Comprador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {purchaseHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Nenhuma compra registrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    purchaseHistoryData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                          {row.date ? new Date(row.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{row.supplierName}</td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-500 text-[11px] mr-1.5">{row.partCode}</span>
                          <span className="font-semibold text-slate-800">{row.partName}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-indigo-600">
                          {row.quantity} {row.unit}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-700">
                          R$ {row.unitCost.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          R$ {row.totalCost.toFixed(2)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px]">{row.docNumber}</td>
                        <td className="p-3.5 text-slate-600 text-[11px]">{row.userName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {purchaseHistoryData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={3} className="p-3.5 text-right uppercase text-[11px]">Subtotal Acumulado:</td>
                      <td className="p-3.5 text-center font-mono text-indigo-700">
                        {purchaseHistoryData.reduce((sum, r) => sum + r.quantity, 0)} un
                      </td>
                      <td className="p-3.5 text-right font-mono">-</td>
                      <td className="p-3.5 text-right font-mono text-emerald-800 text-sm">
                        R$ {purchaseHistoryData.reduce((sum, r) => sum + r.totalCost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: POPULAR PURCHASES & USAGE ================= */}
      {subType === 'popular_purchases' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" /> Peças e Produtos Mais Utilizados e Comprados (Curva de Giro)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5 text-center">Rank</th>
                    <th className="p-3.5">Código / Peça</th>
                    <th className="p-3.5 text-center">Qtd Utilizada</th>
                    <th className="p-3.5 text-center">Estoque Atual</th>
                    <th className="p-3.5 text-center">Estoque Mínimo</th>
                    <th className="p-3.5 text-right">Custo Atual (R$)</th>
                    <th className="p-3.5">Último Fornecedor</th>
                    <th className="p-3.5 text-center">Última Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {popularPurchasesData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center font-bold text-slate-400 font-mono">#{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-500 text-[11px]">{row.code}</span>
                          <span className="font-bold text-slate-800">{row.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {row.usedQty} {row.unit}
                      </td>
                      <td className={`p-3.5 text-center font-mono font-bold ${row.currentStock <= row.minStock ? 'text-rose-600' : 'text-slate-700'}`}>
                        {row.currentStock} {row.unit}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-500">{row.minStock} {row.unit}</td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-800">
                        R$ {row.costPrice.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-slate-700 text-[11px]">{row.lastSupplier}</td>
                      <td className="p-3.5 text-center text-slate-500 font-mono text-[11px]">
                        {row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: PRODUCT VS SUPPLIER ================= */}
      {subType === 'product_vs_supplier' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" /> Comparativo de Preços: Produto x Fornecedor
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Código / Produto</th>
                    <th className="p-3.5">Fornecedor</th>
                    <th className="p-3.5 text-center">Tipo Embalagem</th>
                    <th className="p-3.5 text-right">Preço Embalagem</th>
                    <th className="p-3.5 text-right font-bold text-indigo-700">Custo Unitário (R$)</th>
                    <th className="p-3.5 text-center">Variação vs Custo Base</th>
                    <th className="p-3.5 text-center">Condição Pagto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productVsSupplierData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhuma relação de preço e fornecedor cadastrada.
                      </td>
                    </tr>
                  ) : (
                    productVsSupplierData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <span className="font-mono text-slate-500 text-[11px] mr-1.5">{row.partCode}</span>
                          <span className="font-bold text-slate-800">{row.partName}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{row.supplierName}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {row.packageType} ({row.packageFactor} un)
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-700">
                          R$ {row.packagePrice.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-indigo-900 bg-indigo-50/40">
                          R$ {row.unitCost.toFixed(2)} / {row.unit}
                        </td>
                        <td className="p-3.5 text-center font-mono text-[11px]">
                          {row.diffPercent > 0 ? (
                            <span className="text-rose-600 font-bold">+{row.diffPercent.toFixed(1)}%</span>
                          ) : row.diffPercent < 0 ? (
                            <span className="text-emerald-600 font-bold">{row.diffPercent.toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-400">0.0%</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 text-[11px] font-mono">{row.paymentTerms}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: SUPPLIER PERFORMANCE ================= */}
      {subType === 'supplier_performance' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> Desempenho & Concentração de Compras por Fornecedor
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Fornecedor</th>
                    <th className="p-3.5">CNPJ</th>
                    <th className="p-3.5 text-center">Pedidos</th>
                    <th className="p-3.5 text-center">Produtos Fornecidos</th>
                    <th className="p-3.5 text-right">Volume Total (R$)</th>
                    <th className="p-3.5 text-right">Ticket Médio (R$)</th>
                    <th className="p-3.5 text-center">Participação (%)</th>
                    <th className="p-3.5 text-center">Última Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {supplierPerformanceData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-800">
                        {row.name}
                        {row.tradeName && <span className="block text-[10px] text-slate-400 font-normal">{row.tradeName}</span>}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 text-[11px]">{row.cnpjCpf || 'S/ CNPJ'}</td>
                      <td className="p-3.5 text-center font-bold text-indigo-600 font-mono">{row.ordersCount}</td>
                      <td className="p-3.5 text-center font-mono text-slate-700">{row.productsCount} itens</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        R$ {row.totalPurchased.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        R$ {row.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                        {row.sharePercent.toFixed(1)}%
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-mono text-[11px]">
                        {row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
