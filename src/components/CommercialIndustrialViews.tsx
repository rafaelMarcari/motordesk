import React, { useState, useMemo } from 'react';

// Props padrao compartilhadas
export interface CommercialProps {
  currentUser?: any;
  currentCompany?: any;
  db: any;
  onUpdateDb: (updater: (prev: any) => any) => void;
  onAddHistoryLog?: (log: any) => void;
  onNavigateToView?: (route: string) => void;
  onSelectSubTab?: (tab: string) => void;
}

// --------------------------------------------------------------------------------------
// 1. MARKETING / PROSPECÇÃO INDUSTRIAL
// --------------------------------------------------------------------------------------
export function IndustrialMarketingProspeccaoView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onSelectSubTab
}: CommercialProps) {
  const [filterSegment, setFilterSegment] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDiscText, setNewDiscText] = useState('');
  const [newDiscType, setNewDiscType] = useState('REUNIAO');

  // Formulario de nova prospecção
  const [newCompany, setNewCompany] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newSegment, setNewSegment] = useState('Metalmecânica');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEstValue, setNewEstValue] = useState('50000');
  const [newAction, setNewAction] = useState('Apresentar portfólio de usinagem e caldeiraria');

  const prospects = useMemo(() => {
    return db.industrialProspects && db.industrialProspects.length > 0
      ? db.industrialProspects
      : [
          {
            id: 'prosp-1',
            companyName: 'Agrícola & Tratores Santa Fé Ltda',
            cnpj: '45.123.789/0001-44',
            segment: 'Maquinário Agrícola',
            contactName: 'Carlos Eduardo (Ger. Suprimentos)',
            phone: '(19) 3881-4400',
            email: 'carlos.compras@agrisantafe.com.br',
            stage: 'COTACAO_SOLICITADA',
            estimatedValue: 145000,
            probability: 80,
            nextAction: 'Emitir proposta de usinagem dos cubos de roda e eixos estriados',
            discussions: [
              { id: 'disc-1', date: '2026-09-08 14:30', author: 'Roberto Vendas', type: 'REUNIAO', notes: 'Apresentado portfólio de centros de usinagem 5 eixos e tolerâncias ISO 2768-m. Cliente solicitou cotação de 120 eixos.', nextStep: 'Cotação técnica na Engenharia' },
              { id: 'disc-2', date: '2026-09-10 10:15', author: 'Roberto Vendas', type: 'LIGACAO', notes: 'Alinhado prazo de entrega: cliente precisa do primeiro lote em 20 dias.', nextStep: 'Simular carga de máquina no PCP' }
            ]
          },
          {
            id: 'prosp-2',
            companyName: 'Sul Minas Autopeças & Componentes',
            cnpj: '18.940.112/0001-89',
            segment: 'Autopeças & Estamparia',
            contactName: 'Mariana Vasconcelos (Eng. Compras)',
            phone: '(35) 3471-9920',
            email: 'm.vasconcelos@sulminasauto.com.br',
            stage: 'APRESENTACAO_TECNICA',
            estimatedValue: 98000,
            probability: 50,
            nextAction: 'Agendar visita técnica da equipe de engenharia para avaliar amostras',
            discussions: [
              { id: 'disc-3', date: '2026-09-05 16:00', author: 'Fernanda Comercial', type: 'EMAIL', notes: 'Envio de catálogo técnico e laudos de ensaio de dureza Rockwell.', nextStep: 'Follow-up telefônico' }
            ]
          },
          {
            id: 'prosp-3',
            companyName: 'HidroPower Sistemas Hidráulicos',
            cnpj: '31.220.554/0001-12',
            segment: 'Óleo & Gás / Hidráulica',
            contactName: 'Eng. Paulo Guimarães',
            phone: '(11) 4192-3300',
            email: 'guimaraes@hidropower.ind.br',
            stage: 'REUNIAO_AGENDADA',
            estimatedValue: 220000,
            probability: 65,
            nextAction: 'Videoconferência técnica para análise de desenhos 3D STEP',
            discussions: [
              { id: 'disc-4', date: '2026-09-09 11:00', author: 'Roberto Vendas', type: 'WHATSAPP', notes: 'Cliente confirmou interesse em terceirizar blocos manifold usinados em ferro fundido nodular.', nextStep: 'Reunião técnica' }
            ]
          }
        ];
  }, [db.industrialProspects]);

  // Metricas
  const totalPipeline = prospects.reduce((acc: number, p: any) => acc + (p.estimatedValue || 0), 0);
  const cotacoesSolicitadas = prospects.filter((p: any) => p.stage === 'COTACAO_SOLICITADA').length;
  const reunioesAtivas = prospects.filter((p: any) => p.stage === 'REUNIAO_AGENDADA' || p.stage === 'APRESENTACAO_TECNICA').length;

  const filteredProspects = prospects.filter((p: any) => {
    const matchSegment = filterSegment === 'ALL' || p.segment === filterSegment;
    const matchSearch =
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cnpj.includes(searchTerm) ||
      p.contactName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSegment && matchSearch;
  });

  const handleAddDiscussion = () => {
    if (!newDiscText.trim() || !selectedProspect) return;
    const updated = prospects.map((p: any) => {
      if (p.id === selectedProspect.id) {
        const newDisc = {
          id: 'disc-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Consultor Comercial',
          type: newDiscType,
          notes: newDiscText.trim(),
          nextStep: 'Acompanhamento comercial ativo'
        };
        const nextDiscs = [newDisc, ...(p.discussions || [])];
        const nextP = { ...p, discussions: nextDiscs };
        setSelectedProspect(nextP);
        return nextP;
      }
      return p;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialProspects: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Discussão de Prospecção Registrada',
        description: `Contato registrado com ${selectedProspect.companyName} (${newDiscType})`,
        action: 'UPDATE'
      });
    }
    setNewDiscText('');
  };

  const handleCreateProspect = (e: React.FormEvent) => {
    e.preventDefault();
    const newP = {
      id: 'prosp-' + Date.now(),
      companyName: newCompany,
      cnpj: newCnpj || '00.000.000/0001-00',
      segment: newSegment,
      contactName: newContact,
      phone: newPhone,
      email: newEmail,
      stage: 'MAPEAMENTO',
      estimatedValue: parseFloat(newEstValue) || 0,
      probability: 40,
      nextAction: newAction,
      discussions: [
        {
          id: 'disc-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'Consultor Comercial',
          type: 'MAPEAMENTO',
          notes: 'Conta cadastrada no funil de prospecção industrial B2B.',
          nextStep: newAction
        }
      ]
    };
    const nextList = [newP, ...prospects];
    onUpdateDb((prev: any) => ({ ...prev, industrialProspects: nextList }));
    setShowNewModal(false);
    setNewCompany('');
    setNewContact('');
    setNewPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Módulo 1 • Comercial Industrial
            </span>
            <span className="text-xs text-blue-200/70 font-mono">Pipeline B2B & Leads Fabris</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🎯</span> Marketing & Prospecção Industrial B2B
          </h2>
          <p className="text-xs text-blue-100/80 max-w-2xl mt-1">
            Mapeamento de montadoras e indústrias, qualificação técnica de compradores, registro de reuniões e conversão em cotações fabris.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Nova Conta B2B
          </button>
        </div>
      </div>

      {/* 4 Cards de Métricas Consistentes de Cenário */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contas Mapeadas</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{prospects.length}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Alvos ativos no pipeline</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reuniões & Apresentação</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{reunioesAtivas}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Alinhamentos técnicos</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cotações Solicitadas</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{cotacoesSolicitadas}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Aptos p/ Orçamento</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Potencial Estimado</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Ticket médio promissor</span>
        </div>
      </div>

      {/* Funil Visual de Prospecção */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">
          Funil de Estágios da Prospecção Industrial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { id: 'MAPEAMENTO', label: '1. Mapeamento & Contato', desc: 'Identificação de compradores', color: 'border-l-4 border-slate-400 bg-slate-50 dark:bg-slate-800/40' },
            { id: 'APRESENTACAO_TECNICA', label: '2. Apresentação Técnica', desc: 'Envio de catálogo e capacidades', color: 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' },
            { id: 'REUNIAO_AGENDADA', label: '3. Reunião de Engenharia', desc: 'Análise de tolerâncias e peças', color: 'border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' },
            { id: 'COTACAO_SOLICITADA', label: '4. Cotação Solicitada', desc: 'Recebimento de desenhos 3D/STEP', color: 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' }
          ].map(f => {
            const count = prospects.filter((p: any) => p.stage === f.id).length;
            return (
              <div key={f.id} className={`p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${f.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{f.label}</span>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-[11px] font-mono font-bold shadow-xs">
                    {count}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Buscar por empresa, CNPJ ou contato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSegment}
            onChange={e => setFilterSegment(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            <option value="ALL">Todos os Segmentos Industriais</option>
            <option value="Maquinário Agrícola">Maquinário Agrícola</option>
            <option value="Autopeças & Estamparia">Autopeças & Estamparia</option>
            <option value="Óleo & Gás / Hidráulica">Óleo & Gás / Hidráulica</option>
            <option value="Metalmecânica">Metalmecânica</option>
          </select>
        </div>
      </div>

      {/* Lista de Contas Prospectadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProspects.map((p: any) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-blue-400 transition"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{p.companyName}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{p.cnpj}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {p.segment}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">👤</span>
                  <span className="font-medium">{p.contactName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">📞</span>
                  <span>{p.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">✉️</span>
                  <span className="truncate">{p.email}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                  <span>Potencial Estimado:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                    R$ {(p.estimatedValue || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  <strong>Próxima Ação:</strong> {p.nextAction}
                </div>
              </div>
            </div>

            {/* Ações e Discussões */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedProspect(p)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>💬</span> Discussões ({p.discussions ? p.discussions.length : 0})
              </button>
              {onSelectSubTab && (
                <button
                  type="button"
                  onClick={() => onSelectSubTab('ind_com_orcamentos_tab')}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Elaborar Orçamento →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Discussões & Histórico da Conta */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Histórico de Discussões & Alinhamentos
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {selectedProspect.companyName} • {selectedProspect.contactName}
                </span>
              </div>
              <button
                onClick={() => setSelectedProspect(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Timeline de discussões */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {(selectedProspect.discussions || []).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          {d.type}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{d.author}</span>
                      </div>
                      <span className="font-mono text-[11px]">{d.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{d.notes}</p>
                    {d.nextStep && (
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        → Encaminhamento: {d.nextStep}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Registro de Nova Discussão */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Registrar Nova Interação / Alinhamento
                </h4>
                <div className="flex gap-2">
                  <select
                    value={newDiscType}
                    onChange={e => setNewDiscType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="REUNIAO">Reunião Presencial / Teams</option>
                    <option value="LIGACAO">Ligação Telefônica</option>
                    <option value="WHATSAPP">WhatsApp Comercial</option>
                    <option value="EMAIL">E-mail Técnico</option>
                    <option value="VISITA_TECNICA">Visita no Parque Fabril</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={newDiscText}
                  onChange={e => setNewDiscText(e.target.value)}
                  placeholder="Descreva a negociação, retorno do comprador, acordos de especificações técnicas ou preço..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddDiscussion}
                  disabled={!newDiscText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Gravar Registro de Discussão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProspect}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova Conta para Prospecção B2B</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Empresa</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Ex: Indústria Mecânica Rexford Ltda"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={newCnpj}
                  onChange={e => setNewCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Segmento</label>
                <select
                  value={newSegment}
                  onChange={e => setNewSegment(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Metalmecânica">Metalmecânica</option>
                  <option value="Maquinário Agrícola">Maquinário Agrícola</option>
                  <option value="Autopeças & Estamparia">Autopeças & Estamparia</option>
                  <option value="Óleo & Gás / Hidráulica">Óleo & Gás / Hidráulica</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contato (Comprador/Eng.)</label>
                <input
                  type="text"
                  required
                  value={newContact}
                  onChange={e => setNewContact(e.target.value)}
                  placeholder="Ex: João Silveira"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="(11) 98888-0000"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Potencial Estimado (R$)</label>
                <input
                  type="number"
                  value={newEstValue}
                  onChange={e => setNewEstValue(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Próxima Ação</label>
                <input
                  type="text"
                  value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
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
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm"
              >
                Cadastrar Conta B2B
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
