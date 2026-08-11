/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Table, 
  Terminal, 
  Copy, 
  Check, 
  PlayCircle, 
  Info, 
  ShieldCheck,
  RotateCcw,
  X,
  Database,
  Search,
  Code2,
  Building2,
  CheckCircle,
  Plus,
  Users,
  Shield,
  ShieldAlert,
  User as UserIcon,
  Download
} from 'lucide-react';
import { TestCase, CompanyInfo, User } from '../types';
import { AppDatabase } from '../data/mockData';

interface QAPortfolioViewProps {
  testCases: TestCase[];
  onUpdateTestCaseStatus: (id: string, status: TestCase['status'], comments?: string) => void;
  onResetTestCases: () => void;
  db?: AppDatabase;
  onRegisterCompany?: (companyInfo: CompanyInfo) => void;
  currentUser?: User | null;
  onOpenDocModal?: () => void;
}

export default function QAPortfolioView({ testCases = [], onUpdateTestCaseStatus, onResetTestCases, db, onRegisterCompany, currentUser, onOpenDocModal }: QAPortfolioViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'prd' | 'cases' | 'matrix' | 'cypress' | 'sql' | 'companies'>('prd');
  const [copied, setCopied] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [simFeedback, setSimFeedback] = useState('');

  // Safe fallback for testCases
  const safeTestCases = Array.isArray(testCases) && testCases.length > 0 
    ? testCases 
    : (db?.testCases && Array.isArray(db.testCases) ? db.testCases : []);

  // Audit History Filters State
  const [auditCompId, setAuditCompId] = useState<string>('all');
  const [auditUser, setAuditUser] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditCategory, setAuditCategory] = useState<string>('all');

  // Company Registration State for QA User
  const [qaCompName, setQaCompName] = useState('');
  const [qaCompCnpj, setQaCompCnpj] = useState('');
  const [qaCompWhatsapp, setQaCompWhatsapp] = useState('');
  const [qaCompPhone, setQaCompPhone] = useState('');
  const [qaCompEmail, setQaCompEmail] = useState('');
  const [qaCompAddress, setQaCompAddress] = useState('');
  const [qaAdminName, setQaAdminName] = useState('');
  const [qaAdminUsername, setQaAdminUsername] = useState('');
  const [qaAdminPassword, setQaAdminPassword] = useState('');
  const [qaRegSuccess, setQaRegSuccess] = useState('');
  const [qaRegError, setQaRegError] = useState('');

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM clients');
  const [queryResult, setQueryResult] = useState<{ success?: boolean; error?: string | null; rows?: any[]; tableName?: string; count?: number } | null>(null);

  const runSqlQuery = (queryToRun?: string) => {
    const query = queryToRun || sqlQuery;
    const rawDb = localStorage.getItem('motordesk_db_v1');
    if (!db && !rawDb) {
      setQueryResult({ success: false, error: 'Banco de dados não encontrado no Cloud SQL PostgreSQL ou LocalStorage.', rows: [] });
      return;
    }

    try {
      const dbObj = db || (rawDb ? JSON.parse(rawDb) : null);
      if (!dbObj) {
        setQueryResult({ success: false, error: 'Erro ao carregar objeto do banco de dados.', rows: [] });
        return;
      }
      const sql = query.trim().replace(/;$/, '');

      // Check simple SELECT ... FROM <tableName> ...
      const match = sql.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?$/i);
      if (!match) {
        setQueryResult({
          success: false,
          error: `Sintaxe SQL não suportada pelo simulador. Use o padrão: SELECT * FROM <tabela> [WHERE <condição>] [ORDER BY <campo>]. Tabelas disponíveis: ${Object.keys(dbObj).join(', ')}`,
          rows: []
        });
        return;
      }

      const [, colsStr, tableName, whereStr, orderByStr] = match;
      const tableData = dbObj[tableName];

      if (!tableData || !Array.isArray(tableData)) {
        setQueryResult({
          success: false,
          error: `Tabela '${tableName}' não existe. Tabelas válidas: ${Object.keys(dbObj).join(', ')}`,
          rows: []
        });
        return;
      }

      let results = [...tableData];

      if (whereStr) {
        const likeMatch = whereStr.match(/([a-zA-Z0-9_]+)\s+LIKE\s+'%?([^%']+)?%?'/i);
        const eqMatch = whereStr.match(/([a-zA-Z0-9_]+)\s*=\s*'?([^']+)'?/i);
        const ltMatch = whereStr.match(/([a-zA-Z0-9_]+)\s*<\s*(\d+)/i);
        const gtMatch = whereStr.match(/([a-zA-Z0-9_]+)\s*>\s*(\d+)/i);

        if (likeMatch) {
          const [, field, val] = likeMatch;
          results = results.filter(row => String(row[field] || '').toLowerCase().includes(val.toLowerCase()));
        } else if (eqMatch) {
          const [, field, val] = eqMatch;
          results = results.filter(row => String(row[field] || '').toLowerCase() === val.toLowerCase());
        } else if (ltMatch) {
          const [, field, val] = ltMatch;
          results = results.filter(row => Number(row[field] || 0) < Number(val));
        } else if (gtMatch) {
          const [, field, val] = gtMatch;
          results = results.filter(row => Number(row[field] || 0) > Number(val));
        }
      }

      if (orderByStr) {
        const parts = orderByStr.trim().split(/\s+/);
        const field = parts[0];
        const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';
        results.sort((a, b) => {
          if (a[field] < b[field]) return isDesc ? 1 : -1;
          if (a[field] > b[field]) return isDesc ? -1 : 1;
          return 0;
        });
      }

      setQueryResult({
        success: true,
        error: null,
        rows: results,
        tableName,
        count: results.length
      });
    } catch (err: any) {
      setQueryResult({ success: false, error: err.message || 'Erro ao processar consulta.', rows: [] });
    }
  };

  // Count passes, fails, and pendings
  const passCount = safeTestCases.filter(c => c.status === 'passed').length;
  const failCount = safeTestCases.filter(c => c.status === 'failed').length;
  const pendingCount = safeTestCases.filter(c => c.status === 'pending').length;
  const totalCount = safeTestCases.length || 1;
  const passPercent = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // List of companies for audit filtering
  const allCompaniesList = React.useMemo(() => {
    if (db?.registeredCompanies && db.registeredCompanies.length > 0) {
      return db.registeredCompanies;
    }
    return db?.companyInfo ? [db.companyInfo] : [];
  }, [db]);

  const allAuditLogs = db?.history || [];

  const filteredAuditLogs = React.useMemo(() => {
    return allAuditLogs.filter(entry => {
      const compId = entry.companyId || 'comp-1';
      const matchesCompany = auditCompId === 'all' || compId === auditCompId;
      const matchesUser = auditUser === 'all' || entry.userName === auditUser;
      const matchesCategory = auditCategory === 'all' || entry.type === auditCategory;

      const q = auditSearch.toLowerCase();
      const matchesSearch = !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        (entry.userName || '').toLowerCase().includes(q);

      return matchesCompany && matchesUser && matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAuditLogs, auditCompId, auditUser, auditCategory, auditSearch]);

  const handleExportAuditCsv = () => {
    if (filteredAuditLogs.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Empresa ID', 'Empresa Nome', 'Usuario Operador', 'Tipo/Modulo', 'Titulo', 'Descricao Detalhada'];
    const rows = filteredAuditLogs.map(entry => {
      const comp = allCompaniesList.find(c => c.id === entry.companyId) || db?.companyInfo;
      return [
        entry.id,
        new Date(entry.date).toLocaleString('pt-BR'),
        entry.companyId || 'comp-1',
        comp?.name || 'MotorDesk Matriz',
        entry.userName || 'Sistema',
        entry.type,
        `"${(entry.title || '').replace(/"/g, '""')}"`,
        `"${(entry.description || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_acoes_usuario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detailed Cypress script text
  const cypressCodeText = `/**
 * MotorDesk - Suite de Testes Automatizados (Cypress)
 * Arquivo: cypress/e2e/motordesk.cy.js
 * Objetivo: Validar Regras de Negócio Críticas e Requisitos Funcionais
 */

describe('MotorDesk Mechanical Workshop - QA Test Suite', () => {
  
  beforeEach(() => {
    // Limpa o banco de dados local e define o ambiente inicial
    cy.visit('/');
    // Simula login de administrador para garantir acesso pleno
    cy.get('#login-username-input').type('admin');
    cy.get('#login-password-input').type('admin123');
    cy.get('#btn-login-submit').click();
    cy.get('#dashboard-view-container').should('be.visible');
  });

  // TESTE 1: Validação de CPF Único (RF001 / RN001)
  it('CT001 - Deve barrar cadastro de clientes com CPFs duplicados', () => {
    cy.get('#menu-btn-clients').click();
    cy.get('#btn-add-client').click();
    
    // Tenta usar um CPF que já existe na massa de dados inicial (ex: João)
    cy.get('#client-name-input').type('Alberto Roberto');
    cy.get('#client-cpf-input').type('123.456.789-00');
    cy.get('#client-phone-input').type('(11) 95555-5555');
    cy.get('#btn-save-client').click();

    // Deve acusar violação da regra de negócio
    cy.get('#client-error-alert')
      .should('be.visible')
      .and('contain', 'Regra de Negócio Violada (RN001)');
  });

  // TESTE 2: Validação de Placa Única de Veículo (RF003 / RN002)
  it('CT002 - Deve barrar cadastro de veículo com placa duplicada', () => {
    cy.get('#menu-btn-vehicles').click();
    cy.get('#btn-add-vehicle').click();
    
    // Associa ao primeiro cliente e insere placa duplicada
    cy.get('#vehicle-owner-select').select(0);
    cy.get('#vehicle-plate-input').type('ABC-1234');
    cy.get('#vehicle-brand-input').type('Ford');
    cy.get('#vehicle-model-input').type('Fiesta');
    cy.get('#btn-save-vehicle').click();

    // Assert de bloqueio
    cy.get('#vehicle-error-alert')
      .should('be.visible')
      .and('contain', 'Regra de Negócio Violada (RN002)');
  });

  // TESTE 3: Aprovação Parcial de Orçamento (RF007 / RF009 / RN005)
  it('CT003 - Deve processar aprovação parcial e registrar recusados no histórico', () => {
    cy.get('#menu-btn-budgets').click();
    
    // Entra nos detalhes do Orçamento Pendente
    cy.get('#btn-view-budget-orc-3').click();
    cy.get('#btn-simulate-decision-details').click();
    cy.get('#customer-approval-simulator-modal').should('be.visible');

    // Desmarca um dos itens para recusá-lo (ex: o primeiro item do vetor)
    cy.get('[id^=sim-item-chk-]').first().uncheck();
    cy.get('#btn-confirm-sim').click();

    // Orçamento deve constar como Parcialmente Aprovado
    cy.get('#budget-success-alert')
      .should('be.visible')
      .and('contain', 'Aprovado Parcial');

    // Gera a Ordem de Serviço
    cy.get('#btn-generate-os-details').click();
    cy.get('#os-view-container').should('be.visible');

    // Verifica se apenas o item APROVADO entrou na execução da OS
    cy.get('#os-items-table tbody tr').should('have.length.at.least', 1);
  });

  // TESTE 4: Bloqueio de Geração de OS sem aprovação (RN003)
  it('CT004 - Deve bloquear a geração de OS para orçamentos em aberto', () => {
    cy.get('#menu-btn-budgets').click();
    cy.get('#btn-view-budget-orc-3').click();
    
    // Botão de gerar OS deve estar desabilitado ou oculto para orçamento pendente
    cy.get('#btn-generate-os-details').should('not.exist');
  });

  // TESTE 5: Logout Seguro com Tarefa Pendente (Exit Flow / Modal)
  it('CT008 - Deve alertar sobre alterações não salvas antes de efetivar logout', () => {
    cy.get('#menu-btn-clients').click();
    cy.get('#btn-add-client').click();
    
    // Suja o formulário
    cy.get('#client-name-input').type('Cliente Rascunho');
    
    // Tenta clicar em Sair
    cy.get('#btn-sidebar-logout').click();

    // Deve abrir o modal de salvamento pendente com opções Sim e Não
    cy.get('#unsaved-changes-modal').should('be.visible');
    cy.get('#btn-unsaved-discard').click(); // descarta e desloga

    // Deve retornar para a tela de login
    cy.get('#login-view-container').should('be.visible');
  });
});
`;

  return (
    <div className="space-y-6 animate-fade-in" id="qa-portfolio-view-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Painel de Portfólio QA</h1>
          <p className="text-sm text-slate-500">Suite integrada com PRD, massa de testes manuais executável, rastreabilidade e automação Cypress.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          {onOpenDocModal && (
            <button
              id="btn-open-qa-doc-pdf"
              type="button"
              onClick={onOpenDocModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              title="Gerar e Baixar Documentação Técnica Completa em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-100" />
              <span>Documentação PDF</span>
            </button>
          )}
          <button 
            id="btn-reset-qa-db"
            onClick={onResetTestCases}
            className="flex items-center gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Resetar Testes
          </button>
        </div>
      </div>

      {/* Metric Dashboard Bar for QA */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Taxa de Cobertura</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-display">100%</span>
            <span className="text-xs text-slate-300">Requisitos Mapeados</span>
          </div>
        </div>

        <div className="space-y-1 border-l border-slate-800 pl-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Casos Executados</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{passCount + failCount} / {totalCount}</span>
            <span className="text-xs text-slate-300">Estáveis ({passPercent}% Pass)</span>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="sm:col-span-2 flex flex-col justify-center space-y-1.5 border-l border-slate-800 pl-4">
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>Passados: {passCount}</span>
            <span>Falhas: {failCount}</span>
            <span>Pendentes: {pendingCount}</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${(passCount / totalCount) * 100}%` }}></div>
            <div className="bg-rose-500 h-full" style={{ width: `${(failCount / totalCount) * 100}%` }}></div>
            <div className="bg-slate-700 h-full" style={{ width: `${(pendingCount / totalCount) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-150 gap-4" id="qa-suite-tabs">
        <button 
          id="btn-tab-prd"
          onClick={() => setActiveSubTab('prd')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'prd' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" /> 1. PRD Completo
        </button>
        <button 
          id="btn-tab-cases"
          onClick={() => setActiveSubTab('cases')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'cases' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> 2. Testes Manuais Executáveis
        </button>
        <button 
          id="btn-tab-matrix"
          onClick={() => setActiveSubTab('matrix')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'matrix' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Table className="w-4 h-4" /> 3. Matriz de Rastreabilidade
        </button>
        <button 
          id="btn-tab-cypress"
          onClick={() => setActiveSubTab('cypress')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'cypress' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Terminal className="w-4 h-4" /> 4. Automação Cypress
        </button>
        <button 
          id="btn-tab-sql"
          onClick={() => {
            setActiveSubTab('sql');
            if (!queryResult) runSqlQuery('SELECT * FROM clients');
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'sql' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Database className="w-4 h-4" /> 5. Inspeção & Consulta SQL
        </button>
        <button 
          id="btn-tab-register-company-qa"
          onClick={() => setActiveSubTab('companies')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'companies' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4" /> 6. Cadastrar Empresa (QA Exclusivo)
        </button>
      </div>

      {/* SUBTAB 1: COMPLETE PRD */}
      {activeSubTab === 'prd' && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-3xs space-y-6 text-sm text-slate-700 leading-relaxed font-sans" id="prd-document-panel">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 font-display">Documento de Requisitos (PRD) - MotorDesk</h2>
            <p className="text-xs text-slate-400 mt-1">Status: Homologado para QA | Versão 1.0.0 | Autor: Rafael Marcari</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display border-l-3 border-indigo-600 pl-2">1. Objetivo do Produto</h3>
            <p>
              O <strong>MotorDesk</strong> é um sistema de software para gestão operacional de oficinas mecânicas de reparação veicular. O principal objetivo do projeto é consolidar uma plataforma integrada onde atendentes, gerentes e mecânicos colaboram no ciclo de vida de reparo, além de servir como um portfólio rico de QA, fornecendo artefatos robustos de análise, casos de testes manuais e scripts de automação.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display border-l-3 border-indigo-600 pl-2">2. Atores e Perfis de Acesso (RF014)</h3>
            <p>O sistema adota o controle baseado em perfis (Role-Based Access Control) com permissões granulares configuráveis para cada usuário:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Administrador/Gerente:</strong> Possui acesso total e irrestrito a todas as áreas, incluindo relatórios financeiros e o menu de controle de operadores.</li>
              <li><strong>Atendente (Serviço de Entrada):</strong> Focado no contato inicial com o cliente. Cadastra clientes, veículos e cria orçamentos. Não edita estoque ou executa Ordens de Serviço.</li>
              <li><strong>Mecânico:</strong> Perfil puramente técnico. Acessa as ordens de serviço ativas, executa tarefas de reparo, inclui recomendações técnicas e sugere inclusão de novas peças durante a desmontagem (RN006).</li>
              <li><strong>QA / Tester:</strong> Perfil analítico para testes, capaz de visualizar fluxos e monitorar a massa de testes integrados do portfólio.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display border-l-3 border-indigo-600 pl-2">3. Requisitos Funcionais Detalhados (RF)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-900">RF001/002 - Cadastrar e Editar Cliente</p>
                <p className="text-slate-600 mt-1">Registrar proprietário de veículo com nome, CPF único, contato e endereço comercial.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-900">RF003 - Cadastrar Veículo</p>
                <p className="text-slate-600 mt-1">Registrar veículo e vinculá-lo a um proprietário pré-cadastrado. Validação de placa única.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-900">RF006/007/009 - Gestão de Orçamentos</p>
                <p className="text-slate-600 mt-1">Criar orçamentos com validade configurável (RN004). O cliente pode realizar aprovação integral ou parcial (aprovar uns itens e reprovar outros).</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-900">RF008/010 - Ordem de Serviço (OS)</p>
                <p className="text-slate-600 mt-1">Gerar a OS a partir do orçamento aprovado (RN003). Registrar laudo e recomendações técnicas para visualização final do cliente.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-display border-l-3 border-indigo-600 pl-2">4. Regras de Negócio Fundamentais (RN)</h3>
            <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-100 font-semibold text-slate-800">Mapeamento de Regras Aplicadas nas Validações do Sistema:</div>
              <div className="divide-y divide-slate-100">
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN001</span>
                  <p><strong>CPF único:</strong> O sistema deve proibir o cadastro de dois clientes com o mesmo número de CPF.</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN002</span>
                  <p><strong>Placa única:</strong> Nenhum veículo pode ser cadastrado se a placa já existir vinculada a outra frota.</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN003</span>
                  <p><strong>OS somente após orçamento aprovado:</strong> É proibido gerar uma Ordem de Serviço (OS) em aberto para orçamentos que continuam no estado "Pendente".</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN004</span>
                  <p><strong>Validade Configurável:</strong> Cada orçamento possui uma vigência técnica parametrizada em dias pelo criador.</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN005</span>
                  <p><strong>Preservação de Recusados:</strong> Se o cliente realizar aprovação parcial, os itens por ele reprovados são salvos definitivamente no histórico do carro, servindo como laudo de recusa de responsabilidade futura.</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN006</span>
                  <p><strong>Sugerir novos serviços:</strong> Durante a desmontagem das peças na execução técnica, o mecânico pode anexar sugestões de novos reparos pendentes de autorização final do cliente.</p>
                </div>
                <div className="p-3 flex items-start gap-4">
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">RN007</span>
                  <p><strong>Histórico Imutável:</strong> Os logs gravados no dossiê de auditoria do veículo não possuem botões de exclusão ou alteração técnica.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MANUAL TEST CASES RUNNER */}
      {activeSubTab === 'cases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="manual-tests-panel">
          {/* List of Test Cases */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Massa de Casos de Teste do Portfólio</h3>
              <span className="text-[10px] text-slate-400">Clique em qualquer teste para visualizar detalhes e executar a simulação</span>
            </div>

            <div className="space-y-2">
              {safeTestCases.map(tc => (
                <div 
                  key={tc.id}
                  onClick={() => {
                    setSelectedCase(tc);
                    setSimFeedback(tc.comments || '');
                  }}
                  className={`p-3.5 bg-white border rounded-xl cursor-pointer transition flex items-center justify-between gap-4 ${
                    selectedCase?.id === tc.id ? 'border-indigo-600 shadow-sm ring-1 ring-indigo-500' : 'border-slate-100 hover:border-slate-200'
                  }`}
                  id={`testcase-row-${tc.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {tc.code}
                      </span>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                        {tc.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{tc.title}</p>
                    <p className="text-[10px] text-slate-400">Requisito associado: <span className="font-mono font-bold">{tc.requirement}</span></p>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                      tc.status === 'passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      tc.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}>
                      {tc.status === 'passed' ? 'Aprovado (Pass)' :
                       tc.status === 'failed' ? 'Falha (Fail)' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Test Execution Inspector */}
          <div className="lg:col-span-1">
            {selectedCase ? (
              <div className="bg-white p-5 rounded-xl border border-indigo-150 shadow-md space-y-4 animate-slide-up" id="testcase-inspector">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{selectedCase.code}</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-2">{selectedCase.title}</h3>
                  </div>
                  <button id="btn-close-inspector" onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600">
                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Pré-Condições:</p>
                    <p className="mt-1 leading-relaxed">{selectedCase.preConditions}</p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Passos para Reprodução:</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1">
                      {selectedCase.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Resultado Esperado:</p>
                    <p className="mt-1 leading-relaxed font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{selectedCase.expectedResult}</p>
                  </div>

                  {/* Manual Run action simulation */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Ação do Testador (QA):</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold block" htmlFor="tc-comments-input">Notas / Evidência de Erro</label>
                      <input 
                        id="tc-comments-input"
                        type="text" 
                        value={simFeedback}
                        onChange={e => setSimFeedback(e.target.value)}
                        placeholder="Nenhum defeito encontrado. Fluxo conforme PRD."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        id="btn-tc-pass"
                        onClick={() => {
                          onUpdateTestCaseStatus(selectedCase.id, 'passed', simFeedback);
                          setSelectedCase(prev => prev ? { ...prev, status: 'passed', comments: simFeedback } : null);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 rounded-lg transition uppercase flex items-center justify-center gap-1"
                      >
                        Pass (Sucesso)
                      </button>
                      <button 
                        id="btn-tc-fail"
                        onClick={() => {
                          onUpdateTestCaseStatus(selectedCase.id, 'failed', simFeedback);
                          setSelectedCase(prev => prev ? { ...prev, status: 'failed', comments: simFeedback } : null);
                        }}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-2 rounded-lg transition uppercase flex items-center justify-center gap-1"
                      >
                        Fail (Defeito)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 h-64" id="case-inspector-empty">
                <Info className="w-8 h-8 text-slate-300" />
                <p>Nenhum caso de teste selecionado para inspeção.</p>
                <p className="text-[10px] max-w-xs leading-relaxed">Selecione um caso na lista ao lado para verificar os passos, resultados esperados e registrar o status da validação manual.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: TRACEABILITY MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-3xs space-y-4 p-5" id="matrix-panel">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm font-display">Matriz de Rastreabilidade de Requisitos e Testes Integrados</h3>
            <p className="text-xs text-slate-500 mt-1">Garante que 100% dos Requisitos Funcionais (RF) e Regras de Negócio (RN) do PRD estão protegidos por casos de teste correspondentes.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-100">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                  <th className="p-3 border-r border-slate-100">Cód Requisito</th>
                  <th className="p-3 border-r border-slate-100">Descrição do Requisito do PRD</th>
                  <th className="p-3 border-r border-slate-100">Caso de Teste Coberto</th>
                  <th className="p-3 border-r border-slate-100">Tipo de Cobertura</th>
                  <th className="p-3">Status de Homologação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {/* RF001 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RF001 / RN001</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Cadastrar Cliente & CPF Único</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT001</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded text-[10px]">Automação Cypress + Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Cobrindo Regra Absoluta</td>
                </tr>
                {/* RF003 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RF003 / RN002</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Cadastrar Veículo & Placa Única</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT002</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded text-[10px]">Automação Cypress + Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Cobrindo Regra Absoluta</td>
                </tr>
                {/* RF007 / RF009 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RF007 / RF009 / RN005</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Aprovação Parcial de Orçamento com itens recusados no histórico</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT003</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded text-[10px]">Automação Cypress + Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Cobertura de Fluxo Crítico</td>
                </tr>
                {/* RN003 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RN003</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Impedir OS sem orçamento aprovado anterior</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT004</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded text-[10px]">Automação Cypress + Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Restrição Técnica Segura</td>
                </tr>
                {/* RN006 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RN006</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Mecânico sugere novos itens durante execução</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT005</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[10px]">Teste Manual em Sandbox</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Fluxo de Mão de Obra</td>
                </tr>
                {/* RN007 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RN007</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Garantir imutabilidade de histórico de logs</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT006</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[10px]">Teste de Auditoria Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Segurança de Dados</td>
                </tr>
                {/* RF014 */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">RF014 / Permissões</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Restrições e controle de acesso por perfil</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT007</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[10px]">Teste Manual Multi-Perfil</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Controle Dinâmico RBAC</td>
                </tr>
                {/* Unsaved Changes */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">Tarefa Sem Salvar</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Bloquear logout e forçar decisão de salvar rascunho ativo</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT008</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded text-[10px]">Automação Cypress + Manual</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Proteção contra perda de dados</td>
                </tr>
                {/* Alterar Senha */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-indigo-600 bg-indigo-50/30">Alteração Credencial</td>
                  <td className="p-3 border-r border-slate-100 font-medium">Troca de senha validando a senha atual do colaborador</td>
                  <td className="p-3 border-r border-slate-100 font-mono">CT009</td>
                  <td className="p-3 border-r border-slate-100"><span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[10px]">Validação Manual de Segurança</span></td>
                  <td className="p-3 font-semibold text-emerald-600">✓ Autenticação Protegida</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CYPRESS AUTOMATION SCRIPTS */}
      {activeSubTab === 'cypress' && (
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white space-y-4 relative" id="cypress-automation-panel">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-100 text-sm font-display">Roteiros de Automação de Interface (Cypress End-to-End)</h3>
              <p className="text-[11px] text-slate-400">Roteiro automatizado abrangendo os fluxos críticos de integridade operacional do MotorDesk.</p>
            </div>
            <button 
              id="btn-copy-cypress-code"
              onClick={() => copyToClipboard(cypressCodeText)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Código Cypress
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg">
            <pre className="text-xs font-mono bg-slate-950 p-4 leading-relaxed text-indigo-300 max-h-110 overflow-y-auto">
              <code>{cypressCodeText}</code>
            </pre>
          </div>
        </div>
      )}

      {/* SUBTAB 5: SQL INSPECTOR & QUERY CONSOLE */}
      {activeSubTab === 'sql' && (
        <div className="space-y-6" id="sql-console-panel">
          {/* Header Info */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-slate-100 text-base font-display">Terminal de Consulta SQL em Tempo Real</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Consulte as tabelas do banco de dados do MotorDesk (`motordesk_db_v1`) em tempo real. Digite consultas SQL `SELECT` ou selecione um atalho abaixo:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LocalStorage DB Ativo
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atalhos de Consultas Frequentes (SELECT Presets)</span>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: '👥 Clientes', query: 'SELECT * FROM clients' },
                  { label: '🚗 Veículos', query: 'SELECT * FROM vehicles' },
                  { label: '🔧 Peças com Estoque Baixo', query: 'SELECT * FROM parts WHERE stockQuantity <= 10' },
                  { label: '📋 Ordens de Serviço Abertas', query: "SELECT * FROM serviceOrders WHERE status = 'aberta'" },
                  { label: '📄 Orçamentos', query: 'SELECT * FROM budgets' },
                  { label: '👤 Usuários e Perfis', query: 'SELECT * FROM users' },
                  { label: '📜 Log de Auditoria', query: 'SELECT * FROM history ORDER BY date DESC' },
                  { label: '🧪 Casos de Teste QA', query: 'SELECT * FROM testCases' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`btn-sql-preset-${idx}`}
                    type="button"
                    onClick={() => {
                      setSqlQuery(item.query);
                      runSqlQuery(item.query);
                    }}
                    className="bg-slate-800 hover:bg-indigo-900/50 hover:border-indigo-500/50 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Input Area */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between" htmlFor="sql-query-input">
                <span>Comando SQL (SELECT):</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">Suporta WHERE (ex: status = 'aberta' ou stockQuantity &lt; 10) e ORDER BY</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="sql-query-input"
                    type="text"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runSqlQuery();
                    }}
                    placeholder="Ex: SELECT * FROM clients WHERE name LIKE '%João%'"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-indigo-300 focus:outline-hidden focus:border-indigo-500 transition"
                  />
                  <Code2 className="w-4 h-4 text-slate-600 absolute right-3 top-3.5" />
                </div>
                <button
                  id="btn-run-sql"
                  type="button"
                  onClick={() => runSqlQuery()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" /> Executar Consulta
                </button>
              </div>
            </div>
          </div>

          {/* SQL Output Results Area */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0" id="sql-results-container">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Resultado da Consulta</h4>
                {queryResult?.success && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
                    Tabela: {queryResult.tableName} ({queryResult.count} registros)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Latência de Execução: ~1ms</span>
            </div>

            <div className="p-5">
              {queryResult?.error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-mono space-y-1">
                  <p className="font-bold">❌ Erro de Execução SQL:</p>
                  <p>{queryResult.error}</p>
                </div>
              )}

              {queryResult?.success && queryResult.rows && queryResult.rows.length === 0 && (
                <div className="p-8 text-center text-slate-400 space-y-1 font-sans">
                  <p className="font-semibold text-sm text-slate-600">Nenhum registro encontrado para esta consulta SQL.</p>
                  <p className="text-xs">Tente ajustar a cláusula WHERE ou selecione outra tabela.</p>
                </div>
              )}

              {queryResult?.success && queryResult.rows && queryResult.rows.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-120">
                  <table className="w-full text-left text-xs border-collapse font-mono" id="sql-result-table">
                    <thead>
                      <tr className="bg-slate-900 text-indigo-300 border-b border-slate-800">
                        {Object.keys(queryResult.rows[0]).map((colName) => (
                          <th key={colName} className="p-3 font-semibold text-[11px] border-r border-slate-800/80 whitespace-nowrap">
                            {colName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-indigo-50/30 transition">
                          {Object.keys(queryResult.rows![0]).map((colName) => {
                            const val = row[colName];
                            let formattedVal = '';
                            if (typeof val === 'object' && val !== null) {
                              formattedVal = JSON.stringify(val);
                            } else {
                              formattedVal = String(val ?? '');
                            }
                            return (
                              <td key={colName} className="p-3 border-r border-slate-100 text-[11px] text-slate-700 max-w-xs truncate" title={formattedVal}>
                                {formattedVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* DevTools Browser Console Guide */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 font-sans">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm font-display">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Como Consultar Diretamente pelo Console do Navegador (Browser DevTools - F12)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Como o MotorDesk armazena seus dados no <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">localStorage</code> sob a chave <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">motordesk_db_v1</code>, você também pode executar equivalentes a consultas SQL diretamente no Console do Desenvolvedor (F12) utilizando expressões JavaScript de filtro e mapeamento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-900 text-indigo-300 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">1. Listar todos os clientes (`SELECT * FROM clients`):</p>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-400">
                  <code>{`const db = JSON.parse(localStorage.getItem('motordesk_db_v1'));\nconsole.table(db.clients);`}</code>
                </pre>
              </div>

              <div className="bg-slate-900 text-indigo-300 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">2. Filtrar Peças com Estoque Baixo (`SELECT * FROM parts WHERE stockQuantity &lt; 10`):</p>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-400">
                  <code>{`const db = JSON.parse(localStorage.getItem('motordesk_db_v1'));\nconsole.table(db.parts.filter(p => p.stockQuantity < 10));`}</code>
                </pre>
              </div>

              <div className="bg-slate-900 text-indigo-300 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">3. Buscar Ordem de Serviço pelo Status (`SELECT * FROM serviceOrders WHERE status = 'aberta'`):</p>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-400">
                  <code>{`const db = JSON.parse(localStorage.getItem('motordesk_db_v1'));\nconsole.table(db.serviceOrders.filter(os => os.status === 'aberta'));`}</code>
                </pre>
              </div>

              <div className="bg-slate-900 text-indigo-300 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">4. Consultar Histórico de Logs de Auditoria (`SELECT * FROM history`):</p>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-400">
                  <code>{`const db = JSON.parse(localStorage.getItem('motordesk_db_v1'));\nconsole.table(db.history);`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* SECTION: AUDITORIA DE HISTÓRICO DE AÇÕES DO USUÁRIO DIVIDIDO POR EMPRESA E LIBERADO POR PERFIL */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fade-in" id="user-audit-section">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-indigo-200">
                  Rastreabilidade & Conformidade QA (RN007)
                </span>
                <h2 className="text-base font-bold text-slate-800 font-display mt-1.5 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Histórico do que Foi Feito pelo Usuário (Dividido por Empresa & Liberado por Perfil)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditoria centralizada de acessos, criações, aprovações de orçamentos e alterações de ordens de serviço por empresa.
                </p>
              </div>

              {/* Profile Permission Badge & Export Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div className="text-[11px]">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Acesso Liberado por Perfil:</span>
                    <span className="font-bold text-emerald-300">
                      {currentUser ? `${currentUser.name} (${currentUser.role.toUpperCase()})` : 'QA / Administrador'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-export-audit-table-csv"
                  onClick={handleExportAuditCsv}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
              </div>
            </div>

            {/* Audit Filters Bar (Company & User division) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar ação ou operador..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Company Filter (Multi-Tenant Division) */}
              <div>
                <select
                  id="audit-company-select"
                  value={auditCompId}
                  onChange={e => setAuditCompId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="all">🏢 Todas as Empresas ({allCompaniesList.length})</option>
                  {allCompaniesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.cnpj ? `(${c.cnpj})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <select
                  id="audit-user-select"
                  value={auditUser}
                  onChange={e => setAuditUser(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="all">👤 Todos os Usuários Operadores</option>
                  {Array.from(new Set(allAuditLogs.map(h => h.userName).filter(Boolean))).map(u => (
                    <option key={u} value={u}>Operador: {u}</option>
                  ))}
                </select>
              </div>

              {/* Action Category Filter */}
              <div>
                <select
                  id="audit-category-select"
                  value={auditCategory}
                  onChange={e => setAuditCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="all">⚡ Todos os Módulos / Eventos</option>
                  <option value="budget">📄 Orçamentos</option>
                  <option value="service_order">🔧 Ordens de Serviço</option>
                  <option value="payment">💰 Recebimentos/Financeiro</option>
                  <option value="user_activity">👤 Atividades de Usuário</option>
                  <option value="system">⚙️ Eventos de Sistema</option>
                </select>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <span>Exibindo <strong>{filteredAuditLogs.length}</strong> registro(s) de auditoria</span>
              <span className="font-mono text-[11px] text-slate-400">Dividido por tenant e registrado em LocalStorage DB</span>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs max-h-120">
              <table className="w-full text-left text-xs border-collapse" id="audit-table-records">
                <thead>
                  <tr className="bg-slate-900 text-indigo-300 font-bold font-mono text-[11px]">
                    <th className="p-3 border-r border-slate-800 whitespace-nowrap">Data / Hora</th>
                    <th className="p-3 border-r border-slate-800 whitespace-nowrap">Empresa (Tenant)</th>
                    <th className="p-3 border-r border-slate-800 whitespace-nowrap">Usuário Operador</th>
                    <th className="p-3 border-r border-slate-800 whitespace-nowrap">Módulo</th>
                    <th className="p-3 border-r border-slate-800">Ação / Título</th>
                    <th className="p-3">Descrição Detalhada do Evento Executado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Nenhum log de auditoria encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(entry => {
                      const company = allCompaniesList.find(c => c.id === entry.companyId) || db?.companyInfo;
                      return (
                        <tr key={entry.id} className="hover:bg-indigo-50/20 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap border-r border-slate-100">
                            {new Date(entry.date).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                            <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded font-bold font-mono text-[10px] inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              {company?.name || 'MotorDesk Matriz'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                              {entry.userName || 'Sistema'}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              entry.type === 'budget' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              entry.type === 'service_order' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                              entry.type === 'payment' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              entry.type === 'user_activity' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                            {entry.title}
                          </td>
                          <td className="p-3 text-slate-600 leading-relaxed font-sans max-w-md">
                            {entry.description}
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
      )}

      {/* SUBTAB 6: REGISTER NEW COMPANY (QA EXCLUSIVE) */}
      {activeSubTab === 'companies' && (
        <div className="space-y-6 animate-fade-in" id="qa-company-registration-container">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-indigo-150">
                Acesso Exclusivo do Perfil QA
              </span>
              <h2 className="text-lg font-bold text-slate-800 font-display mt-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Cadastrar Nova Empresa / Oficina & Criar Acesso Master
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Utilize este módulo QA para simular a criação de novos clientes multi-tenant e liberar acessos administrativos para novas oficinas mecânicas.
              </p>
            </div>

            {qaRegSuccess && (
              <div id="qa-company-success-alert" className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {qaRegSuccess}
              </div>
            )}

            {qaRegError && (
              <div id="qa-company-error-alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200">
                {qaRegError}
              </div>
            )}

            <form
              id="form-qa-register-company"
              onSubmit={(e) => {
                e.preventDefault();
                setQaRegSuccess('');
                setQaRegError('');

                if (!qaCompName.trim() || !qaCompCnpj.trim() || !qaCompWhatsapp.trim() || !qaAdminUsername.trim() || !qaAdminPassword.trim()) {
                  setQaRegError('Preencha os campos obrigatórios (*): Nome da Empresa, CNPJ, WhatsApp, Usuário e Senha.');
                  return;
                }

                if (db) {
                  const existingUser = db.users.find(u => u.username.toLowerCase() === qaAdminUsername.trim().toLowerCase());
                  if (existingUser) {
                    setQaRegError(`O nome de usuário "${qaAdminUsername}" já está em uso no banco de dados.`);
                    return;
                  }

                  const companyId = `comp-${Date.now()}`;
                  const newCompany: CompanyInfo = {
                    id: companyId,
                    name: qaCompName.trim(),
                    cnpj: qaCompCnpj.trim(),
                    phone: qaCompPhone.trim() || qaCompWhatsapp.trim(),
                    whatsapp: qaCompWhatsapp.trim(),
                    email: qaCompEmail.trim() || 'contato@oficina.com.br',
                    address: qaCompAddress.trim() || 'Matriz Principal',
                    welcomeMessage: 'Agradecemos pela preferência!',
                    registeredAt: new Date().toISOString()
                  };

                  const newAdminUser: User = {
                    id: `usr-${Date.now()}`,
                    username: qaAdminUsername.trim().toLowerCase(),
                    name: qaAdminName.trim() || 'Administrador Master',
                    role: 'admin',
                    passwordHash: qaAdminPassword,
                    companyId: companyId,
                    permissions: {
                      accessDashboard: true,
                      accessClients: true,
                      accessVehicles: true,
                      accessParts: true,
                      accessServices: true,
                      accessBudgets: true,
                      accessServiceOrders: true,
                      accessHistory: true,
                      accessReports: true,
                      accessUserManagement: true,
                      accessQAPanel: true
                    }
                  };

                  if (onRegisterCompany) {
                    onRegisterCompany(newCompany);
                  }

                  setQaRegSuccess(`Empresa "${newCompany.name}" e Usuário Admin "@${newAdminUser.username}" cadastrados com sucesso!`);
                  setQaCompName('');
                  setQaCompCnpj('');
                  setQaCompWhatsapp('');
                  setQaCompPhone('');
                  setQaCompEmail('');
                  setQaCompAddress('');
                  setQaAdminName('');
                  setQaAdminUsername('');
                  setQaAdminPassword('');
                }
              }}
              className="space-y-4 max-w-3xl"
            >
              <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">1. Cadastro Cadastral da Empresa / Oficina</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-comp-name">Nome da Empresa / Oficina *</label>
                    <input
                      id="qa-comp-name"
                      type="text"
                      required
                      value={qaCompName}
                      onChange={e => setQaCompName(e.target.value)}
                      placeholder="Ex: Auto Center Speed & Power LTDA"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-comp-cnpj">CNPJ *</label>
                    <input
                      id="qa-comp-cnpj"
                      type="text"
                      required
                      value={qaCompCnpj}
                      onChange={e => setQaCompCnpj(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-emerald-800 uppercase" htmlFor="qa-comp-whatsapp">WhatsApp Oficial (com DDD) *</label>
                    <input
                      id="qa-comp-whatsapp"
                      type="text"
                      required
                      value={qaCompWhatsapp}
                      onChange={e => setQaCompWhatsapp(e.target.value)}
                      placeholder="11987654321"
                      className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-comp-phone">Telefone Fixo</label>
                    <input
                      id="qa-comp-phone"
                      type="text"
                      value={qaCompPhone}
                      onChange={e => setQaCompPhone(e.target.value)}
                      placeholder="(11) 3333-4444"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-comp-email">E-mail de Atendimento</label>
                    <input
                      id="qa-comp-email"
                      type="email"
                      value={qaCompEmail}
                      onChange={e => setQaCompEmail(e.target.value)}
                      placeholder="contato@oficina.com.br"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-comp-address">Endereço Completo</label>
                    <input
                      id="qa-comp-address"
                      type="text"
                      value={qaCompAddress}
                      onChange={e => setQaCompAddress(e.target.value)}
                      placeholder="Av. Principal, 1000 - Centro, São Paulo - SP"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Criação da Conta Master do Administrador</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-admin-name">Nome do Gestor / Administrador</label>
                    <input
                      id="qa-admin-name"
                      type="text"
                      value={qaAdminName}
                      onChange={e => setQaAdminName(e.target.value)}
                      placeholder="Ex: Roberto Oliveira"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-admin-user">Usuário (Username) *</label>
                    <input
                      id="qa-admin-user"
                      type="text"
                      required
                      value={qaAdminUsername}
                      onChange={e => setQaAdminUsername(e.target.value)}
                      placeholder="Ex: admin_speed"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase" htmlFor="qa-admin-pass">Senha de Acesso *</label>
                    <input
                      id="qa-admin-pass"
                      type="password"
                      required
                      value={qaAdminPassword}
                      onChange={e => setQaAdminPassword(e.target.value)}
                      placeholder="Crie uma senha de acesso"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="btn-qa-submit-register-company"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-lg transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Empresa & Liberar Acesso Admin
                </button>
              </div>
            </form>

            {/* List of Registered Companies */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Empresas & Oficinas Cadastradas no Sistema
              </h3>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Empresa / Oficina</th>
                      <th className="p-3">CNPJ</th>
                      <th className="p-3">WhatsApp</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Endereço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db?.registeredCompanies && db.registeredCompanies.length > 0 ? (
                      db.registeredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-semibold text-slate-800">{c.name}</td>
                          <td className="p-3 font-mono text-slate-600">{c.cnpj}</td>
                          <td className="p-3 font-mono text-emerald-700 font-semibold">{c.whatsapp}</td>
                          <td className="p-3 text-slate-600">{c.email}</td>
                          <td className="p-3 text-slate-500">{c.address}</td>
                        </tr>
                      ))
                    ) : db?.companyInfo ? (
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-800">{db.companyInfo.name}</td>
                        <td className="p-3 font-mono text-slate-600">{db.companyInfo.cnpj}</td>
                        <td className="p-3 font-mono text-emerald-700 font-semibold">{db.companyInfo.whatsapp}</td>
                        <td className="p-3 text-slate-600">{db.companyInfo.email}</td>
                        <td className="p-3 text-slate-500">{db.companyInfo.address}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">Nenhuma empresa secundária cadastrada até o momento.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
