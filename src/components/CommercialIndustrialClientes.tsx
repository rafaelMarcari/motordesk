import React, { useState, useMemo } from 'react';
import { CommercialProps } from './CommercialIndustrialViews';

// --------------------------------------------------------------------------------------
// GESTÃO DE CLIENTES INDUSTRIAIS & CONTAS CORPORATIVAS B2B
// --------------------------------------------------------------------------------------
export function IndustrialClientesB2BView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onSelectSubTab,
  onNavigateToView
}: CommercialProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form Novo Cliente Industrial
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [ie, setIe] = useState('');
  const [segmento, setSegmento] = useState('Metalmecânica & Usinagem');
  const [cidade, setCidade] = useState('');
  const [comprador, setComprador] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [condPagto, setCondPagto] = useState('28 / 42 / 56 ddl');
  const [limiteCredito, setLimiteCredito] = useState('250000');
  const [tabelaPreco, setTabelaPreco] = useState('Tabela Fabril Especial B2B');

  const clients = useMemo(() => {
    return db.industrialB2BClients && db.industrialB2BClients.length > 0
      ? db.industrialB2BClients
      : [
          {
            id: 'cli-ind-01',
            razaoSocial: 'Agrícola & Tratores Santa Fé Ltda',
            nomeFantasia: 'Santa Fé Máquinas Agrícolas',
            cnpj: '45.123.789/0001-44',
            ie: '284.912.450.110',
            segmento: 'Maquinário Agrícola & Tratores',
            cidade: 'Ribeirão Preto - SP',
            compradorPrincipal: 'Carlos Eduardo (Gerente de Compras)',
            telefone: '(19) 3881-4400',
            email: 'carlos.compras@agrisantafe.com.br',
            condicaoPagamento: '28 / 42 / 56 ddl',
            limiteCredito: 350000,
            limiteUtilizado: 124080,
            status: 'ATIVO',
            tabelaPreco: 'Tabela Fabril Especial B2B',
            totalFaturadoAno: 640000,
            activeOrdersCount: 2
          },
          {
            id: 'cli-ind-02',
            razaoSocial: 'Frigorífico Aurora Sul S/A',
            nomeFantasia: 'Aurora Alimentos Industrial',
            cnpj: '04.555.221/0001-09',
            ie: '902.114.773.001',
            segmento: 'Alimentício & Frigorífico Inox',
            cidade: 'Chapecó - SC',
            compradorPrincipal: 'Almir Zandoná (Suprimentos)',
            telefone: '(49) 3321-7000',
            email: 'almir.suprimentos@aurorasul.com.br',
            condicaoPagamento: 'Sinal 40% + 60% a 28 ddl',
            limiteCredito: 500000,
            limiteUtilizado: 142080,
            status: 'ATIVO',
            tabelaPreco: 'Linha Inox Sanitária 304/316L',
            totalFaturadoAno: 890000,
            activeOrdersCount: 1
          },
          {
            id: 'cli-ind-03',
            razaoSocial: 'Metalúrgica Precision Parts Ltda',
            nomeFantasia: 'Precision Parts Usinagem',
            cnpj: '22.333.444/0001-55',
            ie: '114.882.331.119',
            segmento: 'Autopeças & Metalmecânica',
            cidade: 'São Bernardo do Campo - SP',
            compradorPrincipal: 'Renato Diniz (Coordenador de Compras)',
            telefone: '(11) 4344-2200',
            email: 'renato.diniz@precisionparts.com.br',
            condicaoPagamento: '30 / 60 dias após aceite CQ',
            limiteCredito: 250000,
            limiteUtilizado: 96000,
            status: 'ATIVO',
            tabelaPreco: 'Tabela Montadoras e Sistemistas',
            totalFaturadoAno: 420000,
            activeOrdersCount: 1
          },
          {
            id: 'cli-ind-04',
            razaoSocial: 'WEG Motores & Acionamentos S/A',
            nomeFantasia: 'WEG Fábrica VII',
            cnpj: '84.429.695/0001-11',
            ie: '250.123.889.004',
            segmento: 'Motores & Equipamentos Industriais',
            cidade: 'Jaraguá do Sul - SC',
            compradorPrincipal: 'Guilherme Schmitt (Eng. Suprimentos)',
            telefone: '(47) 3276-4000',
            email: 'guilherme.schmitt@weg.net',
            condicaoPagamento: '28 / 42 / 56 ddl',
            limiteCredito: 800000,
            limiteUtilizado: 180400,
            status: 'ATIVO',
            tabelaPreco: 'Contrato Anual Fornecimento Homologado',
            totalFaturadoAno: 1450000,
            activeOrdersCount: 1
          }
        ];
  }, [db.industrialB2BClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c: any) => {
      const matchSearch =
        c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm) ||
        c.compradorPrincipal.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSeg = selectedSegment === 'ALL' || c.segmento.includes(selectedSegment);
      return matchSearch && matchSeg;
    });
  }, [clients, searchTerm, selectedSegment]);

  // Métricas
  const totalCreditoConcedido = useMemo(() => {
    return clients.reduce((acc: number, c: any) => acc + (Number(c.limiteCredito) || 0), 0);
  }, [clients]);

  const totalCreditoUtilizado = useMemo(() => {
    return clients.reduce((acc: number, c: any) => acc + (Number(c.limiteUtilizado) || 0), 0);
  }, [clients]);

  const totalFaturadoGeral = useMemo(() => {
    return clients.reduce((acc: number, c: any) => acc + (Number(c.totalFaturadoAno) || 0), 0);
  }, [clients]);

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial || !cnpj) {
      alert('Preencha a Razão Social e o CNPJ do cliente industrial.');
      return;
    }

    const newCli = {
      id: `cli-ind-${Date.now()}`,
      razaoSocial,
      nomeFantasia: nomeFantasia || razaoSocial,
      cnpj,
      ie: ie || 'ISENTO',
      segmento,
      cidade: cidade || 'São Paulo - SP',
      compradorPrincipal: comprador || 'Depto. de Compras',
      telefone,
      email,
      condicaoPagamento: condPagto,
      limiteCredito: Number(limiteCredito) || 100000,
      limiteUtilizado: 0,
      status: 'ATIVO',
      tabelaPreco,
      totalFaturadoAno: 0,
      activeOrdersCount: 0
    };

    onUpdateDb((prev: any) => {
      const current = prev.industrialB2BClients || clients;
      return {
        ...prev,
        industrialB2BClients: [newCli, ...current]
      };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'CLIENTE_B2B_CADASTRADO',
        description: `Novo cliente industrial homologado: ${razaoSocial} (CNPJ: ${cnpj})`,
        module: 'Comercial'
      });
    }

    setShowNewModal(false);
    // Reset form
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setIe('');
    setCidade('');
    setComprador('');
    setTelefone('');
    setEmail('');
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO COM MÉTRICAS ALIMENTADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contas Homologadas</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              B2B Ativos
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{clients.length} Empresas</div>
          <div className="text-xs text-slate-500 mt-1">100% com análise cadastral e IE regular</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Limite Concedido</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Crédito Fabril
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            R$ {totalCreditoConcedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Utilizado: R$ {totalCreditoUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (
            {((totalCreditoUtilizado / (totalCreditoConcedido || 1)) * 100).toFixed(1)}%)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento Acumulado</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              Ano Vigente
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            R$ {totalFaturadoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Ticket médio por conta: R$ {(totalFaturadoGeral / (clients.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações Comerciais</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Atalhos
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> Cadastrar Cliente B2B
            </button>
            <button
              onClick={() => {
                if (onNavigateToView) onNavigateToView('ind_com_orcamentos');
                else if (onSelectSubTab) onSelectSubTab('ind_com_orcamentos_tab');
              }}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📐</span> Novo Orçamento
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            placeholder="Pesquisar por Razão Social, Nome Fantasia, CNPJ ou Comprador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Segmentos Fabris</option>
            <option value="Agrícola">Agrícola & Tratores</option>
            <option value="Alimentício">Alimentício & Frigorífico</option>
            <option value="Autopeças">Autopeças & Metalmecânica</option>
            <option value="Motores">Motores & Equipamentos</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM DE CLIENTES INDUSTRIAIS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏭</span> Carteira de Clientes Industriais Homologados ({filteredClients.length})
          </h3>
          <span className="text-xs text-slate-500">Dados integrados com faturamento fabril e limite de crédito</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Razão Social & Nome Fantasia</th>
                <th className="py-3 px-4 font-semibold">CNPJ / IE</th>
                <th className="py-3 px-4 font-semibold">Segmento & Localização</th>
                <th className="py-3 px-4 font-semibold">Comprador Responsável</th>
                <th className="py-3 px-4 font-semibold">Condição & Tabela</th>
                <th className="py-3 px-4 font-semibold text-right">Limite de Crédito</th>
                <th className="py-3 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredClients.map((client: any) => (
                <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{client.razaoSocial}</div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400">{client.nomeFantasia}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <div>{client.cnpj}</div>
                    <div className="text-slate-400">IE: {client.ie}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{client.segmento}</div>
                    <div className="text-[11px] text-slate-400">{client.cidade}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 dark:text-white">{client.compradorPrincipal}</div>
                    <div className="text-[11px] text-slate-500">{client.telefone}</div>
                    <div className="text-[10px] text-slate-400">{client.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px] mb-1">
                      {client.condicaoPagamento}
                    </span>
                    <div className="text-[10px] text-slate-500">{client.tabelaPreco}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {client.limiteCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Utilizado: R$ {client.limiteUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold transition cursor-pointer"
                        title="Ver Detalhes e Histórico"
                      >
                        Visualizar
                      </button>
                      <button
                        onClick={() => onSelectSubTab && onSelectSubTab('ind_com_pedidos_tab')}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded text-[11px] font-bold transition cursor-pointer"
                        title="Emitir Pedido de Venda"
                      >
                        Novo Pedido
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHES DO CLIENTE */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha Cadastral B2B: {selectedClient.razaoSocial}
                </h3>
                <p className="text-xs text-slate-500">CNPJ: {selectedClient.cnpj} • Inscrição Estadual: {selectedClient.ie}</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Nome Fantasia</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClient.nomeFantasia}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Segmento Industrial</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClient.segmento}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Comprador / Contato Homologado</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClient.compradorPrincipal}</span>
                <span className="text-[10px] text-slate-500 block">{selectedClient.telefone} • {selectedClient.email}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Condição de Pagamento</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedClient.condicaoPagamento}</span>
                <span className="text-[10px] text-slate-500 block">{selectedClient.tabelaPreco}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Limite de Crédito Concedido</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  R$ {selectedClient.limiteCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block">Saldo disponível: R$ {(selectedClient.limiteCredito - selectedClient.limiteUtilizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 block font-medium">Faturamento Total do Ano</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  R$ {selectedClient.totalFaturadoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block">Status: Homologado para fornecimento</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedClient(null);
                  if (onNavigateToView) onNavigateToView('ind_com_pedidos');
                  else if (onSelectSubTab) onSelectSubTab('ind_com_pedidos_tab');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Gerar Pedido de Venda para este Cliente
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVO CLIENTE B2B */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕</span> Homologar Novo Cliente Industrial B2B
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewClient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Razão Social da Indústria / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Indústria Metalúrgica Alvorada S/A"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alvorada Metal"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 110.222.333.444 ou ISENTO"
                    value={ie}
                    onChange={(e) => setIe(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Segmento Industrial
                  </label>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Metalmecânica & Usinagem">Metalmecânica & Usinagem</option>
                    <option value="Maquinário Agrícola & Tratores">Maquinário Agrícola & Tratores</option>
                    <option value="Autopeças & Estamparia">Autopeças & Estamparia</option>
                    <option value="Alimentício & Frigorífico">Alimentício & Frigorífico</option>
                    <option value="Óleo, Gás & Válvulas">Óleo, Gás & Válvulas</option>
                    <option value="Equipamentos Elétricos & Motores">Equipamentos Elétricos & Motores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Comprador Principal / Engenharia
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do comprador técnico"
                    value={comprador}
                    onChange={(e) => setComprador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    E-mail do Departamento de Compras
                  </label>
                  <input
                    type="email"
                    placeholder="compras@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Condição de Pagamento Acordada
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 28 / 42 / 56 ddl"
                    value={condPagto}
                    onChange={(e) => setCondPagto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Limite de Crédito Aprovado (R$)
                  </label>
                  <input
                    type="number"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Salvar e Homologar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
