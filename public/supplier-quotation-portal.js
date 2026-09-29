/**
 * MotorDesk - Portal Público de Cotação para Fornecedores & Vendedores
 * 
 * Permite que vendedores de fornecedores externos acessem o link da cotação
 * gerado pelo departamento de compras, preencham preços unitários, marcas,
 * prazos de entrega e condições comerciais, e devolvam a proposta com 1 clique.
 * O departamento de compras recebe notificação imediata em tempo real.
 */
(function() {
  'use strict';

  function checkIsSupplierPortal() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isPortal = urlParams.get('portal') === 'cotacao' || 
                       urlParams.get('view') === 'supplier_quotation' ||
                       urlParams.get('view') === 'fornecedor';
      const quotId = urlParams.get('id') || urlParams.get('token') || urlParams.get('cotacao');
      
      const hash = window.location.hash || '';
      const isHashPortal = hash.includes('portal-cotacao') || hash.includes('cotacao-fornecedor');
      
      if (isPortal || isHashPortal || (quotId && (quotId.startsWith('cot-') || quotId.startsWith('COT-')) && !localStorage.getItem('motordesk_active_user'))) {
        return quotId || (urlParams.get('id') || 'cot-1');
      }
    } catch(e) {}
    return null;
  }

  const activeQuotationId = checkIsSupplierPortal();
  if (!activeQuotationId) {
    return; // Não é a rota do portal do fornecedor, segue fluxo normal do ERP
  }

  console.log('[MotorDesk Supplier Portal] Inicializando portal de cotação para:', activeQuotationId);

  // Interceptar renderização para carregar tela exclusiva do fornecedor
  window.__isSupplierPortalActive = true;

  document.addEventListener('DOMContentLoaded', initPortal);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initPortal();
  }

  async function initPortal() {
    const root = document.getElementById('root');
    if (!root) {
      setTimeout(initPortal, 50);
      return;
    }

    // Criar container isolado com reset limpo
    root.innerHTML = `
      <div id="supplier-portal-app" style="min-height: 100vh; background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px 16px;">
        <div style="max-width: 900px; margin: 0 auto; text-align: center; padding: 60px 20px;">
          <div style="width: 48px; height: 48px; border: 3px solid #38bdf8; border-top-color: transparent; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
          <h2 style="font-size: 20px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">Carregando Solicitação de Cotação...</h2>
          <p style="font-size: 13px; color: #94a3b8;">Conectando com o departamento de compras da empresa contratante...</p>
        </div>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;

    try {
      const res = await fetch(`/api/public/quotations/${encodeURIComponent(activeQuotationId)}`);
      if (!res.ok) {
        throw new Error('Cotação não encontrada ou link expirado.');
      }
      const data = await res.json();
      if (!data || !data.quotation) {
        throw new Error('Dados da cotação indisponíveis.');
      }
      renderPortalUI(data.quotation);
    } catch (err) {
      renderErrorUI(err.message || 'Falha ao carregar cotação.');
    }
  }

  function renderErrorUI(errorMsg) {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = `
      <div style="min-height: 100vh; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="max-width: 500px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px;">
            ⚠️
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #f87171; margin-bottom: 10px;">Link de Cotação Inacessível</h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">${errorMsg}</p>
          <div style="padding: 14px; background: #0f172a; border-radius: 12px; font-size: 12px; color: #94a3b8; text-align: left; margin-bottom: 20px;">
            • Verifique se o código ou link da cotação está correto.<br>
            • Entre em contato com o departamento de compras da oficina/empresa para solicitar um novo link.
          </div>
          <a href="/" style="display: inline-block; padding: 12px 24px; background: #3b82f6; hover: background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700;">
            Ir para a Página Inicial
          </a>
        </div>
      </div>
    `;
  }

  function renderPortalUI(quotation) {
    const root = document.getElementById('root');
    if (!root) return;

    const companyName = quotation.companyName || 'Empresa Contratante';
    const companyCnpj = quotation.companyCnpj ? `CNPJ: ${quotation.companyCnpj}` : '';
    const companyPhone = quotation.companyPhone ? `Tel/WhatsApp: ${quotation.companyPhone}` : '';
    const code = quotation.code || 'COT-000';
    const supplierName = quotation.supplierName || 'Fornecedor';
    const dateFormatted = quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    const items = quotation.items || [];
    const isAlreadyReplied = quotation.status === 'supplier_replied' || quotation.status === 'responded';

    const companySite = `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`;

    root.innerHTML = `
      <div id="supplier-portal-wrapper" style="min-height: 100vh; background: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px 16px;">
        <div style="max-width: 960px; margin: 0 auto; padding-bottom: 60px;">
          
          <!-- Top Header com Dados da Empresa Contratante -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <img src="/motordesk_logo.png" alt="Logo" style="width: 52px; height: 52px; object-contain: fit; background: #020617; border: 1px solid #475569; border-radius: 12px; padding: 4px;" onerror="this.src='/favicon.svg'" />
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 6px;">Empresa Solicitante</span>
                    <span style="font-size: 11px; color: #94a3b8;">${companyCnpj}</span>
                  </div>
                  <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0 2px;">${companyName}</h1>
                  <p style="font-size: 12px; color: #94a3b8; margin: 0;">${companyPhone}</p>
                </div>
              </div>
              <div>
                <a href="${companySite}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; border-radius: 10px; color: #60a5fa; text-decoration: none; font-size: 12px; font-weight: 700; transition: all 0.2s;">
                  🌐 Link da Empresa Contratante ↗
                </a>
              </div>
            </div>
          </div>

          <!-- Banner da Cotação -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 16px;">
              <div>
                <span style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Solicitação de Cotação de Preços</span>
                <h2 style="font-size: 24px; font-weight: 900; color: #ffffff; margin: 4px 0;">Código: <span style="color: #facc15;">#${code}</span></h2>
                <p style="font-size: 13px; color: #cbd5e1; margin: 0;">Destinatário: <strong>${supplierName}</strong> • Emissão: ${dateFormatted}</p>
              </div>
              <div>
                ${isAlreadyReplied ? `
                  <div style="padding: 8px 16px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 12px; color: #34d399; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                    <span>✓</span> Cotação Já Respondida
                  </div>
                ` : `
                  <div style="padding: 8px 16px; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 12px; color: #fbbf24; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                    <span>⏱</span> Aguardando Preenchimento do Vendedor
                  </div>
                `}
              </div>
            </div>

            ${quotation.notes ? `
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">
                <strong style="color: #94a3b8;">Observações do Comprador:</strong> ${quotation.notes}
              </div>
            ` : ''}

            ${quotation.paymentTerms ? `
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                Condição de Pagamento Pretendida pela Oficina: <strong style="color: #e2e8f0;">${quotation.paymentTerms}</strong>
              </div>
            ` : ''}
          </div>

          <!-- Tabela de Itens para Cotação -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0; display: flex; align-items: center; gap: 8px;">
                <span>📦</span> Itens Solicitados (${items.length})
              </h3>
              <span style="font-size: 12px; color: #94a3b8;">Preencha o preço unitário e marca de cada item</span>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px; font-size: 13px;">
                <thead>
                  <tr style="color: #94a3b8; text-align: left; font-size: 11px; text-transform: uppercase;">
                    <th style="padding: 8px 12px;">Item / Peça</th>
                    <th style="padding: 8px 12px; text-align: center;">Qtd Solicitada</th>
                    <th style="padding: 8px 12px; width: 140px;">Preço Unitário (R$)*</th>
                    <th style="padding: 8px 12px; width: 130px;">Marca / Fabricante</th>
                    <th style="padding: 8px 12px; width: 110px;">Prazo (Dias)</th>
                    <th style="padding: 8px 12px; text-align: right; width: 110px;">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody id="quotation-items-tbody">
                  ${items.map((it, idx) => {
                    const price = it.currentPrice || it.unitPrice || '';
                    const brand = it.brand || '';
                    const days = it.deliveryDays || quotation.deliveryDays || 2;
                    const subtotal = (Number(price) || 0) * (it.quantity || 1);
                    return `
                      <tr style="background: #0f172a; border-radius: 10px;" data-item-id="${it.id || it.partId || idx}">
                        <td style="padding: 12px; border-top-left-radius: 10px; border-bottom-left-radius: 10px;">
                          <div style="font-weight: 700; color: #ffffff;">${it.name || it.partName || 'Peça Sem Nome'}</div>
                          <div style="font-size: 11px; color: #64748b; font-family: monospace;">Cód: ${it.code || it.partCode || 'N/D'}</div>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                          <span style="font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3);">
                            ${it.quantity} ${it.unit || it.packageUnit || 'UN'}
                          </span>
                        </td>
                        <td style="padding: 12px;">
                          <div style="position: relative;">
                            <span style="position: absolute; left: 10px; top: 9px; font-size: 11px; color: #94a3b8; font-weight: 700;">R$</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              placeholder="0,00" 
                              value="${price}" 
                              data-price-input="${idx}"
                              data-qty="${it.quantity || 1}"
                              style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #facc15; font-weight: 800; font-size: 14px; padding: 8px 10px 8px 30px; font-family: monospace;"
                              required
                            />
                          </div>
                        </td>
                        <td style="padding: 12px;">
                          <input 
                            type="text" 
                            placeholder="Ex: Fras-le, Bosch" 
                            value="${brand}" 
                            data-brand-input="${idx}"
                            style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #ffffff; font-size: 12px; padding: 8px 10px;"
                          />
                        </td>
                        <td style="padding: 12px;">
                          <input 
                            type="number" 
                            min="0" 
                            max="60" 
                            placeholder="Dias" 
                            value="${days}" 
                            data-days-input="${idx}"
                            style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: #ffffff; font-size: 12px; padding: 8px 10px; text-align: center;"
                          />
                        </td>
                        <td style="padding: 12px; text-align: right; border-top-right-radius: 10px; border-bottom-right-radius: 10px;">
                          <span style="font-weight: 900; color: #10b981; font-family: monospace; font-size: 14px;" data-subtotal="${idx}">
                            R$ ${subtotal.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Total Quoted Card -->
            <div style="background: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 18px 24px; margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
              <div>
                <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Valor Total Ofertado (Proposta):</span>
                <p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">Soma automática dos itens com base nas quantidades solicitadas</p>
              </div>
              <div style="font-size: 26px; font-weight: 900; color: #34d399; font-family: monospace;" id="portal-grand-total">
                R$ 0,00
              </div>
            </div>
          </div>

          <!-- Formulário do Vendedor / Condições Comerciais -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0 0 16px; display: flex; align-items: center; gap: 8px;">
              <span>👤</span> Dados do Vendedor & Condições Comerciais
            </h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">Nome do Vendedor / Representante *</label>
                <input 
                  type="text" 
                  id="portal-seller-name" 
                  placeholder="Ex: Roberto Silva" 
                  value="${quotation.supplierRespondent?.name || ''}"
                  style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 10px; color: #ffffff; padding: 10px 14px; font-size: 13px;"
                  required
                />
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">WhatsApp / Telefone de Contato *</label>
                <input 
                  type="text" 
                  id="portal-seller-phone" 
                  placeholder="(11) 99999-8888" 
                  value="${quotation.supplierRespondent?.contact || ''}"
                  style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 10px; color: #ffffff; padding: 10px 14px; font-size: 13px;"
                  required
                />
              </div>

              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">Condição de Pagamento Oferecida</label>
                <input 
                  type="text" 
                  id="portal-payment-terms" 
                  placeholder="Ex: 28 DDL Boleto, À vista c/ desconto" 
                  value="${quotation.paymentTerms || '28 DDL Boleto Bancário'}"
                  style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 10px; color: #ffffff; padding: 10px 14px; font-size: 13px;"
                />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">Observações da Proposta / Disponibilidade de Estoque</label>
              <textarea 
                id="portal-supplier-notes" 
                rows="3" 
                placeholder="Ex: Peças pronta entrega para faturamento imediato. Desconto adicional para pagamento via PIX."
                style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 10px; color: #ffffff; padding: 10px 14px; font-size: 13px; font-family: sans-serif; resize: vertical;"
              >${quotation.supplierNotes || ''}</textarea>
            </div>
          </div>

          <!-- Botão de Envio Principal -->
          <div style="text-align: center; margin-bottom: 32px;">
            <button 
              type="button" 
              id="btn-submit-quotation-reply"
              style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4); display: inline-flex; align-items: center; gap: 10px; transition: transform 0.15s, box-shadow 0.15s;"
            >
              <span>🚀</span> Enviar Cotação Preenchida p/ Departamento de Compras
            </button>
            <p style="font-size: 11px; color: #64748b; margin-top: 10px;">
              Ao clicar, os preços serão salvos e a equipe de compras de <strong>${companyName}</strong> receberá um alerta imediato em tempo real.
            </p>
          </div>

          <!-- Rodapé com Mini Propaganda MotorDesk -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 16px; padding: 20px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
              <img src="/motordesk_logo.png" alt="MotorDesk" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.src='/favicon.svg'" />
              <span style="font-size: 13px; font-weight: 800; color: #e2e8f0;">MotorDesk Workshop ERP</span>
              <span style="font-size: 10px; background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Tecnologia Automotiva</span>
            </div>
            <p style="font-size: 11px; color: #64748b; max-width: 600px; margin: 0 auto 12px; line-height: 1.5;">
              O ERP mais completo do Brasil para gestão de centros automotivos, oficinas mecânicas e autopeças. Ordens de serviço, emissão fiscal SEFAZ, compras integradas e orçamentos em tempo real.
            </p>
            <a href="/" target="_blank" style="font-size: 11px; color: #38bdf8; text-decoration: none; font-weight: 700;">
              Conheça a Plataforma MotorDesk ↗
            </a>
          </div>

        </div>
      </div>
    `;

    // Setup de eventos e cálculos dinâmicos
    setupDynamicCalculations(items);
    setupSubmitHandler(quotation);
  }

  function setupDynamicCalculations(items) {
    function recalc() {
      let total = 0;
      items.forEach((it, idx) => {
        const inputPrice = document.querySelector(`[data-price-input="${idx}"]`);
        const subtotalEl = document.querySelector(`[data-subtotal="${idx}"]`);
        const price = Number(inputPrice?.value) || 0;
        const qty = it.quantity || 1;
        const itemTotal = price * qty;
        total += itemTotal;
        if (subtotalEl) {
          subtotalEl.innerText = `R$ ${itemTotal.toFixed(2)}`;
        }
      });
      const grandTotalEl = document.getElementById('portal-grand-total');
      if (grandTotalEl) {
        grandTotalEl.innerText = `R$ ${total.toFixed(2)}`;
      }
    }

    const priceInputs = document.querySelectorAll('[data-price-input]');
    priceInputs.forEach(inp => {
      inp.addEventListener('input', recalc);
      inp.addEventListener('change', recalc);
    });

    recalc(); // Cálculo inicial
  }

  function setupSubmitHandler(quotation) {
    const btn = document.getElementById('btn-submit-quotation-reply');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const sellerName = (document.getElementById('portal-seller-name')?.value || '').trim();
      const sellerPhone = (document.getElementById('portal-seller-phone')?.value || '').trim();
      const paymentTerms = (document.getElementById('portal-payment-terms')?.value || '').trim();
      const supplierNotes = (document.getElementById('portal-supplier-notes')?.value || '').trim();

      if (!sellerName) {
        alert('Por favor, informe o Nome do Vendedor / Representante.');
        document.getElementById('portal-seller-name')?.focus();
        return;
      }

      if (!sellerPhone) {
        alert('Por favor, informe o WhatsApp / Telefone de Contato.');
        document.getElementById('portal-seller-phone')?.focus();
        return;
      }

      // Coletar itens
      const collectedItems = (quotation.items || []).map((it, idx) => {
        const pInput = document.querySelector(`[data-price-input="${idx}"]`);
        const bInput = document.querySelector(`[data-brand-input="${idx}"]`);
        const dInput = document.querySelector(`[data-days-input="${idx}"]`);
        return {
          id: it.id || it.partId || `item-${idx}`,
          partId: it.partId,
          code: it.code || it.partCode,
          name: it.name || it.partName,
          quantity: it.quantity || 1,
          unitPrice: Number(pInput?.value) || 0,
          brand: (bInput?.value || '').trim(),
          deliveryDays: Number(dInput?.value) || 2,
          notes: ''
        };
      });

      // Validação: ao menos 1 item com preço
      const hasPrice = collectedItems.some(it => it.unitPrice > 0);
      if (!hasPrice) {
        if (!confirm('Atenção: Nenhum preço unitário foi preenchido. Deseja enviar a cotação zerada?')) {
          return;
        }
      }

      btn.disabled = true;
      btn.style.opacity = '0.7';
      btn.innerHTML = '<span>⏳</span> Enviando proposta para a empresa...';

      try {
        const payload = {
          supplierName: quotation.supplierName,
          supplierContact: `${sellerName} - ${sellerPhone}`,
          deliveryDays: collectedItems[0]?.deliveryDays || 2,
          paymentTerms: paymentTerms,
          supplierNotes: supplierNotes,
          items: collectedItems
        };

        const res = await fetch(`/api/public/quotations/${encodeURIComponent(quotation.id)}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error('Falha ao registrar resposta no servidor.');
        }

        const data = await res.json();
        renderSuccessUI(quotation, sellerName, data.totalAmount || 0);
      } catch (err) {
        alert('Erro ao enviar cotação: ' + (err.message || 'Tente novamente.'));
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = '<span>🚀</span> Enviar Cotação Preenchida p/ Departamento de Compras';
      }
    });
  }

  function renderSuccessUI(quotation, sellerName, total) {
    const root = document.getElementById('root');
    if (!root) return;

    const companyName = quotation.companyName || 'Empresa Contratante';

    root.innerHTML = `
      <div style="min-height: 100vh; background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: 24px 16px;">
        <div style="max-width: 600px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);">
          
          <div style="width: 72px; height: 72px; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; color: #10b981;">
            ✓
          </div>

          <h2 style="font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 8px;">Cotação Enviada com Sucesso!</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
            Muito obrigado, <strong>${sellerName}</strong>! Sua proposta para a Cotação <strong style="color: #facc15;">#${quotation.code}</strong> foi transmitida com sucesso para o departamento de compras de <strong>${companyName}</strong>.
          </p>

          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 20px; text-align: left; margin-bottom: 28px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #94a3b8;">Cotação:</span>
              <strong style="color: #ffffff;">#${quotation.code}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #94a3b8;">Empresa Solicitante:</span>
              <strong style="color: #ffffff;">${companyName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #94a3b8;">Status:</span>
              <strong style="color: #34d399;">Respondida (Notificação Emitida)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #334155; pt-2; margin-top: 8px; font-size: 14px;">
              <span style="color: #94a3b8; font-weight: 700;">Total da Proposta:</span>
              <strong style="color: #facc15; font-family: monospace;">R$ ${Number(total).toFixed(2)}</strong>
            </div>
          </div>

          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 24px;">
            <button onclick="window.print()" style="padding: 12px 20px; background: #334155; color: #ffffff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;">
              🖨 Imprimir Comprovante
            </button>
            <a href="/" style="padding: 12px 20px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700; display: inline-block;">
              Página Principal
            </a>
          </div>

          <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 11px; color: #64748b;">
            MotorDesk Workshop Management • Portal Integrado de Compras B2B
          </div>

        </div>
      </div>
    `;
  }
})();
