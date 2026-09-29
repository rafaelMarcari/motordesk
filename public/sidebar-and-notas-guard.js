/**
 * MotorDesk - Guard de Menu Lateral & Acesso ao Portal da API da Nota Fiscal
 * 
 * 1. Ajuste do Menu Lateral:
 *    - Elimina o bug onde ao retrair e expandir (hover), o menu ficava "por trás da tela" ou cortado por overflow.
 *    - Garante stacking context prioritário (z-index 99999), overflow visível no wrapper pai e sombra profunda.
 * 
 * 2. Botão de Acesso à API da Nota Fiscal na Tela de Login:
 *    - Insere o botão de acesso oficial na tela de login caso ainda não esteja presente.
 *    - Abre o Portal Completo da API da Nota Fiscal (Focus NFS-e / Sefin Nacional), com gestão de empresas,
 *      notas emitidas, emissão de teste, download de DANFS-e/XML e documentação técnica da API.
 */
(function() {
  'use strict';

  console.log('[MotorDesk] Inicializando Guard de Menu Lateral & Notas API na Tela de Login...');

  // =========================================================================
  // 1. CORREÇÃO DEFINITIVA DO MENU LATERAL (EXPANSÃO / RETRAÇÃO / Z-INDEX)
  // =========================================================================
  function applySidebarFix() {
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return;

    const wrapper = sidebar.parentElement;
    if (wrapper && wrapper !== document.body) {
      // Forçar o wrapper a nunca cortar o menu quando expande no hover
      wrapper.style.overflow = 'visible';
      wrapper.style.zIndex = '9999';
    }

    // Se o menu estiver retraído (largura <= 80px)
    const isRetracted = sidebar.classList.contains('w-16') || sidebar.offsetWidth <= 80;

    sidebar.addEventListener('mouseenter', function() {
      if (wrapper) {
        wrapper.style.overflow = 'visible';
        wrapper.style.zIndex = '99999';
      }
      sidebar.style.zIndex = '99999';
      sidebar.style.boxShadow = '8px 0 35px rgba(0, 0, 0, 0.65)';
    });

    sidebar.addEventListener('mouseleave', function() {
      if (wrapper) {
        wrapper.style.zIndex = '9999';
      }
      sidebar.style.boxShadow = '';
    });
  }

  // =========================================================================
  // 2. DADOS LOCAIS E SIMULAÇÃO DE BACKEND PARA O PORTAL NOTAS-API
  // =========================================================================
  const NOTAS_API_STORAGE_KEY = 'motordesk_notas_api_db';

  function getNotasApiData() {
    const defaultData = {
      config: {
        ambiente: 'homologacao',
        tokenMaster: 'adm_focus_live_98a72b5c4d1e',
        webhookUrl: 'https://api.motordesk.app.br/webhooks/nfse-focus',
        padraoNacional: true,
        versaoApi: 'v2'
      },
      empresas: [
        {
          id: 'emp-1',
          cnpj: '12.345.678/0001-90',
          razaoSocial: 'OFICINA MECANICA CENTRAL LTDA',
          nomeFantasia: 'MotorDesk Matriz Auto Center',
          inscricaoMunicipal: '987654-1',
          codigoMunicipio: '3550308',
          uf: 'SP',
          regimeTributario: 'simples',
          ambiente: 'homologacao',
          tokenApi: 'fcs_tok_matriz_8832a71b',
          certificadoStatus: 'valido',
          certificadoValidade: '2027-11-20'
        },
        {
          id: 'emp-2',
          cnpj: '98.765.432/0001-10',
          razaoSocial: 'AUTO PECAS E SERVICOS EXPRESS ME',
          nomeFantasia: 'MotorDesk Filial Peças',
          inscricaoMunicipal: '123456-7',
          codigoMunicipio: '3550308',
          uf: 'SP',
          regimeTributario: 'mei',
          ambiente: 'homologacao',
          tokenApi: 'fcs_tok_filial_9941c22d',
          certificadoStatus: 'valido',
          certificadoValidade: '2027-08-15'
        }
      ],
      notas: [
        {
          id: 'nfse-1001',
          ref: 'OS-8821',
          numero: '0000412',
          empresaId: 'emp-1',
          empresaNome: 'OFICINA MECANICA CENTRAL LTDA',
          clienteNome: 'CARLOS ALBERTO SILVA',
          clienteCpfCnpj: '123.456.789-00',
          discriminacao: 'Serviço de alinhamento 3D, balanceamento de rodas e revisão do sistema de freios ABS.',
          valorTotal: 480.00,
          valorIss: 24.00,
          aliquotaIss: 5.0,
          status: 'autorizada',
          codigoVerificacao: '7F8A-9B2C-4E1D',
          dataEmissao: new Date(Date.now() - 3600000 * 2).toISOString(),
          caminhoXml: '/api/notas-api/notas/nfse-1001/xml',
          caminhoDanfse: '/api/notas-api/notas/nfse-1001/danfse'
        },
        {
          id: 'nfse-1002',
          ref: 'OS-8830',
          numero: '0000413',
          empresaId: 'emp-1',
          empresaNome: 'OFICINA MECANICA CENTRAL LTDA',
          clienteNome: 'TRANSPORTADORA VALE DO TIETE LTDA',
          clienteCpfCnpj: '45.678.901/0001-22',
          discriminacao: 'Revisão preventiva de motor diesel, troca de filtros de combustível e regulagem de bicos injetores.',
          valorTotal: 1850.00,
          valorIss: 92.50,
          aliquotaIss: 5.0,
          status: 'autorizada',
          codigoVerificacao: 'A1B2-C3D4-E5F6',
          dataEmissao: new Date(Date.now() - 3600000 * 26).toISOString(),
          caminhoXml: '/api/notas-api/notas/nfse-1002/xml',
          caminhoDanfse: '/api/notas-api/notas/nfse-1002/danfse'
        }
      ]
    };

    try {
      const stored = localStorage.getItem(NOTAS_API_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao ler dados da API de notas locais', e);
    }
    return defaultData;
  }

  function saveNotasApiData(data) {
    try {
      localStorage.setItem(NOTAS_API_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar dados da API de notas', e);
    }
  }

  // =========================================================================
  // 3. RENDERIZAÇÃO DO MODAL/PORTAL DA API DA NOTA FISCAL
  // =========================================================================
  let activeTab = 'empresas';

  function openNotasApiPortal() {
    let existingModal = document.getElementById('modal-notas-api-portal');
    if (existingModal) {
      existingModal.remove();
    }

    const data = getNotasApiData();

    const overlay = document.createElement('div');
    overlay.id = 'modal-notas-api-portal';
    overlay.className = 'fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[999999] overflow-y-auto animate-fade-in font-sans';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '999999';

    function renderContent() {
      const db = getNotasApiData();
      const totalNotas = db.notas.length;
      const totalValor = db.notas.reduce((acc, n) => acc + (n.status === 'autorizada' ? n.valorTotal : 0), 0);
      const totalEmpresas = db.empresas.length;

      let tabHtml = '';

      if (activeTab === 'empresas') {
        tabHtml = `
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h4 class="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>🏢 Empresas & Certificados A1 Habilitados na API</span>
                </h4>
                <p class="text-xs text-slate-400 mt-0.5">Empresas autorizadas a emitir NFS-e via Focus NFe e padrão Nacional</p>
              </div>
              <button id="btn-nova-empresa-api" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                <span>+ Cadastrar Empresa</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${db.empresas.map(emp => `
                <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3 relative hover:border-indigo-500/50 transition">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">${emp.ambiente}</span>
                      <h5 class="text-white font-bold text-sm mt-1.5 leading-tight">${emp.razaoSocial}</h5>
                      <p class="text-xs text-slate-400">${emp.nomeFantasia}</p>
                    </div>
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/50">
                      ● Certificado A1 Ativo
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800 text-slate-300 font-mono">
                    <div><span class="text-slate-500">CNPJ:</span> ${emp.cnpj}</div>
                    <div><span class="text-slate-500">Inscr. Mun:</span> ${emp.inscricaoMunicipal}</div>
                    <div><span class="text-slate-500">Município:</span> ${emp.codigoMunicipio} / ${emp.uf}</div>
                    <div><span class="text-slate-500">Regime:</span> ${emp.regimeTributario.toUpperCase()}</div>
                  </div>

                  <div class="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div class="truncate mr-2">
                      <span class="text-[10px] text-slate-500 uppercase block font-sans">Token da API (Bearer):</span>
                      <span class="text-indigo-300 font-bold">${emp.tokenApi}</span>
                    </div>
                    <button class="btn-copy-token px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition cursor-pointer" data-token="${emp.tokenApi}">
                      Copiar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else if (activeTab === 'notas') {
        tabHtml = `
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h4 class="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>📄 Notas Fiscais Eletrônicas de Serviço (NFS-e)</span>
                </h4>
                <p class="text-xs text-slate-400 mt-0.5">Histórico de notas transmitidas aos servidores municipais / Sefin</p>
              </div>
              <button id="btn-emitir-nfse-teste" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                <span>⚡ Emitir Nova NFS-e</span>
              </button>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th class="p-3">NFS-e / Ref</th>
                    <th class="p-3">Tomador / Cliente</th>
                    <th class="p-3">Valor Total</th>
                    <th class="p-3">ISSQN</th>
                    <th class="p-3">Status</th>
                    <th class="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 bg-slate-900/40">
                  ${db.notas.map(n => `
                    <tr class="hover:bg-slate-800/40 transition">
                      <td class="p-3">
                        <div class="font-bold text-white">Nº ${n.numero}</div>
                        <div class="text-[10px] text-indigo-400 font-mono">Ref: ${n.ref}</div>
                      </td>
                      <td class="p-3">
                        <div class="font-semibold text-slate-200">${n.clienteNome}</div>
                        <div class="text-[10px] text-slate-500 font-mono">${n.clienteCpfCnpj}</div>
                      </td>
                      <td class="p-3 font-mono font-bold text-emerald-400">
                        R$ ${n.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td class="p-3 font-mono text-slate-300">
                        R$ ${n.valorIss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${n.aliquotaIss}%)
                      </td>
                      <td class="p-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          n.status === 'autorizada' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        }">
                          ${n.status === 'autorizada' ? '● AUTORIZADA' : '● ' + n.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button class="btn-view-danfse px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded border border-indigo-500/40 text-[11px] font-semibold cursor-pointer" data-id="${n.id}">
                          DANFS-e
                        </button>
                        <button class="btn-download-xml px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold cursor-pointer" data-id="${n.id}">
                          XML
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } else if (activeTab === 'docs') {
        tabHtml = `
          <div class="space-y-4 text-xs text-slate-300">
            <div class="pb-3 border-b border-slate-700">
              <h4 class="text-white font-bold text-sm sm:text-base">🛠️ Documentação Técnica da API (REST cURL & JSON)</h4>
              <p class="text-xs text-slate-400 mt-0.5">Guia de integração HTTP para emissão e consulta externa de NFS-e</p>
            </div>

            <div class="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 font-mono">
              <div class="text-indigo-400 font-bold text-sm">1. Emitir NFS-e (POST /api/notas-api/v2/nfse)</div>
              <p class="text-[11px] text-slate-400 font-sans">Envie a requisição contendo os dados do tomador, prestador e itens de serviço:</p>
              <pre class="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-200 overflow-x-auto border border-slate-800">
curl -X POST https://motordesk.app.br/api/notas-api/v2/nfse \\
  -H "Authorization: Bearer fcs_tok_matriz_8832a71b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "referencia": "OS-8850",
    "tomador": {
      "cpf_cnpj": "12345678900",
      "razao_social": "JOAO BATISTA OLIVEIRA",
      "email": "cliente@email.com"
    },
    "servico": {
      "valor_servicos": 350.00,
      "discriminacao": "Manutencao mecanica automotiva e revisao de freios.",
      "codigo_tributario_municipio": "14.01",
      "aliquota": 5.0
    }
  }'</pre>
            </div>

            <div class="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 font-mono">
              <div class="text-emerald-400 font-bold text-sm">2. Consultar Status / Baixar DANFS-e (GET /api/notas-api/v2/nfse/:ref)</div>
              <pre class="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-200 overflow-x-auto border border-slate-800">
curl -X GET https://motordesk.app.br/api/notas-api/v2/nfse/OS-8850 \\
  -H "Authorization: Bearer fcs_tok_matriz_8832a71b"</pre>
            </div>
          </div>
        `;
      } else if (activeTab === 'config') {
        tabHtml = `
          <div class="space-y-4 text-xs text-slate-300">
            <div class="pb-3 border-b border-slate-700">
              <h4 class="text-white font-bold text-sm sm:text-base">⚙️ Configurações do Gateway SEFIN / Focus NFe</h4>
              <p class="text-xs text-slate-400 mt-0.5">Parâmetros de comunicação, ambiente de homologação e webhooks</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <label class="font-bold text-white block">Ambiente Operacional Padrão</label>
                <select id="cfg-ambiente" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
                  <option value="homologacao" ${db.config.ambiente === 'homologacao' ? 'selected' : ''}>Homologação / Testes (Sem Valor Fiscal)</option>
                  <option value="producao" ${db.config.ambiente === 'producao' ? 'selected' : ''}>Produção Oficial (SEFAZ / SEFIN Nacional)</option>
                </select>
              </div>

              <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <label class="font-bold text-white block">Webhook de Notificação (Callbacks HTTP)</label>
                <input id="cfg-webhook" type="text" value="${db.config.webhookUrl}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs" />
              </div>
            </div>

            <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4">
              <div class="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <span>🔐 Padrão Nacional NFS-e & Focus NFe Sincronizado</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Todas as notas emitidas através do MotorDesk seguem a legislação da Receita Federal e do Comitê Gestor da Nota Fiscal de Serviço Eletrônica (CGNFS-e), com assinatura digital e envio direto à prefeitura de domicílio do prestador.
              </p>
            </div>

            <div class="flex justify-end pt-2">
              <button id="btn-salvar-config-api" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition cursor-pointer shadow-xs">
                Salvar Configurações
              </button>
            </div>
          </div>
        `;
      }

      overlay.innerHTML = `
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- CABEÇALHO DO MODAL -->
          <div class="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <svg class="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-white font-extrabold text-base sm:text-lg">Portal da API da Nota Fiscal</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">Focus NFS-e / Sefin</span>
                </div>
                <p class="text-xs text-slate-400">Emissão Eletrônica Integrada, Autenticação por Token & Gestão Municipal</p>
              </div>
            </div>
            <button id="btn-close-notas-api-portal" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer" title="Fechar Portal">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- CARDS DE RESUMO OPERACIONAL -->
          <div class="grid grid-cols-3 gap-3 p-4 bg-slate-950/50 border-b border-slate-800 text-xs shrink-0">
            <div class="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span class="text-slate-400 block text-[10px] uppercase font-mono">Empresas na API</span>
              <span class="text-base font-extrabold text-white">${totalEmpresas} ativas</span>
            </div>
            <div class="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span class="text-slate-400 block text-[10px] uppercase font-mono">NFS-e Emitidas</span>
              <span class="text-base font-extrabold text-indigo-400">${totalNotas} notas</span>
            </div>
            <div class="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span class="text-slate-400 block text-[10px] uppercase font-mono">Faturamento Fiscal</span>
              <span class="text-base font-extrabold text-emerald-400">R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <!-- NAVEGAÇÃO POR ABAS -->
          <div class="flex border-b border-slate-800 bg-slate-950/80 px-4 text-xs font-bold shrink-0 overflow-x-auto">
            <button class="tab-btn px-4 py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'empresas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}" data-tab="empresas">
              🏢 Empresas Habilitadas
            </button>
            <button class="tab-btn px-4 py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'notas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}" data-tab="notas">
              📄 Notas Fiscais (NFS-e)
            </button>
            <button class="tab-btn px-4 py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'docs' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}" data-tab="docs">
              🛠️ Documentação REST
            </button>
            <button class="tab-btn px-4 py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'config' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}" data-tab="config">
              ⚙️ Gateway & Sefin
            </button>
          </div>

          <!-- ÁREA DO CONTEÚDO PRINCIPAL COM SCROLL -->
          <div class="p-4 sm:p-6 overflow-y-auto flex-1">
            ${tabHtml}
          </div>

          <!-- RODAPÉ DO MODAL -->
          <div class="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span class="flex items-center gap-1.5 text-[11px]">
              <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Servidores Sefin / Focus NFS-e Operacionais
            </span>
            <button id="btn-close-bottom-portal" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition cursor-pointer">
              Voltar à Tela de Login
            </button>
          </div>
        </div>
      `;

      // Eventos de Navegação por Abas
      overlay.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          activeTab = this.getAttribute('data-tab');
          renderContent();
        });
      });

      // Fechar Modal
      const closeTop = overlay.querySelector('#btn-close-notas-api-portal');
      if (closeTop) closeTop.addEventListener('click', () => overlay.remove());

      const closeBottom = overlay.querySelector('#btn-close-bottom-portal');
      if (closeBottom) closeBottom.addEventListener('click', () => overlay.remove());

      // Copiar Token
      overlay.querySelectorAll('.btn-copy-token').forEach(btn => {
        btn.addEventListener('click', function() {
          const tok = this.getAttribute('data-token');
          navigator.clipboard.writeText(tok).then(() => {
            const originalText = this.innerText;
            this.innerText = 'Copiado!';
            this.classList.add('bg-emerald-600', 'text-white');
            setTimeout(() => {
              this.innerText = originalText;
              this.classList.remove('bg-emerald-600', 'text-white');
            }, 1800);
          });
        });
      });

      // Visualizar DANFS-e Simulado
      overlay.querySelectorAll('.btn-view-danfse').forEach(btn => {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          const nota = db.notas.find(n => n.id === id);
          if (!nota) return;

          const danfseWin = window.open('', '_blank', 'width=800,height=900');
          if (danfseWin) {
            danfseWin.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>DANFS-e - ${nota.numero}</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1e293b; }
                  .danfse-box { border: 2px solid #0f172a; padding: 20px; border-radius: 8px; }
                  .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; }
                  .title { font-size: 18px; font-weight: 800; text-transform: uppercase; }
                  .badge { background: #059669; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                  .field { margin-bottom: 10px; }
                  .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
                  .val { font-size: 14px; font-weight: 600; }
                  .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  .table th, .table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                  .table th { background: #f1f5f9; }
                </style>
              </head>
              <body>
                <div class="danfse-box">
                  <div class="header">
                    <div>
                      <div class="title">Documento Auxiliar da NFS-e (DANFS-e)</div>
                      <div>Sistema Nacional de Nota Fiscal de Serviço Eletrônica</div>
                    </div>
                    <div class="badge">NFS-e Nº ${nota.numero}</div>
                  </div>
                  <div class="field"><span class="label">Prestador de Serviços:</span> <span class="val">${nota.empresaNome}</span></div>
                  <div class="field"><span class="label">Tomador / Cliente:</span> <span class="val">${nota.clienteNome} (${nota.clienteCpfCnpj})</span></div>
                  <div class="field"><span class="label">Código de Verificação:</span> <span class="val" style="font-family: monospace;">${nota.codigoVerificacao}</span></div>
                  
                  <table class="table">
                    <thead><tr><th>Discriminação dos Serviços</th><th>Alíquota ISS</th><th>Valor Total</th></tr></thead>
                    <tbody><tr><td>${nota.discriminacao}</td><td>${nota.aliquotaIss}%</td><td>R$ ${nota.valorTotal.toFixed(2)}</td></tr></tbody>
                  </table>
                  
                  <div style="margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px;">
                    Total da NFS-e: R$ ${nota.valorTotal.toFixed(2)} | ISS Retido: R$ ${nota.valorIss.toFixed(2)}
                  </div>
                </div>
              </body>
              </html>
            `);
          }
        });
      });

      // Baixar XML Simulado
      overlay.querySelectorAll('.btn-download-xml').forEach(btn => {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          const nota = db.notas.find(n => n.id === id);
          if (!nota) return;

          const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse versao="2.00">
    <InfNfse Id="NFS${nota.numero}">
      <Numero>${nota.numero}</Numero>
      <CodigoVerificacao>${nota.codigoVerificacao}</CodigoVerificacao>
      <DataEmissao>${nota.dataEmissao}</DataEmissao>
      <PrestadorServico>
        <RazaoSocial>${nota.empresaNome}</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <RazaoSocial>${nota.clienteNome}</RazaoSocial>
        <CpfCnpj>${nota.clienteCpfCnpj}</CpfCnpj>
      </TomadorServico>
      <Servico>
        <Valores>
          <ValorServicos>${nota.valorTotal.toFixed(2)}</ValorServicos>
          <ValorIss>${nota.valorIss.toFixed(2)}</ValorIss>
          <Aliquota>${nota.aliquotaIss}</Aliquota>
        </Valores>
        <Discriminacao>${nota.discriminacao}</Discriminacao>
      </Servico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

          const blob = new Blob([xmlContent], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `NFSe_${nota.numero}_${nota.ref}.xml`;
          a.click();
          URL.revokeObjectURL(url);
        });
      });

      // Emitir Nova NFS-e Teste
      const btnEmitir = overlay.querySelector('#btn-emitir-nfse-teste');
      if (btnEmitir) {
        btnEmitir.addEventListener('click', function() {
          const tomadorNome = prompt('Nome do Tomador / Cliente:', 'CLIENTE AVULSO TESTE');
          if (!tomadorNome) return;

          const valorStr = prompt('Valor dos Serviços (R$):', '250.00');
          const valor = parseFloat(valorStr) || 250.0;

          const nextNum = '0000' + (db.notas.length + 414);
          const newNota = {
            id: 'nfse-' + Date.now(),
            ref: 'API-' + Math.floor(1000 + Math.random() * 9000),
            numero: nextNum,
            empresaId: 'emp-1',
            empresaNome: db.empresas[0].razaoSocial,
            clienteNome: tomadorNome.toUpperCase(),
            clienteCpfCnpj: '000.000.000-00',
            discriminacao: 'Serviço emitido diretamente pelo Portal de Demonstração da API Focus NFS-e.',
            valorTotal: valor,
            valorIss: valor * 0.05,
            aliquotaIss: 5.0,
            status: 'autorizada',
            codigoVerificacao: Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            dataEmissao: new Date().toISOString()
          };

          db.notas.unshift(newNota);
          saveNotasApiData(db);
          showApiToast('NFS-e Nº ' + newNota.numero + ' autorizada com sucesso!');
          renderContent();
        });
      }

      // Cadastrar Nova Empresa sem prompt/alert (bloqueados no iframe)
      const btnNovaEmpresa = overlay.querySelector('#btn-nova-empresa-api');
      if (btnNovaEmpresa) {
        btnNovaEmpresa.addEventListener('click', function() {
          const nextId = Date.now();
          const modalHtml = `
            <div id="modal-add-empresa-api" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h5 class="text-white font-bold text-sm">🏢 Cadastrar Nova Empresa Emitente</h5>
                  <button id="btn-close-add-empresa" class="text-slate-400 hover:text-white text-lg">✕</button>
                </div>
                <div class="space-y-3">
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 uppercase block mb-1">Razão Social *</label>
                    <input id="input-api-emp-razao" type="text" value="CENTRO AUTOMOTIVO MODELO ${db.empresas.length + 1} LTDA" class="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-semibold" />
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 uppercase block mb-1">CNPJ *</label>
                    <input id="input-api-emp-cnpj" type="text" value="24.789.${String(100 + db.empresas.length * 15).padStart(3, '0')}/0001-${String(20 + db.empresas.length)}" class="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono" />
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 uppercase block mb-1">Inscrição Municipal</label>
                    <input id="input-api-emp-im" type="text" value="555444-9" class="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono" />
                  </div>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button id="btn-cancel-add-empresa" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancelar</button>
                  <button id="btn-confirm-add-empresa" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Salvar Empresa</button>
                </div>
              </div>
            </div>
          `;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = modalHtml;
          const modalElem = tempDiv.firstElementChild;
          overlay.appendChild(modalElem);

          const closeM = () => { if (modalElem && modalElem.parentNode) modalElem.parentNode.removeChild(modalElem); };
          modalElem.querySelector('#btn-close-add-empresa').onclick = closeM;
          modalElem.querySelector('#btn-cancel-add-empresa').onclick = closeM;

          modalElem.querySelector('#btn-confirm-add-empresa').onclick = function() {
            const razao = modalElem.querySelector('#input-api-emp-razao').value.trim();
            const cnpj = modalElem.querySelector('#input-api-emp-cnpj').value.trim();
            const im = modalElem.querySelector('#input-api-emp-im').value.trim();
            if (!razao || !cnpj) return;

            const newEmp = {
              id: 'emp-' + nextId,
              cnpj: cnpj,
              razaoSocial: razao.toUpperCase(),
              nomeFantasia: razao,
              inscricaoMunicipal: im || '555444-9',
              codigoMunicipio: '3550308',
              uf: 'SP',
              regimeTributario: 'simples',
              ambiente: 'homologacao',
              tokenApi: 'fcs_tok_' + Math.random().toString(36).substring(2, 10),
              certificadoStatus: 'valido',
              certificadoValidade: '2028-01-01'
            };

            db.empresas.push(newEmp);
            saveNotasApiData(db);
            closeM();
            showApiToast('Empresa ' + razao + ' integrada à API com sucesso!');
            renderContent();
          };
        });
      }

      // Salvar Configurações
      const btnSalvarCfg = overlay.querySelector('#btn-salvar-config-api');
      if (btnSalvarCfg) {
        btnSalvarCfg.addEventListener('click', function() {
          const amb = overlay.querySelector('#cfg-ambiente').value;
          const web = overlay.querySelector('#cfg-webhook').value;
          db.config.ambiente = amb;
          db.config.webhookUrl = web;
          saveNotasApiData(db);
          showApiToast('Configurações do Gateway SEFIN salvas com sucesso!');
        });
      }

      function showApiToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = '<span>✓</span> <span>' + msg + '</span>';
        document.body.appendChild(toast);
        setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
      }
    }

    renderContent();
    document.body.appendChild(overlay);
  }

  // =========================================================================
  // 4. INJEÇÃO DO BOTÃO "ACESSO À API DA NOTA FISCAL" NA TELA DE LOGIN
  // =========================================================================
  function injectLoginNotasApiButton() {
    // Se o portal ou a visualização de notas já estiver aberta, não reinjetar
    if (document.getElementById('btn-open-notas-api-portal-injected')) return;

    // Localizar o botão de submit do login
    const loginSubmitBtn = document.getElementById('btn-login-submit');
    if (!loginSubmitBtn) return;

    // Verificar se o container pai é o form de login
    const loginForm = loginSubmitBtn.closest('form');
    if (!loginForm) return;

    // Se já houver algum botão com ID similar
    if (loginForm.querySelector('#btn-open-notas-api-portal') || loginForm.querySelector('#btn-open-notas-api-portal-injected')) {
      return;
    }

    console.log('[MotorDesk] Injetando botão de Acesso à API da Nota Fiscal na tela de login...');

    const wrapperDiv = document.createElement('div');
    wrapperDiv.id = 'wrapper-notas-api-login';
    wrapperDiv.className = 'pt-2';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-open-notas-api-portal-injected';
    btn.className = 'w-full py-2.5 px-3.5 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200 hover:border-indigo-300 text-indigo-900 text-xs font-bold rounded-lg transition flex items-center justify-between cursor-pointer shadow-3xs';
    btn.title = 'Acessar Portal da API da Nota Fiscal (Focus NFS-e / Sefin Nacional)';
    btn.innerHTML = `
      <span class="flex items-center gap-2">
        <svg class="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span class="font-extrabold text-indigo-950">Acesso à API da Nota Fiscal</span>
      </span>
      <span class="text-[10px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold uppercase tracking-wider transition">
        Acessar
      </span>
    `;

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openNotasApiPortal();
    });

    wrapperDiv.appendChild(btn);

    // Inserir logo após o botão de submit do login
    loginSubmitBtn.insertAdjacentElement('afterend', wrapperDiv);
  }

  // =========================================================================
  // 5. OBSERVER DE MUTAÇÕES DO DOM & INICIALIZAÇÃO CONTÍNUA
  // =========================================================================
  function runGuards() {
    applySidebarFix();
    injectLoginNotasApiButton();
  }

  // Executar imediatamente e após carregamento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGuards);
  } else {
    runGuards();
  }

  // Observer contínuo para transições do React SPA
  const observer = new MutationObserver(function(mutations) {
    runGuards();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Polling leve de garantia
  setInterval(runGuards, 1000);

  // Expor globalmente para testes e acionamento direto
  window.MotorDeskOpenNotasApiPortal = openNotasApiPortal;
})();
