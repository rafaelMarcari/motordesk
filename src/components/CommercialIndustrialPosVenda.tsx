import React, { useState, useMemo } from 'react';
import { CommercialProps } from './CommercialIndustrialViews';

// --------------------------------------------------------------------------------------
// 5. PÓS-VENDA, GARANTIAS & SAC TÉCNICO INDUSTRIAL
// --------------------------------------------------------------------------------------
export function IndustrialPosVendaSACView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog
}: CommercialProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDiscText, setNewDiscText] = useState('');
  const [newDiscAuthor, setNewDiscAuthor] = useState('Eng. Suporte Técnico');

  // Form Novo Chamado
  const [clientName, setClientName] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketType, setTicketType] = useState('GARANTIA_TECNICA');
  const [ticketSeverity, setTicketSeverity] = useState('MEDIA');
  const [lotOrigin, setLotOrigin] = useState('');

  const tickets = useMemo(() => {
    return db.industrialAfterSales && db.industrialAfterSales.length > 0
      ? db.industrialAfterSales
      : [
          {
            id: 'SAC-IND-2026-001',
            clientName: 'Frigorífico Aurora Sul S/A',
            productDescription: 'Tambor Rotativo Inox 304 (Linha de Desossa)',
            lotOrigin: 'LOTE-INOX-2026-08',
            type: 'GARANTIA_TECNICA',
            severity: 'MEDIA',
            assignedTech: 'Eng. Ricardo Suporte',
            status: 'EM_ATENDIMENTO',
            openedDate: '2026-09-08',
            description: 'Vibração excessiva no mancal esquerdo durante teste de comissionamento da linha.',
            discussions: [
              { id: 'sd-1', date: '2026-09-08 11:30', author: 'Eng. Ricardo', notes: 'Contato telefônico com o mecânico-chefe Sr. Valdecir. Solicitado envio de vídeo com espectro de vibração.' },
              { id: 'sd-2', date: '2026-09-09 14:00', author: 'Eng. Ricardo', notes: 'Identificado desalinhamento de base de fixação na estrutura do cliente. Enviado laudo com tolerância de nivelamento.' }
            ]
          },
          {
            id: 'SAC-IND-2026-002',
            clientName: 'Metalúrgica Precision Parts Ltda',
            productDescription: 'Flanges Usinadas em Alumínio Naval',
            lotOrigin: 'LOTE-ALUM-2026-14',
            type: 'DUVIDA_TECNICA',
            severity: 'BAIXA',
            assignedTech: 'Fernanda Qualidade',
            status: 'RESOLVIDO',
            openedDate: '2026-09-06',
            description: 'Solicitação de certificado de análise química do banho de anodização dura.',
            discussions: [
              { id: 'sd-3', date: '2026-09-06 16:45', author: 'Fernanda Qualidade', notes: 'Enviado laudo do laboratório credenciado ISO 17025 com espessura de camada anódica.' }
            ]
          }
        ];
  }, [db.industrialAfterSales]);

  // Metricas
  const chamadosAtivos = tickets.filter((t: any) => t.status !== 'RESOLVIDO').length;
  const garantiasAtivas = tickets.filter((t: any) => t.type === 'GARANTIA_TECNICA').length;

  const filteredTickets = tickets.filter((t: any) => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.productDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAddDiscussion = () => {
    if (!newDiscText.trim() || !selectedTicket) return;
    const updated = tickets.map((t: any) => {
      if (t.id === selectedTicket.id) {
        const disc = {
          id: 'sd-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || newDiscAuthor,
          notes: newDiscText.trim()
        };
        const nextDiscs = [disc, ...(t.discussions || [])];
        const nextT = { ...t, discussions: nextDiscs };
        setSelectedTicket(nextT);
        return nextT;
      }
      return t;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialAfterSales: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Tratativa SAC Registrada',
        description: `Chamado ${selectedTicket.id} - ${selectedTicket.clientName}`,
        action: 'UPDATE'
      });
    }
    setNewDiscText('');
  };

  const handleResolveTicket = (ticket: any) => {
    const updated = tickets.map((t: any) => {
      if (t.id === ticket.id) {
        return {
          ...t,
          status: 'RESOLVIDO',
          discussions: [
            {
              id: 'sd-' + Date.now(),
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              author: currentUser?.name || 'Engenharia de Qualidade',
              notes: 'Chamado técnico finalizado e aprovado com o cliente.'
            },
            ...(t.discussions || [])
          ]
        };
      }
      return t;
    });

    onUpdateDb((prev: any) => ({ ...prev, industrialAfterSales: updated }));
    if (onAddHistoryLog) {
      onAddHistoryLog({
        title: 'Chamado SAC Concluído',
        description: `Chamado ${ticket.id} finalizado`,
        action: 'UPDATE'
      });
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newT = {
      id: 'SAC-IND-2026-' + Math.floor(100 + Math.random() * 900),
      clientName,
      productDescription: ticketSubject,
      lotOrigin: lotOrigin || 'LOTE-FABRIL-2026',
      type: ticketType,
      severity: ticketSeverity,
      assignedTech: currentUser?.name || 'Engenharia Técnica',
      status: 'EM_ATENDIMENTO',
      openedDate: new Date().toISOString().substring(0, 10),
      description: ticketSubject,
      discussions: [
        {
          id: 'sd-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: currentUser?.name || 'SAC Técnico',
          notes: 'Chamado de suporte registrado e encaminhado para análise técnica.'
        }
      ]
    };

    onUpdateDb((prev: any) => ({
      ...prev,
      industrialAfterSales: [newT, ...(prev.industrialAfterSales || tickets)]
    }));

    setShowNewModal(false);
    setClientName('');
    setTicketSubject('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded text-[11px] font-bold tracking-wide uppercase">
              Módulo 1 • SAC & Assistência de Campo
            </span>
            <span className="text-xs text-teal-200/70 font-mono">Garantia Fabril, Laudos & Tratativas B2B</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
            <span>🛡️</span> Pós-Venda & Suporte Técnico Industrial
          </h2>
          <p className="text-xs text-teal-100/80 max-w-2xl mt-1">
            Gestão de chamados técnicos de clientes, laudos de ensaios laboratoriais, controle de garantias fabris e satisfação do cliente industrial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Novo Chamado SAC
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Índice CSAT Industrial</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">96.8%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Satisfação B2B pós-entrega</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chamados em Tratativa</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{chamadosAtivos}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Atendimento ativo</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tempo Médio de Resolução</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">18.5 horas</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">SLA técnico fabril</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Garantias Técnicas</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{garantiasAtivas}</div>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Análise de RNC</span>
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="space-y-3">
        {filteredTickets.map((t: any) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition space-y-3"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-teal-600">{t.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === 'RESOLVIDO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Lote de Origem: <strong>{t.lotOrigin}</strong> • Aberto em: {t.openedDate}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{t.clientName}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(t)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💬</span> Tratativas ({t.discussions ? t.discussions.length : 0})
                </button>
                {t.status !== 'RESOLVIDO' && (
                  <button
                    type="button"
                    onClick={() => handleResolveTicket(t)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    Finalizar Chamado ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tratativas SAC */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tratativas & Laudos • {selectedTicket.id}
                </h3>
                <span className="text-xs text-teal-600 font-semibold">{selectedTicket.clientName}</span>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {(selectedTicket.discussions || []).map((d: any) => (
                  <div key={d.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-bold">
                      <span>{d.author}</span>
                      <span className="font-mono text-[10px]">{d.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{d.notes}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Registrar Nova Tratativa / Parecer
                </h4>
                <textarea
                  rows={3}
                  value={newDiscText}
                  onChange={e => setNewDiscText(e.target.value)}
                  placeholder="Descreva o contato com o cliente, parecer de engenharia ou laudo emitido..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddDiscussion}
                  disabled={!newDiscText.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Tratativa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo SAC */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTicket}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Chamado SAC Técnico</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente Industrial</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ex: Frigorífico Aurora Sul S/A"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição da Ocorrência / Produto</label>
              <textarea
                rows={2}
                required
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                placeholder="Ex: Vibração em teste de comissionamento de tambor rotativo inox"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Ocorrência</label>
                <select
                  value={ticketType}
                  onChange={e => setTicketType(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="GARANTIA_TECNICA">Garantia Fabril / Reparo</option>
                  <option value="DUVIDA_TECNICA">Dúvida Técnica / Laudo</option>
                  <option value="ASSISTENCIA_CAMPO">Assistência em Campo</option>
                  <option value="REPOSICAO_PECA">Reposição de Peça</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lote Fabril de Origem</label>
                <input
                  type="text"
                  value={lotOrigin}
                  onChange={e => setLotOrigin(e.target.value)}
                  placeholder="LOTE-INOX-2026-08"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
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
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-sm"
              >
                Abrir Chamado SAC
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
