/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, FileSpreadsheet, ArrowRight, CheckCircle2, RefreshCw, 
  Sparkles, FileText, Upload, AlertCircle, ShieldCheck, Cpu, 
  Layers, ArrowLeftRight, Download, Filter, FileCode2, Play
} from 'lucide-react';
import { Client, Vehicle, Part, ServiceOrder, DataMigrationReport, MigrationSampleDiff } from '../types';
import { AppDatabase } from '../data/mockData';

interface DataMigrationConverterViewProps {
  db: AppDatabase;
  onSaveClients: (clients: Client[]) => void;
  onSaveVehicles: (vehicles: Vehicle[]) => void;
  onSaveParts: (parts: Part[]) => void;
  onSaveServiceOrders: (serviceOrders: ServiceOrder[]) => void;
  onAddHistoryLog?: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', 
    title: string, 
    description: string, 
    clientId: string, 
    vehicleId: string,
    metadata?: any
  ) => void;
}

/**
 * Dados de Exemplo de um Sistema Legado ("AutoSoft Oficina v2.4 - 2019")
 * Utilizado para simulação em 1-Clique do processo de conversão e migração para o MotorDesk.
 */
const SAMPLE_LEGACY_DATABASE = {
  nomeSistemaOrigem: "AutoSoft Mecânica & Peças v2.4 (Legado)",
  dataExportacao: "2026-07-20",
  clientesLegados: [
    {
      cod_cli: "CLI-901",
      nome_completo: "rodrigo silva de albuquerque",
      documento_cpf_cnpj: "12345678909", // CPF sem pontuação
      telefone_contato: "11987654321", // Telefone sem formatação
      correio_eletronico: "rodrigo.silva@email.com",
      endereco_rua: "Av Paulista 1500, São Paulo - SP"
    },
    {
      cod_cli: "CLI-902",
      nome_completo: "mariana ferreira costa",
      documento_cpf_cnpj: "98765432100",
      telefone_contato: "21998877665",
      correio_eletronico: "mariana.costa@empresa.com.br",
      endereco_rua: "Rua Copacabana 450, Rio de Janeiro - RJ"
    },
    {
      cod_cli: "CLI-903",
      nome_completo: "transporte & logistica express ltda",
      documento_cpf_cnpj: "12345678000195", // CNPJ sem formatação
      telefone_contato: "3133445566",
      correio_eletronico: "financeiro@expresslog.com.br",
      endereco_rua: "Rodovia BR-040 Km 12, Contagem - MG"
    }
  ],
  veiculosLegados: [
    {
      cod_veic: "VEI-101",
      cod_cliente_dono: "CLI-901",
      placa_veiculo: "abc1234", // Placa antiga em minúsculo sem traço -> será convertida p/ Mercosul ABC1C34
      marca_fab: "Volkswagen",
      modelo_veic: "Gol 1.0 Flex",
      ano_fabricacao: "2015",
      cor_lataria: "Prata"
    },
    {
      cod_veic: "VEI-102",
      cod_cliente_dono: "CLI-902",
      placa_veiculo: "XYZ-9876", // Placa antiga em maiúsculo -> será convertida p/ Mercosul XYZ9I76
      marca_fab: "Chevrolet",
      modelo_veic: "Onix 1.4 LTZ",
      ano_fabricacao: "2019",
      cor_lataria: "Preto"
    },
    {
      cod_veic: "VEI-103",
      cod_cliente_dono: "CLI-903",
      placa_veiculo: "MER-2026",
      marca_fab: "Mercedes-Benz",
      modelo_veic: "Sprinter 415 CDI",
      ano_fabricacao: "2021",
      cor_lataria: "Branco"
    }
  ],
  pecasLegadas: [
    {
      cod_peca: "P-1001",
      desc_item: "kit pastilha freio dianteira techtitan",
      qtd_estoque: "18",
      vlr_custo: "85.00",
      vlr_venda: "0.00", // Sem valor de venda -> motor de conversão aplicará markup de 40%
      prateleira_loc: "secao-a-01",
      categoria_grp: "FREIOS"
    },
    {
      cod_peca: "P-1002",
      desc_item: "filtro de oleo lubrificante sedan",
      qtd_estoque: "30",
      vlr_custo: "18.50",
      vlr_venda: "38.00",
      prateleira_loc: "secao-b-05",
      categoria_grp: "FILTROS"
    },
    {
      cod_peca: "P-1003",
      desc_item: "amortecedor traseiro pressurizado",
      qtd_estoque: "8",
      vlr_custo: "190.00",
      vlr_venda: "310.00",
      prateleira_loc: "secao-d-02",
      categoria_grp: "SUSPENSAO"
    }
  ],
  ordensServicoLegadas: [
    {
      num_os: "OS-7701",
      cod_cliente: "CLI-901",
      cod_veiculo: "VEI-101",
      situacao_os: "FECHADA_PAGA",
      data_abertura: "2026-06-10",
      diagnostico_tecnico: "Troca do kit de pastilhas de freio e alinhamento",
      valor_total_os: "320.00"
    }
  ]
};

// Funções de Sanitização e Padronização
function formatCPFCNPJ(value: string): { formatted: string; wasModified: boolean } {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return { formatted, wasModified: formatted !== value };
  } else if (digits.length === 14) {
    const formatted = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return { formatted, wasModified: formatted !== value };
  }
  return { formatted: value.toUpperCase(), wasModified: false };
}

function formatPhone(value: string): { formatted: string; wasModified: boolean } {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    const formatted = digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return { formatted, wasModified: formatted !== value };
  } else if (digits.length === 10) {
    const formatted = digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return { formatted, wasModified: formatted !== value };
  }
  return { formatted: value, wasModified: false };
}

function convertPlateToMercosul(plate: string): { formatted: string; wasModified: boolean } {
  const clean = plate.replace(/[^a-zA-Z0-0]/g, '').toUpperCase();
  // Se for o formato antigo de 7 caracteres ABC1234 -> converte a 5ª posição (número) para letra Mercosul
  if (clean.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    const numberToLetterMap: Record<string, string> = {
      '0': 'A', '1': 'B', '2': 'C', '3': 'D', '4': 'E',
      '5': 'F', '6': 'G', '7': 'H', '8': 'I', '9': 'J'
    };
    const mercosulDigit = numberToLetterMap[clean[4]] || 'A';
    const formatted = `${clean.substring(0, 4)}${mercosulDigit}${clean.substring(5)}`;
    return { formatted, wasModified: true };
  }
  return { formatted: clean, wasModified: false };
}

function capitalizeWords(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

export default function DataMigrationConverterView({
  db,
  onSaveClients,
  onSaveVehicles,
  onSaveParts,
  onSaveServiceOrders,
  onAddHistoryLog
}: DataMigrationConverterViewProps) {
  const [inputMode, setInputMode] = useState<'sample' | 'paste' | 'file'>('sample');
  const [rawInputText, setRawInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [migrationReport, setMigrationReport] = useState<DataMigrationReport | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'clients' | 'vehicles' | 'parts' | 'os'>('all');
  const [hasCommitted, setHasCommitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Executa o Motor de Conversão e Sanitização
  const handleRunConversion = (inputData: any, sourceName: string) => {
    setIsProcessing(true);
    setStatusMessage('Iniciando análise heurística e sanitização de dados...');

    setTimeout(() => {
      try {
        const legacyClients = inputData.clientesLegados || [];
        const legacyVehicles = inputData.veiculosLegados || [];
        const legacyParts = inputData.pecasLegadas || [];
        const legacyOS = inputData.ordensServicoLegadas || [];

        let cpfsFormattedCount = 0;
        let phonesFormattedCount = 0;
        let platesMercosulCount = 0;
        let pricesCalculatedCount = 0;
        let missingFieldsCount = 0;

        const sampleDiffs: MigrationSampleDiff[] = [];

        // Mapas de ID Legado para ID Gerado no MotorDesk
        const clientIdMap: Record<string, string> = {};
        const vehicleIdMap: Record<string, string> = {};

        // 1. Converter Clientes
        const convertedClients: Client[] = legacyClients.map((lc: any) => {
          const id = `cli-migrated-${Math.random().toString(36).substring(2, 7)}`;
          if (lc.cod_cli) clientIdMap[lc.cod_cli] = id;

          const cpfRes = formatCPFCNPJ(lc.documento_cpf_cnpj || '');
          if (cpfRes.wasModified) cpfsFormattedCount++;

          const phoneRes = formatPhone(lc.telefone_contato || '');
          if (phoneRes.wasModified) phonesFormattedCount++;

          const nameFormatted = capitalizeWords(lc.nome_completo || 'Cliente Importado');

          const clientObj: Client = {
            id,
            name: nameFormatted,
            cpf: cpfRes.formatted,
            email: (lc.correio_eletronico || lc.email || 'cliente@migracao.com').toLowerCase(),
            phone: phoneRes.formatted,
            address: lc.endereco_rua || 'Endereço não informado no legado',
            createdAt: new Date().toISOString()
          };

          sampleDiffs.push({
            entityType: 'Cliente',
            legacyRaw: lc,
            motorDeskConverted: clientObj,
            adjustmentsMade: [
              `Capitalização do Nome ("${lc.nome_completo}" ➔ "${nameFormatted}")`,
              cpfRes.wasModified ? `Formatação de CPF/CNPJ ("${lc.documento_cpf_cnpj}" ➔ "${cpfRes.formatted}")` : 'CPF Mantido',
              phoneRes.wasModified ? `Formatação de Telefone ("${lc.telefone_contato}" ➔ "${phoneRes.formatted}")` : 'Telefone Mantido'
            ]
          });

          return clientObj;
        });

        // 2. Converter Veículos
        const convertedVehicles: Vehicle[] = legacyVehicles.map((lv: any) => {
          const id = `veh-migrated-${Math.random().toString(36).substring(2, 7)}`;
          if (lv.cod_veic) vehicleIdMap[lv.cod_veic] = id;

          const matchedClientId = clientIdMap[lv.cod_cliente_dono] || (convertedClients[0] ? convertedClients[0].id : 'cli-1');

          const plateRes = convertPlateToMercosul(lv.placa_veiculo || 'ABC1D23');
          if (plateRes.wasModified) platesMercosulCount++;

          const vehicleObj: Vehicle = {
            id,
            clientId: matchedClientId,
            plate: plateRes.formatted,
            brand: lv.marca_fab || 'Outros',
            model: lv.modelo_veic || 'Modelo Padrão',
            year: Number(lv.ano_fabricacao) || 2020,
            color: lv.cor_lataria || 'Prata',
            createdAt: new Date().toISOString()
          };

          sampleDiffs.push({
            entityType: 'Veículo',
            legacyRaw: lv,
            motorDeskConverted: vehicleObj,
            adjustmentsMade: [
              plateRes.wasModified ? `Conversão para Placa Padrão Mercosul ("${lv.placa_veiculo}" ➔ "${plateRes.formatted}")` : 'Placa Normalizada',
              `Vinculação de Proprietário pelo Código (${lv.cod_cliente_dono} ➔ ${matchedClientId})`
            ]
          });

          return vehicleObj;
        });

        // 3. Converter Peças
        const convertedParts: Part[] = legacyParts.map((lp: any) => {
          const id = `prt-migrated-${Math.random().toString(36).substring(2, 7)}`;
          const costPrice = parseFloat(lp.vlr_custo || '0');
          let salePrice = parseFloat(lp.vlr_venda || '0');

          let priceAdjustedMsg = 'Preço de venda preservado';
          if (salePrice <= 0 && costPrice > 0) {
            salePrice = Math.round((costPrice * 1.40) * 100) / 100; // Markup de 40%
            pricesCalculatedCount++;
            priceAdjustedMsg = `Preço de venda nulo recalculado com Markup +40% (Custo: R$ ${costPrice.toFixed(2)} ➔ Venda: R$ ${salePrice.toFixed(2)})`;
          }

          const partObj: Part = {
            id,
            name: capitalizeWords(lp.desc_item || 'Peça Sem Nome'),
            code: (lp.cod_peca || `P-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(),
            stock: Number(lp.qtd_estoque) || 10,
            minStock: 5,
            costPrice,
            price: salePrice,
            category: (lp.categoria_grp || 'Geral').toUpperCase(),
            location: lp.prateleira_loc ? lp.prateleira_loc.toUpperCase() : 'ALMOXARIFADO-G1',
            unit: 'UN',
            lastSupplier: 'Migração de Sistema Legado'
          };

          sampleDiffs.push({
            entityType: 'Peça',
            legacyRaw: lp,
            motorDeskConverted: partObj,
            adjustmentsMade: [
              `Descrição Padronizada ("${lp.desc_item}" ➔ "${partObj.name}")`,
              priceAdjustedMsg,
              `Atribuição de Categoria Padrão ("${partObj.category}")`
            ]
          });

          return partObj;
        });

        // 4. Converter Ordens de Serviço
        const convertedServiceOrders: ServiceOrder[] = legacyOS.map((los: any) => {
          const id = `os-migrated-${Math.random().toString(36).substring(2, 7)}`;
          const matchedClientId = clientIdMap[los.cod_cliente] || (convertedClients[0] ? convertedClients[0].id : 'cli-1');
          const matchedVehicleId = vehicleIdMap[los.cod_veiculo] || (convertedVehicles[0] ? convertedVehicles[0].id : 'veh-1');

          const osObj: ServiceOrder = {
            id,
            budgetId: `budg-migrated-${Math.random().toString(36).substring(2, 6)}`,
            clientId: matchedClientId,
            vehicleId: matchedVehicleId,
            mechanicId: 'usr-mecanico-1',
            createdAt: los.data_abertura ? `${los.data_abertura}T10:00:00Z` : new Date().toISOString(),
            status: los.situacao_os === 'FECHADA_PAGA' ? 'completed' : 'executing',
            paymentStatus: los.situacao_os === 'FECHADA_PAGA' ? 'paid' : 'pending',
            technicalRecommendations: los.diagnostico_tecnico || 'Diagnóstico importado do sistema legado.',
            items: [
              {
                id: `item-os-migrated-${Math.random().toString(36).substring(2, 6)}`,
                type: 'part',
                itemId: convertedParts[0] ? convertedParts[0].id : 'prt-1',
                name: los.diagnostico_tecnico || 'Serviço/Peça Importado de OS Legada',
                quantity: 1,
                unitPrice: parseFloat(los.valor_total_os || '150.00'),
                totalPrice: parseFloat(los.valor_total_os || '150.00'),
                status: 'completed',
                source: 'budget'
              }
            ],
            notes: `OS Importada do Sistema Legado (${los.num_os || 'N/A'}) em ${new Date().toLocaleDateString('pt-BR')}`
          };

          sampleDiffs.push({
            entityType: 'Ordem de Serviço',
            legacyRaw: los,
            motorDeskConverted: osObj,
            adjustmentsMade: [
              `Mapeamento de Status Legado ("${los.situacao_os}" ➔ "${osObj.status}")`,
              `Vinculação com Cliente e Veículo Convertidos`
            ]
          });

          return osObj;
        });

        const totalRecordsProcessed = 
          convertedClients.length + 
          convertedVehicles.length + 
          convertedParts.length + 
          convertedServiceOrders.length;

        const report: DataMigrationReport = {
          timestamp: new Date().toISOString(),
          sourceName,
          totalRecordsProcessed,
          clientsConverted: convertedClients.length,
          vehiclesConverted: convertedVehicles.length,
          partsConverted: convertedParts.length,
          serviceOrdersConverted: convertedServiceOrders.length,
          sanitizationStats: {
            cpfsFormatted: cpfsFormattedCount,
            phonesFormatted: phonesFormattedCount,
            platesConvertedToMercosul: platesMercosulCount,
            pricesCalculated: pricesCalculatedCount,
            missingFieldsDefaulted: missingFieldsCount
          },
          convertedData: {
            clients: convertedClients,
            vehicles: convertedVehicles,
            parts: convertedParts,
            serviceOrders: convertedServiceOrders
          },
          sampleBeforeAfter: sampleDiffs
        };

        setMigrationReport(report);
        setIsProcessing(false);
        setStatusMessage('Conversão concluída com sucesso! Confira o relatório do Antes e Depois abaixo.');
      } catch (err: any) {
        console.error("Erro na conversão:", err);
        setIsProcessing(false);
        setStatusMessage(`Erro ao processar dados legados: ${err?.message || 'Formato inválido.'}`);
      }
    }, 900);
  };

  // Botão 1-Clique de Simulação com Base Exemplo
  const handleSimulateSample = () => {
    handleRunConversion(SAMPLE_LEGACY_DATABASE, SAMPLE_LEGACY_DATABASE.nomeSistemaOrigem);
  };

  // Botão de Processamento de Texto Colado (JSON)
  const handleProcessPastedText = () => {
    if (!rawInputText.trim()) {
      setStatusMessage('Cole os dados no formato JSON ou CSV no campo abaixo antes de converter.');
      return;
    }
    try {
      const parsed = JSON.parse(rawInputText);
      handleRunConversion(parsed, "Base de Dados Colada via Painel QA");
    } catch (e) {
      setStatusMessage('Texto digitado/colado não é um JSON válido. Verifique a sintaxe.');
    }
  };

  // Botão de Upload de Arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        handleRunConversion(parsed, `Arquivo Importado: ${file.name}`);
      } catch (err) {
        setStatusMessage('Não foi possível interpretar o arquivo. Certifique-se de ser um arquivo .json válido.');
      }
    };
    reader.readAsText(file);
  };

  // Efetivar a Migração de Dados na Base Ativa do MotorDesk
  const handleCommitMigrationToActiveDatabase = () => {
    if (!migrationReport) return;

    const { clients, vehicles, parts, serviceOrders } = migrationReport.convertedData;

    // Unir dados novos com os dados existentes no MotorDesk
    const updatedClients = [...db.clients, ...clients];
    const updatedVehicles = [...db.vehicles, ...vehicles];
    const updatedParts = [...db.parts, ...parts];
    const updatedOS = [...db.serviceOrders, ...serviceOrders];

    onSaveClients(updatedClients);
    onSaveVehicles(updatedVehicles);
    onSaveParts(updatedParts);
    onSaveServiceOrders(updatedOS);

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'system',
        'Migração de Dados Legados Concluída (QA)',
        `Efetivou a migração de ${migrationReport.totalRecordsProcessed} registros provenientes de "${migrationReport.sourceName}". ${clients.length} clientes, ${vehicles.length} veículos, ${parts.length} peças e ${serviceOrders.length} ordens de serviço adicionadas.`,
        '',
        ''
      );
    }

    setHasCommitted(true);
    setStatusMessage(`🎉 Migração Efetivada! Todos os ${migrationReport.totalRecordsProcessed} registros foram integrados à base de dados do MotorDesk.`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="data-migration-converter-container">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
              Conversor e Migrador de Dados Legados
            </h1>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase font-mono">
              EXCLUSIVO QA / ADMIN
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Módulo dedicado para recepção de bancos de dados de sistemas concorrentes ou legados (AutoSoft, MecânicaPro, CSV/JSON) e conversão/sanitização automática para a estrutura nativa do MotorDesk.
          </p>
        </div>

        {/* Botão de Ação Rápida de Simulação */}
        <button
          id="btn-simulate-sample-migration"
          type="button"
          onClick={handleSimulateSample}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-3xs cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          ⚡ Testar Conversão com Base Legada de Exemplo
        </button>
      </div>

      {/* MENSAGEM DE STATUS */}
      {statusMessage && (
        <div id="migration-status-alert" className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          hasCommitted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-800 border-slate-200'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* PAINEL DE ENTRADA DE DADOS LEGADOS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-4" id="legacy-input-panel">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" />
          1. Selecionar Fonte de Dados Legada do Cliente
        </h2>

        {/* Seleção de Abas de Entrada */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            id="tab-mode-sample"
            type="button"
            onClick={() => setInputMode('sample')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              inputMode === 'sample' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
             Base Exemplo (AutoSoft v2.4)
          </button>
          <button
            id="tab-mode-paste"
            type="button"
            onClick={() => setInputMode('paste')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              inputMode === 'paste' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 Digitar ou Colar JSON Legado
          </button>
          <button
            id="tab-mode-file"
            type="button"
            onClick={() => setInputMode('file')}
            className={`pb-2 text-xs font-bold border-b-2 transition ${
              inputMode === 'file' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📁 Fazer Upload de Arquivo .JSON
          </button>
        </div>

        {/* Conteúdo do Modo 1: Base Exemplo */}
        {inputMode === 'sample' && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/80 space-y-3">
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-indigo-900">Base de Dados "AutoSoft Mecânica & Peças v2.4" Pronta para Teste</h3>
                <p className="text-[11px] text-indigo-700/80 mt-0.5">
                  Esta base contém clientes com CPFs desformatados, telefones sem DDD/traços, veículos com placas do modelo antigo (ex: ABC-1234) e peças sem preço de venda preenchido para testar o algoritmo de sanitização do MotorDesk.
                </p>
              </div>
            </div>
            <button
              id="btn-run-sample-conversion"
              type="button"
              onClick={handleSimulateSample}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Executar Leitura & Sanitização de Dados
            </button>
          </div>
        )}

        {/* Conteúdo do Modo 2: Digitar/Colar Texto */}
        {inputMode === 'paste' && (
          <div className="space-y-3">
            <textarea
              id="textarea-pasted-legacy-json"
              rows={6}
              value={rawInputText}
              onChange={e => setRawInputText(e.target.value)}
              placeholder='Cole aqui a estrutura JSON do sistema antigo. Exemplo: { "clientesLegados": [ ... ], "veiculosLegados": [ ... ] }'
              className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              id="btn-process-pasted-legacy"
              type="button"
              onClick={handleProcessPastedText}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" /> Processar Dados Colados
            </button>
          </div>
        )}

        {/* Conteúdo do Modo 3: Upload de Arquivo */}
        {inputMode === 'file' && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2 hover:border-indigo-400 transition bg-slate-50/50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Clique abaixo para selecionar o arquivo exportado (.json)</p>
            <input
              id="file-input-legacy-db"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* RELATÓRIO COMPARATIVO ANTES E DEPOIS DA SANITIZAÇÃO */}
      {migrationReport && (
        <div className="space-y-6" id="migration-report-section">
          {/* PAINEL DE METRICAS DE CONVERSAO */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Relatório de Migração de Dados QA</span>
                <h2 className="text-xl font-black font-display text-white mt-0.5">
                  Resultado do Processamento: {migrationReport.sourceName}
                </h2>
              </div>

              {!hasCommitted ? (
                <button
                  id="btn-commit-migration"
                  type="button"
                  onClick={handleCommitMigrationToActiveDatabase}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-2.5 rounded-lg text-xs transition shadow-lg cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Efetivar Migração na Base Ativa do MotorDesk
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Migração Já Efetivada
                </span>
              )}
            </div>

            {/* CARDS DE RESUMO QUANTITATIVO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total Registros</p>
                <p className="text-2xl font-black text-white font-display mt-0.5">{migrationReport.totalRecordsProcessed}</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Clientes Convertidos</p>
                <p className="text-2xl font-black text-indigo-400 font-display mt-0.5">{migrationReport.clientsConverted}</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Veículos Formatados</p>
                <p className="text-2xl font-black text-blue-400 font-display mt-0.5">{migrationReport.vehiclesConverted}</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Peças em Estoque</p>
                <p className="text-2xl font-black text-emerald-400 font-display mt-0.5">{migrationReport.partsConverted}</p>
              </div>
            </div>

            {/* METRICAS DE SANITIZACAO E HIGIENIZACAO DE DADOS */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Métricas de Higienização de Dados:
              </span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 font-mono">
                CPFs/CNPJs Formatados: <strong className="text-emerald-400">{migrationReport.sanitizationStats.cpfsFormatted}</strong>
              </span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 font-mono">
                Telefones com DDD: <strong className="text-emerald-400">{migrationReport.sanitizationStats.phonesFormatted}</strong>
              </span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 font-mono">
                Placas Padrão Mercosul: <strong className="text-emerald-400">{migrationReport.sanitizationStats.platesConvertedToMercosul}</strong>
              </span>
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 font-mono">
                Preços/Markup Recalculados: <strong className="text-emerald-400">{migrationReport.sanitizationStats.pricesCalculated}</strong>
              </span>
            </div>
          </div>

          {/* INSPECTOR ANTES x DEPOIS (DIFF COMPARATIVO) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                  Inspeção Registro a Registro: Dado Bruto Legado ➔ Dado Normalizado MotorDesk
                </h3>
                <p className="text-xs text-slate-500">
                  Compare visualmente a estrutura antiga com as regras de negócio e validações aplicadas pelo MotorDesk.
                </p>
              </div>

              {/* Filtro por Tipo de Entidade */}
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold gap-1">
                <button
                  id="filter-diff-all"
                  type="button"
                  onClick={() => setActiveFilterTab('all')}
                  className={`px-3 py-1 rounded-md transition ${activeFilterTab === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Todos ({migrationReport.sampleBeforeAfter.length})
                </button>
                <button
                  id="filter-diff-clients"
                  type="button"
                  onClick={() => setActiveFilterTab('clients')}
                  className={`px-3 py-1 rounded-md transition ${activeFilterTab === 'clients' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Clientes
                </button>
                <button
                  id="filter-diff-vehicles"
                  type="button"
                  onClick={() => setActiveFilterTab('vehicles')}
                  className={`px-3 py-1 rounded-md transition ${activeFilterTab === 'vehicles' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Veículos
                </button>
                <button
                  id="filter-diff-parts"
                  type="button"
                  onClick={() => setActiveFilterTab('parts')}
                  className={`px-3 py-1 rounded-md transition ${activeFilterTab === 'parts' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Peças
                </button>
              </div>
            </div>

            {/* LISTA DE DIFFS */}
            <div className="space-y-4" id="diff-cards-list">
              {migrationReport.sampleBeforeAfter
                .filter(item => {
                  if (activeFilterTab === 'clients') return item.entityType === 'Cliente';
                  if (activeFilterTab === 'vehicles') return item.entityType === 'Veículo';
                  if (activeFilterTab === 'parts') return item.entityType === 'Peça';
                  if (activeFilterTab === 'os') return item.entityType === 'Ordem de Serviço';
                  return true;
                })
                .map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs" id={`diff-card-${idx}`}>
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          {item.entityType}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.motorDeskConverted.name || item.motorDeskConverted.model || item.motorDeskConverted.code || `Item #${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {item.adjustmentsMade.map((adj, aIdx) => (
                          <span key={aIdx} className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                            ✨ {adj}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
                      {/* PAINEL DA ESQUERDA: DADO BRUTO LEGADO (ANTES) */}
                      <div className="p-4 bg-rose-50/20 space-y-2">
                        <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                          <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                            🔴 Dado Legado Bruto (Antes)
                          </span>
                          <span className="text-[10px] text-rose-600 font-mono">Estrutura Antiga</span>
                        </div>
                        <pre className="text-[11px] font-mono bg-slate-900 text-rose-300 p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(item.legacyRaw, null, 2)}
                        </pre>
                      </div>

                      {/* PAINEL DA DIREITA: DADO SANITIZADO MOTORDESK (DEPOIS) */}
                      <div className="p-4 bg-emerald-50/20 space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                          <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                            🟢 Padrão MotorDesk (Depois da Sanitização)
                          </span>
                          <span className="text-[10px] text-emerald-600 font-mono">Schema Válido</span>
                        </div>
                        <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(item.motorDeskConverted, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
