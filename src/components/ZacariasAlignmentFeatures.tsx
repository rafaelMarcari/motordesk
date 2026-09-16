import React, { useState, useMemo } from 'react';

// ============================================================================
// 1. RELATÓRIO DO QUE O CLIENTE COMPROU (HISTÓRICO ANALÍTICO)
// ============================================================================
export function ClientPurchasesReportView({ db, currentUser }: { db: any; currentUser: any }) {
  const clients = db?.clients || [];
  const serviceOrders = db?.serviceOrders || [];
  const sales = db?.sales || [];
  const parts = db?.parts || [];
  const services = db?.services || [];
  const vehicles = db?.vehicles || [];

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'os' | 'sale'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Se nenhum cliente estiver selecionado, pega o primeiro por padrão
  const activeClientId = selectedClientId || (clients[0]?.id || '');
  const activeClient = useMemo(() => clients.find((c: any) => c.id === activeClientId), [clients, activeClientId]);

  // Filtra clientes para busca
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter((c: any) => 
      (c.name || '').toLowerCase().includes(term) ||
      (c.cpf || c.cpfCnpj || '').includes(term) ||
      (c.phone || '').includes(term)
    );
  }, [clients, searchTerm]);

  // Coleta todos os itens comprados pelo cliente
  const clientPurchases = useMemo(() => {
    if (!activeClientId) return [];
    const results: any[] = [];

    // 1. De Ordens de Serviço
    if (docTypeFilter === 'all' || docTypeFilter === 'os') {
      const clientSos = serviceOrders.filter((so: any) => so.clientId === activeClientId);
      clientSos.forEach((so: any) => {
        const soDate = (so.completedAt || so.createdAt || '').split('T')[0];
        if (startDate && soDate < startDate) return;
        if (endDate && soDate > endDate) return;

        const vehicle = vehicles.find((v: any) => v.id === so.vehicleId);
        const vehicleInfo = vehicle ? `${vehicle.plate || ''} - ${vehicle.brand || ''} ${vehicle.model || ''}` : (so.vehiclePlate || 'Veículo não informado');

        // Peças da OS
        (so.parts || []).forEach((p: any) => {
          results.push({
            id: `os-p-${so.id}-${p.partId || p.id || Math.random()}`,
            date: soDate,
            docCode: so.code || `OS-${so.id}`,
            docType: 'Ordem de Serviço',
            docTypeKey: 'os',
            vehicle: vehicleInfo,
            itemType: 'Peça / Produto',
            code: p.partCode || p.code || 'PEÇA',
            name: p.partName || p.name || 'Peça da OS',
            unit: p.unit || 'UN',
            quantity: Number(p.quantity) || 1,
            unitPrice: Number(p.unitPrice) || 0,
            discount: Number(p.discount) || 0,
            totalPrice: Number(p.totalPrice || (p.quantity * p.unitPrice)) || 0,
            status: so.status || 'Concluída'
          });
        });

        // Serviços da OS
        (so.services || []).forEach((s: any) => {
          results.push({
            id: `os-s-${so.id}-${s.serviceId || s.id || Math.random()}`,
            date: soDate,
            docCode: so.code || `OS-${so.id}`,
            docType: 'Ordem de Serviço',
            docTypeKey: 'os',
            vehicle: vehicleInfo,
            itemType: 'Mão de Obra / Serviço',
            code: s.serviceCode || s.code || 'SRV',
            name: s.serviceName || s.name || 'Serviço da OS',
            unit: 'HR/SRV',
            quantity: Number(s.quantity) || 1,
            unitPrice: Number(s.price || s.unitPrice) || 0,
            discount: Number(s.discount) || 0,
            totalPrice: Number(s.totalPrice || (s.quantity * (s.price || s.unitPrice))) || 0,
            status: so.status || 'Concluída'
          });
        });
      });
    }

    // 2. De Vendas Balcão (PDV)
    if (docTypeFilter === 'all' || docTypeFilter === 'sale') {
      const clientSales = sales.filter((s: any) => s.clientId === activeClientId);
      clientSales.forEach((sale: any) => {
        const saleDate = (sale.createdAt || '').split('T')[0];
        if (startDate && saleDate < startDate) return;
        if (endDate && saleDate > endDate) return;

        (sale.items || []).forEach((item: any) => {
          results.push({
            id: `sale-${sale.id}-${item.partId || item.id || Math.random()}`,
            date: saleDate,
            docCode: sale.code || `VD-${sale.id}`,
            docType: 'Venda Balcão (PDV)',
            docTypeKey: 'sale',
            vehicle: 'Venda Direta / Balcão',
            itemType: 'Peça / Mercadoria',
            code: item.partCode || item.code || 'PROD',
            name: item.partName || item.name || 'Produto Balcão',
            unit: item.unit || 'UN',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice || item.price) || 0,
            discount: Number(item.discount) || 0,
            totalPrice: Number(item.totalPrice || (item.quantity * item.unitPrice)) || 0,
            status: sale.status || 'Concluída'
          });
        });
      });
    }

    // Ordena do mais recente para o mais antigo
    return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [activeClientId, docTypeFilter, serviceOrders, sales, vehicles, startDate, endDate]);

  // Resumo de KPIs do cliente
  const kpis = useMemo(() => {
    const totalAmount = clientPurchases.reduce((acc, it) => acc + it.totalPrice, 0);
    const totalParts = clientPurchases.filter(it => it.itemType.includes('Peça') || it.itemType.includes('Produto')).reduce((acc, it) => acc + it.quantity, 0);
    const totalServices = clientPurchases.filter(it => it.itemType.includes('Serviço') || it.itemType.includes('Mão de Obra')).reduce((acc, it) => acc + it.quantity, 0);
    const uniqueDocs = new Set(clientPurchases.map(it => it.docCode)).size;
    const avgTicket = uniqueDocs > 0 ? totalAmount / uniqueDocs : 0;

    return { totalAmount, totalParts, totalServices, uniqueDocs, avgTicket };
  }, [clientPurchases]);

  const setQuickPeriod = (type: string) => {
    const now = new Date();
    if (type === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'last_30') {
      const prior = new Date();
      prior.setDate(prior.getDate() - 30);
      setStartDate(prior.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'last_90') {
      const prior = new Date();
      prior.setDate(prior.getDate() - 90);
      setStartDate(prior.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'this_year') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportCSV = () => {
    if (clientPurchases.length === 0) return;
    const headers = ['Data', 'Documento', 'Tipo Doc', 'Veículo', 'Tipo Item', 'Código', 'Descrição', 'Qtd', 'Vlr Unit (R$)', 'Total (R$)'];
    const rows = clientPurchases.map(it => [
      it.date,
      it.docCode,
      it.docType,
      `"${(it.vehicle || '').replace(/"/g, '""')}"`,
      it.itemType,
      it.code,
      `"${(it.name || '').replace(/"/g, '""')}"`,
      it.quantity,
      it.unitPrice.toFixed(2),
      it.totalPrice.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `historico_compras_${(activeClient?.name || 'cliente').replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6" id="client-purchases-report-container">
      {/* Header com Seletor do Cliente */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">🛍️</span>
              Relatório Analítico: O Que o Cliente Comprou
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualize todo o histórico de peças adquiridas, serviços realizados, valores e datas por cliente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={clientPurchases.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              📊 Exportar Planilha (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Seletor de Cliente */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Selecione o Cliente *:
            </label>
            <select
              value={activeClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.cpf || c.cpfCnpj ? `(${c.cpf || c.cpfCnpj})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo de Documento */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Origem da Compra:
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${docTypeFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('os')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${docTypeFilter === 'os' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
              >
                OS (Oficina)
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('sale')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${docTypeFilter === 'sale' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Balcão (PDV)
              </button>
            </div>
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Período da Compra:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Botões Rápidos de Período */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Atalhos:</span>
          <button type="button" onClick={() => setQuickPeriod('this_month')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer">Este Mês</button>
          <button type="button" onClick={() => setQuickPeriod('last_30')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer">Últimos 30 Dias</button>
          <button type="button" onClick={() => setQuickPeriod('last_90')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer">Últimos 90 Dias</button>
          <button type="button" onClick={() => setQuickPeriod('this_year')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer">Ano Atual</button>
          <button type="button" onClick={() => setQuickPeriod('all')} className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold transition cursor-pointer">Todo Histórico</button>
        </div>
      </div>

      {/* Cartões de Resumo do Cliente */}
      {activeClient && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Investido</span>
            <span className="text-lg font-extrabold text-indigo-700 font-mono mt-1 block">
              R$ {kpis.totalAmount.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Em peças e serviços</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Visitas / Compras</span>
            <span className="text-lg font-extrabold text-slate-800 font-display mt-1 block">
              {kpis.uniqueDocs} pedidos/OS
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Total de atendimentos</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Ticket Médio</span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono mt-1 block">
              R$ {kpis.avgTicket.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Por atendimento</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Peças Adquiridas</span>
            <span className="text-lg font-extrabold text-amber-700 font-display mt-1 block">
              {kpis.totalParts} un
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Total de unidades</span>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Serviços Feitos</span>
            <span className="text-lg font-extrabold text-blue-700 font-display mt-1 block">
              {kpis.totalServices} serviços
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Mão de obra realizada</span>
          </div>
        </div>
      )}

      {/* Tabela Analítica de Itens Comprados */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 font-display flex items-center gap-2">
            📋 Itens Comprados por {activeClient?.name || 'Cliente'} ({clientPurchases.length} itens encontrados)
          </h3>
          {activeClient?.phone && (
            <a
              href={`https://wa.me/55${activeClient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${activeClient.name}! Aqui é da oficina. Gostaríamos de agradecer a sua preferência!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition inline-flex items-center gap-1"
            >
              📲 Falar no WhatsApp
            </a>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500">
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Doc / Origem</th>
                <th className="p-3.5">Veículo Atendido</th>
                <th className="p-3.5">Tipo</th>
                <th className="p-3.5">Código / Descrição</th>
                <th className="p-3.5 text-center">Qtd</th>
                <th className="p-3.5 text-right">Vlr Unit. (R$)</th>
                <th className="p-3.5 text-right">Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {clientPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhuma compra registrada para este cliente no período selecionado.
                  </td>
                </tr>
              ) : (
                clientPurchases.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap">
                      {it.date ? it.date.split('-').reverse().join('/') : '-'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-indigo-700 block">{it.docCode}</span>
                      <span className="text-[10px] text-slate-400 block">{it.docType}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-[180px] truncate" title={it.vehicle}>
                      {it.vehicle}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        it.itemType.includes('Serviço') 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {it.itemType}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 uppercase block">{it.code}</span>
                      <span className="font-semibold text-slate-800 block">{it.name}</span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {it.quantity} <span className="text-[10px] text-slate-400 font-normal">{it.unit}</span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      R$ {it.unitPrice.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-900">
                      R$ {it.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {clientPurchases.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                  <td colSpan={5} className="p-3.5 text-right uppercase text-[11px] text-slate-500">
                    Total Geral das Compras:
                  </td>
                  <td className="p-3.5 text-center font-mono">{kpis.totalParts + kpis.totalServices} itens</td>
                  <td className="p-3.5 text-right font-mono text-[11px] text-slate-500">Ticket Médio: R$ {kpis.avgTicket.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-mono text-sm text-indigo-900 font-extrabold">
                    R$ {kpis.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. CLIENTES AUSENTES (> X DIAS SEM RETORNO À OFICINA) - RETENÇÃO & PÓS-VENDA
// ============================================================================
export function InactiveClientsReportView({ db, currentUser }: { db: any; currentUser: any }) {
  const clients = db?.clients || [];
  const serviceOrders = db?.serviceOrders || [];
  const sales = db?.sales || [];
  const vehicles = db?.vehicles || [];
  const companyInfo = db?.companyInfo || {};

  const [daysThreshold, setDaysThreshold] = useState<number>(60);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'days_desc' | 'days_asc' | 'ltv_desc'>('days_desc');

  // Mapeia inatividade de cada cliente
  const inactiveClients = useMemo(() => {
    const now = Date.now();

    const list = clients.map((c: any) => {
      // Veículos do cliente
      const clientVehicles = vehicles.filter((v: any) => v.clientId === c.id);
      const vehicleDesc = clientVehicles.length > 0 
        ? clientVehicles.map((v: any) => `${v.model || 'Carro'} (${v.plate || 'S/ Placa'})`).join(', ')
        : 'Sem veículo registrado';

      // Todas as ordens de serviço e vendas
      const cSos = serviceOrders.filter((so: any) => so.clientId === c.id);
      const cSales = sales.filter((s: any) => s.clientId === c.id);

      // Data da última visita / serviço
      let lastDateTs = 0;
      let lastServiceDesc = 'Cadastro inicial (sem OS finalizada)';

      cSos.forEach((so: any) => {
        const d = new Date(so.completedAt || so.createdAt || 0).getTime();
        if (d > lastDateTs) {
          lastDateTs = d;
          lastServiceDesc = so.title || (so.services && so.services[0]?.name) || `OS #${so.code || so.id}`;
        }
      });

      cSales.forEach((s: any) => {
        const d = new Date(s.createdAt || 0).getTime();
        if (d > lastDateTs) {
          lastDateTs = d;
          lastServiceDesc = `Venda Balcão #${s.code || s.id}`;
        }
      });

      // Se nunca teve OS ou venda, usa data de criação do cliente
      if (lastDateTs === 0 && c.createdAt) {
        lastDateTs = new Date(c.createdAt).getTime();
        lastServiceDesc = 'Cliente cadastrado no sistema';
      }

      const daysInactive = lastDateTs > 0 ? Math.floor((now - lastDateTs) / (1000 * 60 * 60 * 24)) : 999;
      const lastVisitDateFormatted = lastDateTs > 0 ? new Date(lastDateTs).toISOString().split('T')[0] : 'Nunca';

      // Total gasto histórico (LTV)
      const totalSpent = cSos.reduce((acc: number, so: any) => acc + (Number(so.totalAmount) || 0), 0) +
                         cSales.reduce((acc: number, s: any) => acc + (Number(s.totalAmount) || 0), 0);

      return {
        ...c,
        vehiclesSummary: vehicleDesc,
        firstVehicle: clientVehicles[0] || null,
        daysInactive,
        lastVisitDate: lastVisitDateFormatted,
        lastServiceDesc,
        totalSpent,
        totalVisits: cSos.length + cSales.length
      };
    });

    // Filtra pelo threshold de dias
    let filtered = list.filter((c: any) => c.daysInactive >= daysThreshold);

    // Filtra por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c: any) => 
        (c.name || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.cpf || c.cpfCnpj || '').includes(term) ||
        (c.vehiclesSummary || '').toLowerCase().includes(term)
      );
    }

    // Ordenação
    if (sortBy === 'days_desc') {
      filtered.sort((a: any, b: any) => b.daysInactive - a.daysInactive);
    } else if (sortBy === 'days_asc') {
      filtered.sort((a: any, b: any) => a.daysInactive - b.daysInactive);
    } else if (sortBy === 'ltv_desc') {
      filtered.sort((a: any, b: any) => b.totalSpent - a.totalSpent);
    }

    return filtered;
  }, [clients, serviceOrders, sales, vehicles, daysThreshold, searchTerm, sortBy]);

  // Totais
  const totalLTVPotential = inactiveClients.reduce((acc: number, c: any) => acc + c.totalSpent, 0);
  const avgInactiveDays = inactiveClients.length > 0 
    ? Math.round(inactiveClients.reduce((acc: number, c: any) => acc + c.daysInactive, 0) / inactiveClients.length)
    : 0;

  const handleExportCSV = () => {
    if (inactiveClients.length === 0) return;
    const headers = ['Cliente', 'Telefone', 'CPF/CNPJ', 'Veículo', 'Última Visita', 'Dias Sem Retorno', 'Último Serviço', 'Total Gasto (R$)'];
    const rows = inactiveClients.map((c: any) => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.phone || '',
      c.cpf || c.cpfCnpj || '',
      `"${(c.vehiclesSummary || '').replace(/"/g, '""')}"`,
      c.lastVisitDate,
      c.daysInactive,
      `"${(c.lastServiceDesc || '').replace(/"/g, '""')}"`,
      c.totalSpent.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `clientes_ausentes_mais_${daysThreshold}_dias.csv`;
    link.click();
  };

  return (
    <div className="space-y-6" id="inactive-clients-report-container">
      {/* Header & Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">🚗</span>
              Clientes Ausentes: Retenção & Pós-Venda (&gt; X Dias sem Levar o Carro)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Monitore clientes que não trazem o veículo para revisão há mais de X dias e envie convites personalizados via WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={inactiveClients.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              📊 Exportar Lista (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Seletor de Dias de Inatividade */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Dias sem Visita (Mais de X dias):
            </label>
            <div className="flex items-center gap-2">
              <select
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-950 focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value={30}>⏳ Mais de 30 dias (1 mês)</option>
                <option value={45}>⏳ Mais de 45 dias (1 mês e meio)</option>
                <option value={60}>⚠️ Mais de 60 dias (2 meses - Padrão)</option>
                <option value={90}>🚨 Mais de 90 dias (3 meses - Crítico)</option>
                <option value={120}>🚨 Mais de 120 dias (4 meses)</option>
                <option value={180}>🛑 Mais de 180 dias (6 meses)</option>
                <option value={365}>🛑 Mais de 365 dias (1 ano)</option>
              </select>
            </div>
          </div>

          {/* Busca */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Buscar Cliente, Placa ou Telefone:
            </label>
            <input
              type="text"
              placeholder="Ex: Carlos, ABC-1234, (11) 9..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Ordenação */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Ordenar Lista por:
            </label>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="days_desc">Mais tempo ausente (Maior inatividade)</option>
              <option value="days_asc">Menos tempo ausente (Recém inativos)</option>
              <option value="ltv_desc">Maior valor já investido (Melhores Clientes)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 block uppercase">Clientes Inativos Detectados</span>
          <span className="text-2xl font-extrabold text-amber-700 font-display mt-1 block">
            {inactiveClients.length} clientes
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Sem trazer o carro há mais de {daysThreshold} dias</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Tempo Médio de Ausência</span>
          <span className="text-2xl font-extrabold text-slate-800 font-display mt-1 block">
            {avgInactiveDays} dias
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Média geral dos clientes filtrados</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 block uppercase">Faturamento Histórico em Risco</span>
          <span className="text-2xl font-extrabold text-emerald-700 font-mono mt-1 block">
            R$ {totalLTVPotential.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Total já gasto por estes clientes na sua oficina</span>
        </div>
      </div>

      {/* Tabela de Clientes Ausentes com Botão de Disparo */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 font-display">
            Lista de Retenção Ativa ({inactiveClients.length} contatos prioritários)
          </h3>
          <span className="text-xs text-slate-400">
            Clique no botão do WhatsApp para abrir a mensagem de convite de revisão pré-pronta.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500">
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Veículo(s) Cadastrado(s)</th>
                <th className="p-3.5">Última Visita / Serviço</th>
                <th className="p-3.5 text-center">Dias Sem Retorno</th>
                <th className="p-3.5 text-right">LTV Histórico</th>
                <th className="p-3.5 text-right">Ação de Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inactiveClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum cliente ausente encontrado com os filtros selecionados! Excelente retenção de clientes.
                  </td>
                </tr>
              ) : (
                inactiveClients.map((c: any) => {
                  const cleanPhone = (c.phone || '').replace(/\D/g, '');
                  const vehicleName = c.firstVehicle ? `${c.firstVehicle.brand || ''} ${c.firstVehicle.model || ''} (Placa ${c.firstVehicle.plate || ''})` : 'seu veículo';
                  const compName = companyInfo.tradeName || companyInfo.name || 'Oficina Mecânica';
                  const waText = encodeURIComponent(
                    `Olá ${c.name}, tudo bem? Aqui é da ${compName}!\n\nNotamos que já faz ${c.daysInactive} dias desde a última visita do seu ${vehicleName} na nossa oficina.\n\nPara garantir a sua segurança, economia de combustível e a durabilidade do carro, preparamos uma condição especial para um check-up preventivo esta semana!\n\nPodemos agendar um horário para você dar uma passadinha aqui? Aguardo sua resposta!`
                  );

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{c.cpf || c.cpfCnpj || 'S/ CPF'}</span>
                          {c.phone && <span className="text-[10px] text-indigo-600 font-mono font-semibold">📞 {c.phone}</span>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-700 block">{c.vehiclesSummary}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 block">
                          {c.lastVisitDate ? c.lastVisitDate.split('-').reverse().join('/') : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]" title={c.lastServiceDesc}>
                          {c.lastServiceDesc}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                          c.daysInactive >= 90
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : c.daysInactive >= 60
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        }`}>
                          {c.daysInactive >= 90 ? '🛑' : c.daysInactive >= 60 ? '⚠️' : '⏳'} {c.daysInactive} dias
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                        R$ {c.totalSpent.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/55${cleanPhone}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <span>📲</span>
                            Convidar para Revisão
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sem telefone</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. CURVA ABC DE PRODUTOS (CLASSIFICAÇÃO A, B, C & RELEVÂNCIA DE GIRO)
// ============================================================================
export function CurvaAbcReportView({ db, currentUser }: { db: any; currentUser: any }) {
  const parts = db?.parts || [];
  const serviceOrders = db?.serviceOrders || [];
  const sales = db?.sales || [];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Categorias existentes
  const categories = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p: any) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [parts]);

  // Cálculo da Curva ABC
  const abcAnalysis = useMemo(() => {
    // 1. Agrega vendas e faturamento de cada peça
    const partStatsMap: Record<string, { part: any; qtySold: number; totalRevenue: number; avgPrice: number }> = {};

    parts.forEach((p: any) => {
      partStatsMap[p.id] = {
        part: p,
        qtySold: 0,
        totalRevenue: 0,
        avgPrice: p.price || 0
      };
    });

    // Peças em OS
    serviceOrders.forEach((so: any) => {
      const soDate = (so.completedAt || so.createdAt || '').split('T')[0];
      if (startDate && soDate < startDate) return;
      if (endDate && soDate > endDate) return;

      (so.parts || []).forEach((p: any) => {
        const id = p.partId || p.id;
        const qty = Number(p.quantity) || 1;
        const total = Number(p.totalPrice || (p.quantity * p.unitPrice)) || 0;

        if (partStatsMap[id]) {
          partStatsMap[id].qtySold += qty;
          partStatsMap[id].totalRevenue += total;
        } else {
          partStatsMap[id] = {
            part: { id, name: p.partName || p.name || 'Peça da OS', code: p.partCode || p.code || 'PEÇA', category: 'Geral', price: p.unitPrice || 0 },
            qtySold: qty,
            totalRevenue: total,
            avgPrice: p.unitPrice || 0
          };
        }
      });
    });

    // Peças em Vendas Balcão
    sales.forEach((s: any) => {
      const sDate = (s.createdAt || '').split('T')[0];
      if (startDate && sDate < startDate) return;
      if (endDate && sDate > endDate) return;

      (s.items || []).forEach((item: any) => {
        const id = item.partId || item.id;
        const qty = Number(item.quantity) || 1;
        const total = Number(item.totalPrice || (item.quantity * item.unitPrice)) || 0;

        if (partStatsMap[id]) {
          partStatsMap[id].qtySold += qty;
          partStatsMap[id].totalRevenue += total;
        } else {
          partStatsMap[id] = {
            part: { id, name: item.partName || item.name || 'Produto Balcão', code: item.partCode || item.code || 'PROD', category: 'Geral', price: item.unitPrice || 0 },
            qtySold: qty,
            totalRevenue: total,
            avgPrice: item.unitPrice || 0
          };
        }
      });
    });

    // 2. Ordena por faturamento decrescente
    const allItems = Object.values(partStatsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Faturamento global de todas as peças vendidas
    const totalGrossRevenue = allItems.reduce((acc, it) => acc + it.totalRevenue, 0);

    // 3. Calcula percentual e percentual acumulado para classificação A, B, C
    let runningTotal = 0;
    const itemsWithClass = allItems.map((it, idx) => {
      runningTotal += it.totalRevenue;
      const sharePct = totalGrossRevenue > 0 ? (it.totalRevenue / totalGrossRevenue) * 100 : 0;
      const cumPct = totalGrossRevenue > 0 ? (runningTotal / totalGrossRevenue) * 100 : 0;

      let abcClass: 'A' | 'B' | 'C' = 'C';
      if (cumPct <= 80 || idx === 0) {
        abcClass = 'A';
      } else if (cumPct <= 95) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }

      return {
        ...it,
        rank: idx + 1,
        sharePct,
        cumPct,
        abcClass
      };
    });

    // Totais por Classe
    const classA = itemsWithClass.filter(it => it.abcClass === 'A');
    const classB = itemsWithClass.filter(it => it.abcClass === 'B');
    const classC = itemsWithClass.filter(it => it.abcClass === 'C');

    const totalA = classA.reduce((acc, it) => acc + it.totalRevenue, 0);
    const totalB = classB.reduce((acc, it) => acc + it.totalRevenue, 0);
    const totalC = classC.reduce((acc, it) => acc + it.totalRevenue, 0);

    return {
      items: itemsWithClass,
      totalGrossRevenue,
      classA,
      classB,
      classC,
      totalA,
      totalB,
      totalC
    };
  }, [parts, serviceOrders, sales, startDate, endDate]);

  // Filtra itens para visualização na tabela
  const displayedItems = useMemo(() => {
    let list = abcAnalysis.items;

    if (filterCategory !== 'ALL') {
      list = list.filter(it => it.part.category === filterCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(it => 
        (it.part.name || '').toLowerCase().includes(term) ||
        (it.part.code || '').toLowerCase().includes(term) ||
        (it.part.category || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [abcAnalysis.items, filterCategory, searchTerm]);

  const handleExportCSV = () => {
    if (displayedItems.length === 0) return;
    const headers = ['Ranking', 'Classe ABC', 'Código', 'Descrição da Peça', 'Categoria', 'Qtd Vendida', 'Faturamento (R$)', '% Participação', '% Acumulado'];
    const rows = displayedItems.map(it => [
      it.rank,
      `Classe ${it.abcClass}`,
      it.part.code || '',
      `"${(it.part.name || '').replace(/"/g, '""')}"`,
      `"${(it.part.category || '').replace(/"/g, '""')}"`,
      it.qtySold,
      it.totalRevenue.toFixed(2),
      it.sharePct.toFixed(2) + '%',
      it.cumPct.toFixed(2) + '%'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = 'curva_abc_produtos.csv';
    link.click();
  };

  return (
    <div className="space-y-6" id="curva-abc-report-container">
      {/* Header & Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">📈</span>
              Curva ABC de Produtos & Giro de Estoque
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Classificação estratégica baseada no Princípio de Pareto: <strong>Classe A (80% da receita)</strong>, <strong>Classe B (15%)</strong> e <strong>Classe C (5%)</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={displayedItems.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              📊 Exportar Planilha (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Busca */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Buscar por Peça / Código / SKU:
            </label>
            <input
              type="text"
              placeholder="Ex: Amortecedor, Pastilha, PE-001..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Categoria:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Período de Vendas:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo das Classes A, B, C */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Receita Total de Peças</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
            R$ {abcAnalysis.totalGrossRevenue.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{abcAnalysis.items.length} itens catalogados</span>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">Classe A (Mais Críticos)</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">80% Receita</span>
          </div>
          <span className="text-xl font-extrabold text-emerald-900 font-mono mt-1 block">
            R$ {abcAnalysis.totalA.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">
            {abcAnalysis.classA.length} itens respondem por 80% do faturamento
          </span>
        </div>

        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase">Classe B (Intermediários)</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">15% Receita</span>
          </div>
          <span className="text-xl font-extrabold text-blue-900 font-mono mt-1 block">
            R$ {abcAnalysis.totalB.toFixed(2)}
          </span>
          <span className="text-[10px] text-blue-700 block mt-0.5">
            {abcAnalysis.classB.length} itens com giro moderado
          </span>
        </div>

        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase">Classe C (Cauda Longa)</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">5% Receita</span>
          </div>
          <span className="text-xl font-extrabold text-amber-900 font-mono mt-1 block">
            R$ {abcAnalysis.totalC.toFixed(2)}
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            {abcAnalysis.classC.length} itens com baixo volume de vendas
          </span>
        </div>
      </div>

      {/* Barra Visual de Proporção ABC */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Distribuição Visual do Faturamento por Classe</span>
          <span>Total: 100%</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-slate-100">
          <div 
            style={{ width: `${abcAnalysis.totalGrossRevenue > 0 ? (abcAnalysis.totalA / abcAnalysis.totalGrossRevenue) * 100 : 0}%` }}
            className="bg-emerald-500 hover:bg-emerald-600 transition"
            title={`Classe A: R$ ${abcAnalysis.totalA.toFixed(2)}`}
          />
          <div 
            style={{ width: `${abcAnalysis.totalGrossRevenue > 0 ? (abcAnalysis.totalB / abcAnalysis.totalGrossRevenue) * 100 : 0}%` }}
            className="bg-blue-500 hover:bg-blue-600 transition"
            title={`Classe B: R$ ${abcAnalysis.totalB.toFixed(2)}`}
          />
          <div 
            style={{ width: `${abcAnalysis.totalGrossRevenue > 0 ? (abcAnalysis.totalC / abcAnalysis.totalGrossRevenue) * 100 : 0}%` }}
            className="bg-amber-400 hover:bg-amber-500 transition"
            title={`Classe C: R$ ${abcAnalysis.totalC.toFixed(2)}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Classe A ({abcAnalysis.classA.length} itens)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Classe B ({abcAnalysis.classB.length} itens)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Classe C ({abcAnalysis.classC.length} itens)</span>
        </div>
      </div>

      {/* Tabela da Curva ABC */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 font-display">
            Tabela de Classificação de Produtos ({displayedItems.length} itens)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500">
                <th className="p-3.5 text-center">Rank</th>
                <th className="p-3.5">Classe</th>
                <th className="p-3.5">Peça & Descrição</th>
                <th className="p-3.5">Código / SKU</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5 text-center">Qtd Vendida</th>
                <th className="p-3.5 text-right">Faturamento (R$)</th>
                <th className="p-3.5 text-right">% Receita</th>
                <th className="p-3.5 text-right">% Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhum produto encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayedItems.map((it) => (
                  <tr key={it.part.id || it.rank} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                      #{it.rank}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-md inline-block ${
                        it.abcClass === 'A'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : it.abcClass === 'B'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        CLASSE {it.abcClass}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {it.part.name}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 uppercase">
                      {it.part.code}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {it.part.category || 'Geral'}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {it.qtySold} un
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      R$ {it.totalRevenue.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {it.sharePct.toFixed(2)}%
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-700">
                      {it.cumPct.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. AMARRAÇÃO DO CONTAS A RECEBER: MODAL DE ENVIO AO CLIENTE (WHATSAPP / E-MAIL / PIX)
// ============================================================================
export function SendReceivableToClientModal({
  receivable,
  client,
  companyInfo,
  onClose
}: {
  receivable: any;
  client: any;
  companyInfo: any;
  onClose: () => void;
}) {
  const compName = companyInfo?.tradeName || companyInfo?.name || 'Oficina Mecânica & Peças';
  const cleanPhone = (client?.phone || '').replace(/\D/g, '');
  const pixKey = companyInfo?.pixKey || companyInfo?.pixConfig?.pixKey || companyInfo?.cnpj || '';
  const clientEmail = client?.xmlNfBoletoEmail || client?.email || '';

  const [customPhone, setCustomPhone] = useState(client?.phone || '');
  const [customEmail, setCustomEmail] = useState(clientEmail);
  const [copied, setCopied] = useState(false);

  // Mensagem padronizada e profissional
  const billingMessage = useMemo(() => {
    const dueFormatted = receivable.dueDate ? receivable.dueDate.split('-').reverse().join('/') : 'A combinar';
    const amountFormatted = (receivable.remainingAmount || receivable.totalAmount || 0).toFixed(2);

    let msg = `Olá, *${client?.name || 'Cliente'}*! Tudo bem?\n`;
    msg += `Aqui é da *${compName}*.\n\n`;
    msg += `Seguem os dados do seu lançamento financeiro em aberto:\n`;
    msg += `📋 *Título / Fatura:* ${receivable.code} - ${receivable.title}\n`;
    msg += `💰 *Valor:* R$ ${amountFormatted}\n`;
    msg += `📅 *Vencimento:* ${dueFormatted}\n`;
    msg += `💳 *Condição:* ${receivable.paymentMethod || 'A combinar'}\n\n`;

    if (pixKey) {
      msg += `🔑 *Chave PIX:* ${pixKey}\n`;
      msg += `_(Favorecido: ${compName})_\n\n`;
    }

    if (receivable.boletoCode) {
      msg += `📄 *Linha Digitável do Boleto:*\n${receivable.boletoCode}\n\n`;
    }

    msg += `Agradecemos pela preferência e ficamos à disposição para qualquer dúvida!\n`;
    msg += `_Caso já tenha efetuado o pagamento, por favor desconsidere este aviso._`;

    return msg;
  }, [receivable, client, compName, pixKey]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(billingMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const p = customPhone.replace(/\D/g, '');
    const waUrl = `https://wa.me/55${p}?text=${encodeURIComponent(billingMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent(`Fatura / Lançamento ${receivable.code} - ${compName}`);
    const body = encodeURIComponent(billingMessage);
    window.location.href = `mailto:${customEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="send-receivable-modal">
      <div className="bg-white max-w-xl w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-600 text-white rounded-xl text-base">📲</span>
            <div>
              <h3 className="font-bold text-slate-900 font-display text-base">
                Enviar Título de Cobrança ao Cliente
              </h3>
              <p className="text-xs text-slate-500">
                Título: <strong>{receivable.code}</strong> • Cliente: <strong>{client?.name || receivable.clientName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Dados do Destinatário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                WhatsApp / Telefone de Destino:
              </label>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                E-mail de Destino (Fiscal / Cobrança):
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Pré-visualização da Mensagem */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Mensagem Formatada:
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
              {billingMessage}
            </div>
          </div>

          {/* Destaque PIX e Linha Digitável */}
          {pixKey && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 block uppercase">Chave PIX da Oficina</span>
                <span className="font-mono font-bold text-emerald-900 text-xs">{pixKey}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pixKey);
                  alert('Chave PIX copiada!');
                }}
                className="text-[10px] font-bold px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition cursor-pointer"
              >
                Copiar PIX
              </button>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            {copied ? '✅ Texto Copiado!' : '📋 Copiar Mensagem'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {customEmail && (
              <button
                type="button"
                onClick={handleOpenEmail}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                📧 Enviar E-mail
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📲</span>
              Enviar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. COTAÇÃO FORNECEDOR: MODAL DE LINK & RESPOSTA DE COTAÇÃO PELO FORNECEDOR
// ============================================================================
export function SupplierQuotationPortalModal({
  quotation,
  companyInfo,
  onClose,
  onSaveResponse
}: {
  quotation: any;
  companyInfo: any;
  onClose: () => void;
  onSaveResponse: (updatedQuotation: any) => void;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Link público compartilhável com o fornecedor
  const quotationLink = `${window.location.origin}/#cotacao-fornecedor?token=${quotation.id}`;

  // Itens para o fornecedor preencher
  const [items, setItems] = useState<any[]>(() => {
    return (quotation.items || []).map((it: any) => ({
      ...it,
      unitPrice: it.unitPrice || it.supplierPrice || '',
      brand: it.brand || it.supplierBrand || '',
      notes: it.notes || it.supplierNotes || ''
    }));
  });

  const [deliveryDays, setDeliveryDays] = useState<string>(quotation.deliveryDays ? String(quotation.deliveryDays) : '2');
  const [paymentTerms, setPaymentTerms] = useState<string>(quotation.paymentTerms || '28 dias no boleto faturado');
  const [supplierNotes, setSupplierNotes] = useState<string>(quotation.supplierNotes || '');

  // Atualiza preço de um item
  const handleItemChange = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    setItems(next);
  };

  // Total da cotação
  const totalQuotation = useMemo(() => {
    return items.reduce((acc, it) => acc + ((Number(it.unitPrice) || 0) * (it.quantity || 1)), 0);
  }, [items]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(quotationLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendWhatsAppToSupplier = () => {
    const compName = companyInfo?.tradeName || companyInfo?.name || 'Oficina Mecânica & Peças';
    const text = encodeURIComponent(
      `Olá! Segue o link exclusivo para preenchimento da cotação de autopeças *#${quotation.code}* da empresa *${compName}*:\n\n🔗 ${quotationLink}\n\nPor favor, preencha os preços unitários, marcas e prazo de entrega e clique em enviar para nos devolver preenchido. Muito obrigado!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/quotations/${quotation.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDays: Number(deliveryDays) || 0,
          paymentTerms,
          supplierNotes,
          items: items.map(it => ({
            id: it.id,
            partId: it.partId,
            code: it.code,
            unitPrice: Number(it.unitPrice) || 0,
            brand: it.brand,
            notes: it.notes
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Cotação preenchida e devolvida com sucesso para a empresa!');
        onSaveResponse({
          ...quotation,
          status: 'supplier_replied',
          deliveryDays: Number(deliveryDays) || 0,
          paymentTerms,
          supplierNotes,
          items: items.map(it => ({
            ...it,
            unitPrice: Number(it.unitPrice) || 0,
            supplierPrice: Number(it.unitPrice) || 0,
            supplierBrand: it.brand,
            supplierNotes: it.notes
          })),
          totalAmount: totalQuotation
        });
        onClose();
      } else {
        alert(data.error || 'Erro ao enviar resposta da cotação.');
      }
    } catch (err: any) {
      alert('Erro de conexão ao salvar resposta: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="supplier-quotation-modal">
      <div className="bg-white max-w-3xl w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-600 text-white rounded-xl text-base">📋</span>
            <div>
              <h3 className="font-bold text-slate-900 font-display text-base">
                Link e Preenchimento da Cotação #{quotation.code}
              </h3>
              <p className="text-xs text-slate-500">
                Envie o link para o fornecedor preencher e devolver os preços e prazos diretamente para o seu sistema.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Box do Link Compartilhável */}
        <div className="px-5 pt-2">
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5 uppercase">
                🔗 Link Único para o Fornecedor Preencher:
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {quotation.status === 'supplier_replied' ? '✅ Respondida pelo Fornecedor' : 'Aguardando Resposta'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={quotationLink}
                className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg font-mono text-indigo-950 font-medium select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg transition whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {copiedLink ? '✅ Copiado!' : '📋 Copiar Link'}
              </button>
              <button
                type="button"
                onClick={handleSendWhatsAppToSupplier}
                className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition whitespace-nowrap cursor-pointer shadow-2xs"
              >
                📲 WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Formulário Interativo do Fornecedor */}
        <form onSubmit={handleSubmitResponse} className="px-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-bold text-slate-800 block mb-1 text-xs">
              Simulador do Portal do Fornecedor (O fornecedor vê e preenche esta tela):
            </span>
            <p className="text-[11px] text-slate-500">
              Você pode preencher diretamente agora para simular a resposta ou salvar uma proposta que recebeu pelo telefone/WhatsApp.
            </p>
          </div>

          {/* Tabela de Itens */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="p-3">Peça Solicitada</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3">Preço Unit. (R$) *</th>
                  <th className="p-3">Marca / Linha</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((it, idx) => {
                  const subtotal = (Number(it.unitPrice) || 0) * (it.quantity || 1);
                  return (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{it.name || it.partName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">Cód: {it.code || it.partCode}</span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        {it.quantity} {it.unit || 'UN'}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0,00"
                          className="w-24 p-1.5 border border-slate-200 rounded-lg font-mono font-bold text-emerald-800 bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={it.brand}
                          onChange={(e) => handleItemChange(idx, 'brand', e.target.value)}
                          placeholder="Ex: Cofap, Bosch..."
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        R$ {subtotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td colSpan={4} className="p-3 text-right text-slate-600">
                    Total Geral da Proposta:
                  </td>
                  <td className="p-3 text-right font-mono text-sm text-emerald-700 font-extrabold">
                    R$ {totalQuotation.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Condições e Prazos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Prazo de Entrega (em dias úteis):
              </label>
              <input
                type="number"
                min="0"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Condições de Pagamento Ofertadas:
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: Boleto 28 ddl, À Vista com 5% desc"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Observações do Fornecedor:
            </label>
            <textarea
              rows={2}
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
              placeholder="Ex: Peças originais com garantia de 12 meses. Frete CIF incluso."
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2 pb-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : '✅ Salvar Resposta da Cotação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 6. AUTORIZAR CUPOM FISCAL (NFC-E MOD. 65 COM IMPRESSÃO TÉRMICA 40 COLUNAS)
// ============================================================================
export function AuthorizeFiscalReceiptModal({
  sale,
  companyInfo,
  currentUser,
  onClose,
  onAuthorized
}: {
  sale: any;
  companyInfo: any;
  currentUser: any;
  onClose: () => void;
  onAuthorized?: (doc: any) => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizedDoc, setAuthorizedDoc] = useState<any | null>(null);

  // Informações da Empresa
  const compName = companyInfo?.tradeName || companyInfo?.name || 'Oficina Mecânica & Peças';
  const compCnpj = companyInfo?.cnpj || '00.000.000/0001-91';
  const compIe = companyInfo?.ie || 'ISENTO';
  const compAddress = companyInfo?.address || 'Av. Principal, 1000 - Centro';

  // Itens da Venda
  const items = sale?.items || [{ id: '1', name: 'Item Balcão', quantity: 1, unitPrice: sale?.totalAmount || 100, totalPrice: sale?.totalAmount || 100 }];
  const totalAmount = Number(sale?.totalAmount || 0);

  const handleAuthorizeNfce = () => {
    setAuthorizing(true);
    setTimeout(() => {
      const now = new Date();
      const randomAccessKey = `352607${compCnpj.replace(/\D/g, '').padEnd(14, '0')}65001000001${Math.floor(10000000 + Math.random() * 90000000)}1`;
      const protocolNumber = `1352600${Math.floor(10000000 + Math.random() * 90000000)}`;

      const doc = {
        id: `nfce-${Date.now()}`,
        type: 'nfce_retail',
        code: `NFCE-${Math.floor(100 + Math.random() * 900)}`,
        accessKey: randomAccessKey,
        protocolNumber,
        authorizedAt: now.toLocaleString('pt-BR'),
        status: 'authorized',
        environment: 'Produção / Homologação SEFAZ',
        qrCodeUrl: `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${randomAccessKey}|2|1|1|${totalAmount.toFixed(2)}`,
        items,
        totalAmount,
        paymentMethod: sale?.paymentMethod || 'Cartão de Débito',
        companyName: compName,
        companyCnpj: compCnpj
      };

      setAuthorizedDoc(doc);
      setAuthorizing(false);
      if (onAuthorized) onAuthorized(doc);
    }, 1200);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="nfce-receipt-modal">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 animate-slide-up flex flex-col max-h-[95vh]">
        {/* Header no-print */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-sm">🧾</span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display">
                {authorizedDoc ? 'Cupom Fiscal Autorizado (NFC-e)' : 'Autorizar Cupom Fiscal'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Modelo 65 • Varejo / Balcão
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo Térmico / Autorização */}
        <div className="p-4 overflow-y-auto flex-1">
          {!authorizedDoc ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                🧾
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base font-display">
                  Pronto para Emitir Cupom Fiscal?
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Venda: <strong>{sale?.code || 'Balcão'}</strong> • Valor: <strong>R$ {totalAmount.toFixed(2)}</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Empresa:</span>
                  <span className="font-bold text-slate-800">{compName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CNPJ:</span>
                  <span className="font-bold text-slate-800">{compCnpj}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Itens:</span>
                  <span className="font-bold text-slate-800">{items.length} itens</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">Total a Pagar:</span>
                  <span className="font-bold text-emerald-700">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAuthorizeNfce}
                disabled={authorizing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authorizing ? 'Transmitindo à SEFAZ...' : '⚡ Autorizar Cupom Fiscal Agora'}
              </button>
            </div>
          ) : (
            /* Layout do Cupom Fiscal Térmico (40 Colunas / 80mm) */
            <div className="bg-amber-50/20 p-4 border border-dashed border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 space-y-3 print:border-none print:p-0">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <p className="font-bold uppercase text-xs">{compName}</p>
                <p>CNPJ: {compCnpj}</p>
                <p>IE: {compIe}</p>
                <p className="text-[10px] text-slate-500">{compAddress}</p>
                <p className="font-bold pt-1 uppercase text-[10px] text-emerald-800">
                  DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
                </p>
                <p className="text-[9px] text-slate-400">
                  Não permite aproveitamento de crédito de ICMS
                </p>
              </div>

              {/* Itens */}
              <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                  <span># CÓD | DESCRIÇÃO</span>
                  <span>QTD × VLR = TOTAL</span>
                </div>
                {items.map((it: any, i: number) => (
                  <div key={it.id || i} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[170px]">
                      {String(i + 1).padStart(2, '0')} {it.code || '001'} {it.name}
                    </span>
                    <span>
                      {it.quantity}un × {Number(it.unitPrice || 0).toFixed(2)} = <strong>{Number(it.totalPrice || (it.quantity * it.unitPrice) || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 text-xs">
                <div className="flex justify-between">
                  <span>Qtd. Total de Itens:</span>
                  <strong>{items.length}</strong>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>VALOR TOTAL R$:</span>
                  <span className="text-emerald-900">R$ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Forma de Pagamento:</span>
                  <span>{authorizedDoc.paymentMethod}</span>
                </div>
              </div>

              {/* Chave e Protocolo */}
              <div className="text-center space-y-1 text-[10px] text-slate-600">
                <p className="font-bold text-emerald-800">EMITIDA E AUTORIZADA COM SUCESSO</p>
                <p>Protocolo de Autorização: <strong>{authorizedDoc.protocolNumber}</strong></p>
                <p>Data/Hora: {authorizedDoc.authorizedAt}</p>
                <div className="pt-1">
                  <p className="text-[9px] text-slate-400 uppercase">Chave de Acesso:</p>
                  <p className="font-bold text-[9px] break-all tracking-wider text-slate-700">
                    {authorizedDoc.accessKey.replace(/(\d{4})/g, '$1 ').trim()}
                  </p>
                </div>
              </div>

              {/* QR Code Simulado */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300">
                <div className="w-24 h-24 bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold mx-auto rounded p-1">
                  [ QR-CODE SEFAZ NFC-e ]
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Consulte pela Chave de Acesso no portal da SEFAZ</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botão de impressão */}
        {authorizedDoc && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              Imprimir Cupom Fiscal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 7. WIDGET DE COMPOSIÇÃO DE PREÇOS (MARGEM & MARK-UP AUTOMÁTICO)
// ============================================================================
export function PriceMarkupCalculatorWidget({
  costPrice,
  salePrice,
  onChangeCost,
  onChangeSale,
  defaultMarginPct = 50
}: {
  costPrice: number;
  salePrice: number;
  onChangeCost: (newCost: number) => void;
  onChangeSale: (newSale: number) => void;
  defaultMarginPct?: number;
}) {
  const [markupPct, setMarkupPct] = useState<number>(defaultMarginPct);
  const [calcMode, setCalcMode] = useState<'markup' | 'margin'>('markup');

  // Atualiza preço de venda automaticamente quando o custo muda
  const handleCostChange = (c: number) => {
    onChangeCost(c);
    if (c > 0 && markupPct > 0) {
      if (calcMode === 'markup') {
        const calculated = c * (1 + markupPct / 100);
        onChangeSale(Number(calculated.toFixed(2)));
      } else {
        const calculated = c / (1 - markupPct / 100);
        onChangeSale(Number(calculated.toFixed(2)));
      }
    }
  };

  const handleMarkupChange = (pct: number) => {
    setMarkupPct(pct);
    if (costPrice > 0 && pct > 0) {
      if (calcMode === 'markup') {
        const calculated = costPrice * (1 + pct / 100);
        onChangeSale(Number(calculated.toFixed(2)));
      } else {
        const calculated = costPrice / (1 - pct / 100);
        onChangeSale(Number(calculated.toFixed(2)));
      }
    }
  };

  // Cálculos em tempo real
  const grossProfit = salePrice > costPrice ? salePrice - costPrice : 0;
  const effectiveMargin = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
  const effectiveMarkup = costPrice > 0 ? (grossProfit / costPrice) * 100 : 0;

  return (
    <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200/80 space-y-3" id="price-markup-calculator">
      <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏷️</span>
          <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
            Composição de Preços & Mark-up Automático
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCalcMode('markup')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded ${calcMode === 'markup' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}
          >
            Mark-up sobre Custo
          </button>
          <button
            type="button"
            onClick={() => setCalcMode('margin')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded ${calcMode === 'margin' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}
          >
            Margem sobre Venda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Custo */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Preço de Custo (Compra) R$:
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={costPrice || ''}
            onChange={(e) => handleCostChange(Number(e.target.value))}
            placeholder="0.00"
            className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
          />
        </div>

        {/* Mark-up % Pré-definido */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            {calcMode === 'markup' ? 'Mark-up Pré-definido (%):' : 'Margem Pré-definida (%):'}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="1"
              min="0"
              value={markupPct}
              onChange={(e) => handleMarkupChange(Number(e.target.value))}
              className="w-full text-xs p-2 border border-indigo-200 rounded-lg font-mono font-bold text-indigo-900 bg-white"
            />
            <span className="text-xs font-bold text-indigo-950">%</span>
          </div>
        </div>

        {/* Preço de Venda Unitário */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Preço de Venda Calculado R$ *:
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={salePrice || ''}
            onChange={(e) => onChangeSale(Number(e.target.value))}
            placeholder="0.00"
            className="w-full text-xs p-2 border border-indigo-300 rounded-lg font-mono font-bold text-indigo-800 bg-white"
          />
        </div>
      </div>

      {/* Indicadores Visuais da Formação de Preço */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-100 text-[11px]">
        <div className="p-2 bg-white rounded-lg border border-indigo-100">
          <span className="text-slate-400 block text-[10px]">Lucro Bruto Unitário</span>
          <span className="font-mono font-bold text-emerald-700">R$ {grossProfit.toFixed(2)}</span>
        </div>
        <div className="p-2 bg-white rounded-lg border border-indigo-100">
          <span className="text-slate-400 block text-[10px]">Margem Líquida</span>
          <span className="font-mono font-bold text-indigo-700">{effectiveMargin.toFixed(1)}%</span>
        </div>
        <div className="p-2 bg-white rounded-lg border border-indigo-100">
          <span className="text-slate-400 block text-[10px]">Mark-up Efetivo</span>
          <span className="font-mono font-bold text-blue-700">{effectiveMarkup.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
