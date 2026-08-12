/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, FileText, X, Printer, CheckCircle, ExternalLink, Info, ShieldAlert } from 'lucide-react';

interface PrivacyLgpdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  companyName?: string;
}

export default function PrivacyLgpdModal({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
  companyName = 'MotorDesk'
}: PrivacyLgpdModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight font-display flex items-center gap-2">
                Termo de Aceite de Privacidade & Proteção de Dados
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  LGPD (Lei nº 13.709/18)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Política Transparente de Tratamento de Dados Pessoais — {companyName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-indigo-50/80 border-b border-indigo-100 p-3.5 px-6 flex items-center gap-3 text-indigo-950 text-xs">
          <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="leading-snug font-medium">
            Sua privacidade é nossa prioridade. Este documento especifica abertamente como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais no sistema.
          </p>
        </div>

        {/* Scrollable Terms Body */}
        <div 
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed max-h-[60vh] divide-y divide-slate-100"
        >
          {/* Section 1 */}
          <section className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">1.</span>
              Compromisso com a Lei Geral de Proteção de Dados (LGPD)
            </h3>
            <p>
              A plataforma <strong>{companyName}</strong> atua em conformidade rigorosa com a Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018 - LGPD). Garantimos transparência, segurança, confidencialidade e controle aos titulares quanto aos seus dados pessoais e de seus veículos.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">2.</span>
              Dados Pessoais Coletados e Tratados
            </h3>
            <p>
              Para o fornecimento das funcionalidades do sistema, emitir documentos fiscais e gerenciar Ordens de Serviço, coletamos os seguintes dados:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Dados de Clientes e Proprietários:</strong> Nome Completo, CPF/CNPJ, RG, Endereço Residencial/Comercial, E-mail e Telefone/WhatsApp.</li>
              <li><strong>Dados do Veículo:</strong> Placa, Renavam, Chassi, Marca, Modelo, Ano e Histórico de Manutenções.</li>
              <li><strong>Dados de Operadores e Colaboradores:</strong> Nome, Cargo, Nível de Acesso, Histórico de Auditoria e Logs de Operação no Sistema.</li>
              <li><strong>Dados Fiscais e Financeiros:</strong> Informações de pagamento, boletos, chaves PIX e documentos de faturamento.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">3.</span>
              Finalidades do Tratamento
            </h3>
            <p>Os dados tratados são utilizados exclusivamente para as seguintes finalidades legais e operacionais:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <p className="font-bold text-slate-800 mb-0.5">🛠️ Gestão de Ordens de Serviço</p>
                <p className="text-[11px] text-slate-500">Acompanhamento do status do veículo, orçamentos e registro histórico de peças e serviços.</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <p className="font-bold text-slate-800 mb-0.5">📄 Emissão Fiscal (SEFAZ)</p>
                <p className="text-[11px] text-slate-500">Transmissão legal de Notas Fiscais Eletrônicas (NFe/NFCe) para a Secretaria da Fazenda.</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <p className="font-bold text-slate-800 mb-0.5">💰 Faturamento e Cobrança</p>
                <p className="text-[11px] text-slate-500">Emissão de boletos, cobranças via WhatsApp/E-mail e gestão do limite de crédito.</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <p className="font-bold text-slate-800 mb-0.5">🔍 Auditoria e Rastreabilidade</p>
                <p className="text-[11px] text-slate-500">Registro de ações dos operadores para segurança contra fraudes e conformidade de testes.</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">4.</span>
              Compartilhamento de Dados com Terceiros
            </h3>
            <p>
              Não comercializamos nem compartilhamos dados pessoais com terceiros para fins de marketing. O compartilhamento ocorre apenas quando necessário para a execução do serviço:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Órgãos Governamentais e SEFAZ:</strong> Para cumprimento de obrigações tributárias e fiscais.</li>
              <li><strong>Instituições Bancárias e Adquirentes:</strong> Para processamento de boletos e transações financeiras solicitadas pelo usuário.</li>
              <li><strong>Determinação Judicial:</strong> Mediante ordem das autoridades competentes.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">5.</span>
              Segurança, Armazenamento e Criptografia
            </h3>
            <p>
              Utilizamos medidas técnicas e organizacionais avançadas para proteger os dados armazenados contra acessos não autorizados, perdas ou alterações:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Multi-Tenancy Isolado:</strong> Os dados de cada empresa e cliente são restritos exclusivamente ao escopo da loja correspondente.</li>
              <li><strong>Controle Granular de Permissões:</strong> Níveis de acesso que delimitam quem pode ler ou modificar informações sensíveis.</li>
              <li><strong>Logs de Auditoria Imutáveis:</strong> Registro contínuo das alterações para garantir a integridade dos dados.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">6.</span>
              Direitos dos Titulares dos Dados (Art. 18 da LGPD)
            </h3>
            <p>Conforme previsto no Art. 18 da Lei nº 13.709/2018, você possui o direito de solicitar a qualquer momento:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Confirmação de Tratamento</span>
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Acesso aos Dados</span>
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Correção de Dados Incompletos</span>
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Portabilidade de Dados</span>
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Eliminação / Anonymização</span>
              <span className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-800">✓ Revogação do Consentimento</span>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="text-indigo-600 font-mono">7.</span>
              Contato do Encarregado de Proteção de Dados (DPO)
            </h3>
            <p>
              Para exercer seus direitos de privacidade ou esclarecer dúvidas sobre este Termo, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-[11px] mt-2">
              <div>
                <p className="font-bold text-white">Canal Oficial de Atendimento LGPD</p>
                <p className="text-indigo-400">E-mail: dpo@motordesk.com.br</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold">
                Atendimento Rápido
              </span>
            </div>
          </section>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Última atualização: Julho/2026 — Versão 2.4 (Compatível LGPD)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir / PDF</span>
            </button>

            {showAcceptButton && onAccept ? (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                type="button"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Concordo e Aceito os Termos</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Entendido / Fechar
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Componente Reutilizável de Rodapé de Aceite LGPD para Telas de Login e Cadastro
 */
interface PrivacyLgpdFooterProps {
  onOpenModal: () => void;
  accepted?: boolean;
  isChecked?: boolean;
  onToggleAccept?: (accepted: boolean) => void;
  onToggleCheck?: (checked: boolean) => void;
  showCheckbox?: boolean;
  mode?: 'login' | 'register' | 'compact';
}

export function PrivacyLgpdFooter({
  onOpenModal,
  accepted,
  isChecked,
  onToggleAccept,
  onToggleCheck,
  showCheckbox = true,
  mode = 'compact'
}: PrivacyLgpdFooterProps) {
  const currentChecked = isChecked !== undefined ? isChecked : (accepted ?? false);
  const handleToggle = (val: boolean) => {
    if (onToggleCheck) onToggleCheck(val);
    if (onToggleAccept) onToggleAccept(val);
  };

  return (
    <div className="mt-4 pt-3 border-t border-slate-200/80 font-sans text-left">
      <div className="flex flex-col space-y-2">
        {showCheckbox && (
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={currentChecked}
              onChange={e => handleToggle(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <span className="leading-tight">
              Li e concordo com os <strong className="text-slate-900">Termos de Privacidade e Proteção de Dados (LGPD)</strong>. *
            </span>
          </label>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {mode === 'login' ? 'Conexão Segura & Proteção de Dados LGPD' : 'Ambiente Criptografado & Em conformidade com a LGPD'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenModal}
            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ver Termo de Privacidade & LGPD Completo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
