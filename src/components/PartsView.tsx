/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, AlertCircle, CheckCircle, X, Package, 
  FileCode, Upload, ArrowUpRight, ArrowDownLeft, FileText, 
  TrendingUp, Layers, MapPin, DollarSign, ShieldAlert, Check, 
  RefreshCw, FileCheck2, ArrowUpDown, Filter, Sparkles, Building2, ShieldCheck, Lock, Link as LinkIcon, Trash2, Ruler
} from 'lucide-react';
import { Part, StockMovement, NFeImportData, NFeItem, User, MaintenanceCategory, CrossSellItem, ItemDimensionData } from '../types';
import { AppDatabase } from '../data/mockData';
import { getPartStockDetails } from '../utils/stockUtils';
import { resolveUnitOfMeasure } from '../utils/unitMeasurementUtils';

interface PartsViewProps {
  db: AppDatabase;
  currentUser?: User;
  onSaveParts: (parts: Part[]) => void;
  onSaveStockMovements?: (movements: StockMovement[]) => void;
  onAddHistoryLog?: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', 
    title: string, 
    description: string, 
    clientId: string, 
    vehicleId: string,
    metadata?: any
  ) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

// Helper to parse numbers from XML strings safely handling Brazilian (1.250,50) and US (1250.50) formats
function parseXmlFloat(value: string | null | undefined): number {
  if (!value) return 0;
  let str = value.trim();
  if (!str) return 0;

  // Remove currency symbols (R$, $, etc.), spaces, non-numeric except . , -
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // e.g. "1.250,50" -> "1250.50"
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "1,250.50" -> "1250.50"
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // e.g. "1250,50" -> "1250.50"
    str = str.replace(',', '.');
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Case-insensitive & namespace-agnostic helper to find all elements by candidate local names
function findElementsByNames(parent: Document | Element, names: string[]): Element[] {
  const result: Element[] = [];
  const lowerNames = names.map(n => n.toLowerCase());

  const allNodes = parent.querySelectorAll('*');
  allNodes.forEach(node => {
    const localName = (node.localName || node.tagName || '').toLowerCase();
    if (lowerNames.includes(localName)) {
      result.push(node);
    }
  });

  return result;
}

// Find first element matching any of the candidate names
function findFirstElement(parent: Document | Element, names: string[]): Element | null {
  const matches = findElementsByNames(parent, names);
  return matches.length > 0 ? matches[0] : null;
}

// Get text content of first matching tag
function getTagText(parent: Document | Element, names: string[], defaultValue = ''): string {
  const el = findFirstElement(parent, names);
  return el && el.textContent ? el.textContent.trim() : defaultValue;
}

// Helper to format CNPJ with standard punctuation
function formatCNPJ(cnpjStr?: string): string {
  if (!cnpjStr) return '';
  const digits = cnpjStr.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpjStr;
}

// Helper XML Parser for NFe (Nota Fiscal Eletrônica) & General Product XMLs
function parseNFeXML(xmlString: string, existingParts: Part[], systemCompanyCnpj?: string): NFeImportData | null {
  try {
    if (!xmlString || !xmlString.trim()) return null;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      return null;
    }

    // 1. Invoice Number (nNF)
    let nNF = getTagText(xmlDoc, ["nNF", "nnf", "numero", "number"]);
    if (!nNF || nNF.length > 30) {
      const idTag = getTagText(xmlDoc, ["cNF", "cnf", "id", "code"]);
      nNF = idTag ? `NF-${idTag}` : `NF-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 2. Series (serie)
    const serie = getTagText(xmlDoc, ["serie", "series"], "1");

    // 3. Supplier / Emitter Info (emitente, cnpj)
    let emitente = "Fornecedor Peças Automotivas";
    let cnpjEmitente = "";

    const emitEl = findFirstElement(xmlDoc, ["emit", "emitente", "fornecedor", "vendor", "supplier", "store", "loja", "issuer"]);
    if (emitEl) {
      emitente = getTagText(emitEl, ["xNome", "xFant", "name", "nome", "razasocial", "title"], emitente);
      cnpjEmitente = getTagText(emitEl, ["CNPJ", "cnpj", "CPF", "cpf", "taxid"], "");
    } else {
      // Top level fallbacks
      const topName = getTagText(xmlDoc, ["xNome", "xFant", "storeName", "name", "nome"], "");
      if (topName) emitente = topName;
      cnpjEmitente = getTagText(xmlDoc, ["CNPJ", "cnpj", "CPF", "cpf", "taxid"], "");
    }

    // 3.5 Recipient / Destinatário Info (destinatario, cnpjDestinatario)
    let destinatario = "";
    let cnpjDestinatario = "";

    const destEl = findFirstElement(xmlDoc, ["dest", "destinatario", "recipient", "cliente", "customer", "comprador"]);
    if (destEl) {
      destinatario = getTagText(destEl, ["xNome", "xFant", "name", "nome", "razasocial", "title"], "");
      cnpjDestinatario = getTagText(destEl, ["CNPJ", "cnpj", "CPF", "cpf", "taxid"], "");
    } else {
      cnpjDestinatario = getTagText(xmlDoc, ["CNPJDest", "cnpjDest", "destCNPJ"], "");
      destinatario = getTagText(xmlDoc, ["xNomeDest", "destNome"], "");
    }

    // Validate Recipient CNPJ against System Company CNPJ
    const cleanCompanyCnpj = (systemCompanyCnpj || '').replace(/\D/g, '');
    const cleanDestCnpj = (cnpjDestinatario || '').replace(/\D/g, '');

    let isCnpjValid = true;
    let cnpjMismatchWarning = '';

    if (cleanCompanyCnpj.length > 0) {
      if (!cleanDestCnpj) {
        isCnpjValid = false;
        cnpjMismatchWarning = `A Nota Fiscal não possui CNPJ de destinatário (<dest><CNPJ>). O sistema exige que a NF-e seja emitida para a sua empresa (${formatCNPJ(cleanCompanyCnpj)}).`;
      } else if (cleanDestCnpj !== cleanCompanyCnpj) {
        isCnpjValid = false;
        cnpjMismatchWarning = `Importação Bloqueada: O CNPJ do destinatário da Nota Fiscal (${formatCNPJ(cleanDestCnpj)}${destinatario ? ` - ${destinatario}` : ''}) é diferente do CNPJ cadastrado na sua empresa (${formatCNPJ(cleanCompanyCnpj)}). Somente NF-e emitidas para a sua empresa podem ser importadas.`;
      }
    }

    // 4. Issue Date (dhEmi / dEmi)
    const dhEmiText = getTagText(xmlDoc, ["dhEmi", "dEmi", "dhemi", "demi", "date", "data", "createdat"]);
    let dhEmi = new Date().toISOString();
    if (dhEmiText) {
      const parsedDate = new Date(dhEmiText);
      if (!isNaN(parsedDate.getTime())) {
        dhEmi = parsedDate.toISOString();
      }
    }

    // 5. Item Discovery
    // Search for item containers in order of preference
    let itemNodes = findElementsByNames(xmlDoc, ["det", "detalhe", "itemnota"]);
    if (itemNodes.length === 0) {
      // Fallback for generic product XMLs: <product>, <produto>, <item>, <prod>
      itemNodes = findElementsByNames(xmlDoc, ["product", "produto", "item", "prod"]);
    }

    const items: NFeItem[] = [];

    itemNodes.forEach((node, index) => {
      // Check if this node is <det> containing <prod> or <product>
      const prodEl = findFirstElement(node, ["prod", "product", "produto"]) || node;

      const cProd = getTagText(prodEl, ["cProd", "cprod", "id", "sku", "code", "codigo"], `ITEM-${index + 1}`);
      const xProd = getTagText(prodEl, ["xProd", "xprod", "name", "nome", "title", "descricao", "description", "product"], "Peça sem descrição");
      const ncm = getTagText(prodEl, ["NCM", "ncm", "category", "categoria"], "");
      const uCom = getTagText(prodEl, ["uCom", "ucom", "unidade", "unit", "uMed"], "UN");

      const qCom = parseXmlFloat(getTagText(prodEl, ["qCom", "qcom", "quantity", "qtd", "quantidade", "count"])) || 1;
      let vUnCom = parseXmlFloat(getTagText(prodEl, ["vUnCom", "vuncom", "price", "unitprice", "preco", "valor", "valorunitario", "cost"]));
      let vProd = parseXmlFloat(getTagText(prodEl, ["vProd", "vprod", "total", "subtotal", "price", "valor"]));

      // If unit price missing but subtotal present, calculate unit price
      if (vUnCom <= 0 && vProd > 0 && qCom > 0) {
        vUnCom = Math.round((vProd / qCom) * 100) / 100;
      }

      // If subtotal missing or 0, calculate from quantity * unit price
      if (vProd <= 0 && vUnCom > 0) {
        vProd = Math.round((qCom * vUnCom) * 100) / 100;
      }

      // Smart Matching with existing parts database
      const cleanCProd = cProd.trim().toLowerCase();
      const cleanXProd = xProd.trim().toLowerCase();

      const match = existingParts.find(p => 
        (p.code && p.code.trim().toLowerCase() === cleanCProd) ||
        (cleanXProd && cleanXProd.length > 2 && (cleanXProd.includes(p.name.trim().toLowerCase()) || p.name.trim().toLowerCase().includes(cleanXProd)))
      );

      const action = match ? 'update_stock' : 'create_new';
      const suggestedSalePrice = match ? match.price : Math.round((vUnCom * 1.50) * 100) / 100;

      items.push({
        cProd,
        xProd,
        ncm,
        uCom,
        qCom,
        vUnCom,
        vProd,
        matchedPartId: match ? match.id : undefined,
        action,
        suggestedSalePrice
      });
    });

    // 6. Total Invoice Value (vNF)
    let vNF = parseXmlFloat(getTagText(xmlDoc, ["vNF", "vnf", "valortotal", "total", "grandtotal"]));

    // Fallback: If vNF is 0 or missing or less than sum of items, calculate sum of all item subtotals
    const calculatedTotal = items.reduce((sum, i) => sum + i.vProd, 0);
    if (vNF <= 0 || isNaN(vNF) || (vNF < calculatedTotal && calculatedTotal > 0)) {
      vNF = calculatedTotal;
    }

    return {
      nNF,
      serie,
      emitente,
      cnpjEmitente,
      destinatario,
      cnpjDestinatario,
      dhEmi,
      vNF,
      items,
      isCnpjValid,
      cnpjMismatchWarning
    };
  } catch (err) {
    console.error("Erro ao analisar NFe/XML:", err);
    return null;
  }
}

// Sample XML Generator for Instant Testing
function generateSampleNFeXML(companyCnpj?: string, companyName?: string): string {
  const randomNF = Math.floor(2000 + Math.random() * 8000);
  const cleanCnpj = (companyCnpj || '12.345.678/0001-90').replace(/\D/g, '');
  const destName = companyName || 'MotorDesk Auto Center & Oficina Mecânica';

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260712345678000199550010000${randomNF}1001234567" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>00123456</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${randomNF}</nNF>
        <dhEmi>2026-07-22T08:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Distribuidora AutoPeças Brasil S/A</xNome>
        <xFant>AutoPeças Brasil</xFant>
      </emit>
      <dest>
        <CNPJ>${cleanCnpj}</CNPJ>
        <xNome>${destName}</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PE-001</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Pastilha de Freio Dianteira Bosch Heavy Duty</xProd>
          <NCM>87083090</NCM>
          <CFOP>5102</CFOP>
          <uCom>PAR</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>105.0000</vUnCom>
          <vProd>1050.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>PE-008</cProd>
          <cEAN>7891234567891</cEAN>
          <xProd>Vela de Ignição Iridium NGK Laser</xProd>
          <NCM>85111000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>20.0000</qCom>
          <vUnCom>42.5000</vUnCom>
          <vProd>850.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>PE-009</cProd>
          <cEAN>7891234567892</cEAN>
          <xProd>Correia Dentada Gates PowerGrip</xProd>
          <NCM>40103200</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>6.0000</qCom>
          <vUnCom>95.0000</vUnCom>
          <vProd>570.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>2470.00</vProd>
          <vNF>2470.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
}

export default function PartsView({ 
  db, 
  currentUser,
  onSaveParts, 
  onSaveStockMovements, 
  onAddHistoryLog, 
  setUnsavedTask 
}: PartsViewProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'nfe' | 'movements'>('catalog');

  // Search & Filter state for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'normal'>('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  // Manual Part Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Geral');
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState<string>('UN');
  const [unitOfMeasureId, setUnitOfMeasureId] = useState<string>('');
  const [unitName, setUnitName] = useState<string>('');
  const [dimLength, setDimLength] = useState<number | undefined>(undefined);
  const [dimWidth, setDimWidth] = useState<number | undefined>(undefined);
  const [dimHeight, setDimHeight] = useState<number | undefined>(undefined);
  const [dimUnitLength, setDimUnitLength] = useState<'m' | 'cm' | 'mm'>('m');
  const [dimUnitWidth, setDimUnitWidth] = useState<'m' | 'cm' | 'mm'>('m');
  const [dimUnitHeight, setDimUnitHeight] = useState<'m' | 'cm' | 'mm'>('m');
  const [location, setLocation] = useState<string>('Prateleira A1');
  const [ncm, setNcm] = useState<string>('8708.30.90');
  const [lastSupplier, setLastSupplier] = useState<string>('');

  // Fiscal Fields (Contabilidade & SEFAZ)
  const [cest, setCest] = useState<string>('01.001.00');
  const [origem, setOrigem] = useState<string>('0');
  const [icmsCstOrCsosn, setIcmsCstOrCsosn] = useState<string>('102');
  const [icmsRatePercent, setIcmsRatePercent] = useState<number>(0);
  const [pisCst, setPisCst] = useState<string>('07');
  const [pisRatePercent, setPisRatePercent] = useState<number>(0);
  const [cofinsCst, setCofinsCst] = useState<string>('07');
  const [cofinsRatePercent, setCofinsRatePercent] = useState<number>(0);
  const [ipiCst, setIpiCst] = useState<string>('99');
  const [ipiRatePercent, setIpiRatePercent] = useState<number>(0);
  const [anpCode, setAnpCode] = useState<string>('');
  const [cBenef, setCBenef] = useState<string>('');

  // Periodic Maintenance States
  const [isPeriodic, setIsPeriodic] = useState<boolean>(false);
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('oil_change');
  const [defaultIntervalKm, setDefaultIntervalKm] = useState<number>(10000);
  const [defaultIntervalDays, setDefaultIntervalDays] = useState<number>(180);

  // Vendas Casadas (Cross-Selling) States
  const [isCrossSell, setIsCrossSell] = useState<boolean>(false);
  const [crossSellItems, setCrossSellItems] = useState<CrossSellItem[]>([]);
  const [csType, setCsType] = useState<'service' | 'part'>('service');
  const [csItemId, setCsItemId] = useState<string>('');
  const [csQty, setCsQty] = useState<number>(1);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual Adjustment Modal State
  const [adjustPart, setAdjustPart] = useState<Part | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // NFe Import Tab States
  const [nfeInputMode, setNfeInputMode] = useState<'file' | 'text' | 'manual'>('file');
  const [xmlRawText, setXmlRawText] = useState('');
  const [parsedNFe, setParsedNFe] = useState<NFeImportData | null>(null);

  // NFe Manual Input Mode Fields
  const [manualNFeNum, setManualNFeNum] = useState('');
  const [manualSupplier, setManualSupplier] = useState('');
  const [manualCNPJ, setManualCNPJ] = useState('');
  const [manualItems, setManualItems] = useState<NFeItem[]>([
    { cProd: 'PRT-100', xProd: 'Filtro de Ar Condicionado', qCom: 5, vUnCom: 35, vProd: 175, action: 'create_new', suggestedSalePrice: 65 }
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isFormDirty = name.trim() !== '' || code.trim() !== '' || stock !== 10 || price !== 0;

  const resetForm = () => {
    setName('');
    setCode('');
    setCategory('Geral');
    setStock(10);
    setMinStock(5);
    setCostPrice(0);
    setPrice(0);
    setUnit('UN');
    setUnitOfMeasureId('');
    setUnitName('');
    setDimLength(undefined);
    setDimWidth(undefined);
    setDimHeight(undefined);
    setDimUnitLength('m');
    setDimUnitWidth('m');
    setDimUnitHeight('m');
    setLocation('Prateleira A1');
    setNcm('8708.30.90');
    setLastSupplier('');
    setCest('01.001.00');
    setOrigem('0');
    setIcmsCstOrCsosn('102');
    setIcmsRatePercent(0);
    setPisCst('07');
    setPisRatePercent(0);
    setCofinsCst('07');
    setCofinsRatePercent(0);
    setIpiCst('99');
    setIpiRatePercent(0);
    setAnpCode('');
    setCBenef('');
    setIsPeriodic(false);
    setMaintCategory('oil_change');
    setDefaultIntervalKm(10000);
    setDefaultIntervalDays(180);
    setIsCrossSell(false);
    setCrossSellItems([]);
    setCsType('service');
    setCsItemId('');
    setCsQty(1);
    setErrorMsg('');
    setEditingPart(null);
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (part: Part) => {
    setEditingPart(part);
    setName(part.name);
    setCode(part.code);
    setCategory(part.category || 'Geral');
    setStock(part.stock);
    setMinStock(part.minStock ?? 5);
    setCostPrice(part.costPrice ?? 0);
    setPrice(part.price);
    setUnit(part.unit || 'UN');
    setUnitOfMeasureId(part.unitOfMeasureId || '');
    setUnitName(part.unitName || '');
    setDimLength(part.dimensions?.length);
    setDimWidth(part.dimensions?.width);
    setDimHeight(part.dimensions?.height);
    setDimUnitLength((part.dimensions?.unitLength as 'm' | 'cm' | 'mm') || 'm');
    setDimUnitWidth((part.dimensions?.unitWidth as 'm' | 'cm' | 'mm') || 'm');
    setDimUnitHeight((part.dimensions?.unitHeight as 'm' | 'cm' | 'mm') || 'm');
    setLocation(part.location || 'Prateleira A1');
    setNcm(part.ncm || '8708.30.90');
    setLastSupplier(part.lastSupplier || '');
    setCest(part.cest || '01.001.00');
    setOrigem(part.origem || '0');
    setIcmsCstOrCsosn(part.icmsCstOrCsosn || '102');
    setIcmsRatePercent(part.icmsRatePercent ?? 0);
    setPisCst(part.pisCst || '07');
    setPisRatePercent(part.pisRatePercent ?? 0);
    setCofinsCst(part.cofinsCst || '07');
    setCofinsRatePercent(part.cofinsRatePercent ?? 0);
    setIpiCst(part.ipiCst || '99');
    setIpiRatePercent(part.ipiRatePercent ?? 0);
    setAnpCode(part.anpCode || '');
    setCBenef(part.cBenef || '');

    const isPartPeriodic = part.isPeriodic || part.maintenanceControl?.enabled || false;
    setIsPeriodic(isPartPeriodic);
    if (part.maintenanceControl) {
      setMaintCategory(part.maintenanceControl.category || 'oil_change');
      setDefaultIntervalKm(part.maintenanceControl.defaultIntervalKm || 10000);
      setDefaultIntervalDays(part.maintenanceControl.defaultIntervalDays || 180);
    } else {
      setMaintCategory('oil_change');
      setDefaultIntervalKm(10000);
      setDefaultIntervalDays(180);
    }

    setIsCrossSell(part.isCrossSell || false);
    setCrossSellItems(part.crossSellItems || []);

    setErrorMsg('');
    setIsFormOpen(true);
  };

  const executeSave = () => {
    if (!name.trim() || !code.trim() || stock < 0 || price < 0) {
      return { success: false, message: 'Os campos com * são obrigatórios.' };
    }

    const codeExists = db.parts.some(
      p => p.code.toLowerCase() === code.trim().toLowerCase() && (!editingPart || p.id !== editingPart.id)
    );
    if (codeExists) {
      return { success: false, message: 'Já existe uma peça cadastrada com este código.' };
    }

    const maintControl = isPeriodic ? {
      enabled: true,
      category: maintCategory,
      defaultIntervalKm: Number(defaultIntervalKm) || 10000,
      defaultIntervalDays: Number(defaultIntervalDays) || 180
    } : undefined;

    const matchedUom = (db.unitsOfMeasure || []).find(u => u.id === unitOfMeasureId || (u.acronym || u.code) === unit);
    const dimensionsData: ItemDimensionData | undefined = (dimLength || dimWidth || dimHeight) ? {
      calculationType: matchedUom?.calculationType || 'SIMPLES',
      length: dimLength ? Number(dimLength) : undefined,
      width: dimWidth ? Number(dimWidth) : undefined,
      height: dimHeight ? Number(dimHeight) : undefined,
      unitLength: dimUnitLength,
      unitWidth: dimUnitWidth,
      unitHeight: dimUnitHeight
    } : undefined;

    let updatedPartsList: Part[] = [];
    let newMovement: StockMovement | null = null;

    if (editingPart) {
      const stockDiff = stock - editingPart.stock;
      
      updatedPartsList = db.parts.map(p => 
        p.id === editingPart.id 
          ? { 
              ...p, 
              name: name.trim(), 
              code: code.trim().toUpperCase(), 
              category, 
              stock, 
              minStock, 
              costPrice, 
              price, 
              unit: unit.trim().toUpperCase() || 'UN',
              unitOfMeasureId: unitOfMeasureId || undefined,
              unitName: unitName || undefined,
              dimensions: dimensionsData,
              location, 
              ncm, 
              lastSupplier,
              cest: cest.trim() || undefined,
              origem,
              icmsCstOrCsosn,
              icmsRatePercent: Number(icmsRatePercent) || 0,
              pisCst,
              pisRatePercent: Number(pisRatePercent) || 0,
              cofinsCst,
              cofinsRatePercent: Number(cofinsRatePercent) || 0,
              ipiCst,
              ipiRatePercent: Number(ipiRatePercent) || 0,
              anpCode: anpCode.trim() || undefined,
              cBenef: cBenef.trim() || undefined,
              isPeriodic,
              maintenanceControl: maintControl,
              isCrossSell,
              crossSellItems: isCrossSell ? crossSellItems : []
            } 
          : p
      );

      if (stockDiff !== 0) {
        newMovement = {
          id: `mov-${Date.now()}`,
          partId: editingPart.id,
          partName: name.trim(),
          partCode: code.trim().toUpperCase(),
          type: stockDiff > 0 ? 'in' : 'out',
          quantity: Math.abs(stockDiff),
          unitCost: costPrice,
          reason: `Alteração de Cadastro (Ajuste de Saldo de ${editingPart.stock} para ${stock})`,
          date: new Date().toISOString(),
          userName: currentUser ? currentUser.name : 'Operador'
        };
      }

      if (onAddHistoryLog) {
        onAddHistoryLog(
          'user_activity',
          'Peça / Estoque Atualizado',
          `Alterou dados da peça "${name}" (Código: ${code}, Unidade: ${unit}). Estoque: ${stock} ${unit} | Preço Custo: R$ ${costPrice.toFixed(2)} | Venda: R$ ${price.toFixed(2)}.`,
          '',
          ''
        );
      }
    } else {
      const newPart: Part = {
        id: `prt-${Date.now()}`,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        stock,
        minStock,
        costPrice,
        price,
        unit: unit.trim().toUpperCase() || 'UN',
        unitOfMeasureId: unitOfMeasureId || undefined,
        unitName: unitName || undefined,
        dimensions: dimensionsData,
        location, 
        ncm, 
        lastSupplier,
        cest: cest.trim() || undefined,
        origem,
        icmsCstOrCsosn,
        icmsRatePercent: Number(icmsRatePercent) || 0,
        pisCst,
        pisRatePercent: Number(pisRatePercent) || 0,
        cofinsCst,
        cofinsRatePercent: Number(cofinsRatePercent) || 0,
        ipiCst,
        ipiRatePercent: Number(ipiRatePercent) || 0,
        anpCode: anpCode.trim() || undefined,
        cBenef: cBenef.trim() || undefined,
        isPeriodic,
        maintenanceControl: maintControl,
        isCrossSell,
        crossSellItems: isCrossSell ? crossSellItems : []
      };

      updatedPartsList = [...db.parts, newPart];

      newMovement = {
        id: `mov-${Date.now()}`,
        partId: newPart.id,
        partName: newPart.name,
        partCode: newPart.code,
        type: 'in',
        quantity: stock,
        unitCost: costPrice,
        reason: 'Cadastro Inicial de Peça no Sistema',
        date: new Date().toISOString(),
        userName: currentUser ? currentUser.name : 'Operador'
      };

      if (onAddHistoryLog) {
        onAddHistoryLog(
          'user_activity',
          'Nova Peça Cadastrada',
          `Cadastrou nova peça no catálogo: "${name}" (Cód: ${code}) com estoque inicial de ${stock} un.`,
          '',
          ''
        );
      }
    }

    onSaveParts(updatedPartsList);

    if (newMovement) {
      const currentMovements = db.stockMovements || [];
      const updatedMovements = [newMovement, ...currentMovements];
      if (onSaveStockMovements) {
        onSaveStockMovements(updatedMovements);
      }
    }

    return { success: true, list: updatedPartsList };
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = executeSave();
    if (!res.success) {
      setErrorMsg(res.message || '');
      return;
    }
    setSuccessMsg(editingPart ? 'Peça atualizada com sucesso!' : 'Peça cadastrada no estoque com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
    resetForm();
  };

  // Execute Quick Stock Adjustment Modal
  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPart || adjustQty <= 0) return;

    let newStock = adjustPart.stock;
    if (adjustType === 'in') newStock += adjustQty;
    else if (adjustType === 'out') newStock = Math.max(0, newStock - adjustQty);
    else if (adjustType === 'adjustment') newStock = adjustQty;

    const updatedParts = db.parts.map(p => 
      p.id === adjustPart.id ? { ...p, stock: newStock } : p
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      partId: adjustPart.id,
      partName: adjustPart.name,
      partCode: adjustPart.code,
      type: adjustType,
      quantity: adjustQty,
      unitCost: adjustPart.costPrice || 0,
      reason: adjustReason.trim() || (adjustType === 'in' ? 'Entrada Manual' : adjustType === 'out' ? 'Baixa / Perda Manual' : 'Ajuste de Inventário'),
      date: new Date().toISOString(),
      userName: currentUser ? currentUser.name : 'Operador'
    };

    onSaveParts(updatedParts);

    const currentMovements = db.stockMovements || [];
    if (onSaveStockMovements) {
      onSaveStockMovements([movement, ...currentMovements]);
    }

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'user_activity',
        'Movimentação de Estoque',
        `Realizou ${adjustType === 'in' ? 'Entrada' : adjustType === 'out' ? 'Saída' : 'Ajuste'} de ${adjustQty} un no item "${adjustPart.name}". Novo saldo: ${newStock} un. Motivo: ${movement.reason}`,
        '',
        ''
      );
    }

    setSuccessMsg(`Movimentação de estoque realizada com sucesso! Novo saldo: ${newStock} un.`);
    setTimeout(() => setSuccessMsg(''), 3500);
    setAdjustPart(null);
    setAdjustQty(1);
    setAdjustReason('');
  };

  // NFe XML File Load Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlStr = event.target?.result as string;
      if (xmlStr) {
        setXmlRawText(xmlStr);
        const companyCnpj = db.companyInfo?.cnpj;
        const parsed = parseNFeXML(xmlStr, db.parts, companyCnpj);
        if (parsed) {
          setParsedNFe(parsed);
          if (parsed.isCnpjValid === false) {
            setErrorMsg(parsed.cnpjMismatchWarning || 'Importação bloqueada: O CNPJ do destinatário não corresponde ao da empresa.');
          } else {
            setErrorMsg('');
          }
        } else {
          setErrorMsg('Não foi possível ler a Nota Fiscal XML. Verifique se o arquivo é um XML válido de NFe v4.0.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Load Sample NFe XML Button
  const handleLoadSampleXML = () => {
    const companyCnpj = db.companyInfo?.cnpj;
    const companyName = db.companyInfo?.name;
    const sampleXml = generateSampleNFeXML(companyCnpj, companyName);
    setXmlRawText(sampleXml);
    const parsed = parseNFeXML(sampleXml, db.parts, companyCnpj);
    if (parsed) {
      setParsedNFe(parsed);
      if (parsed.isCnpjValid === false) {
        setErrorMsg(parsed.cnpjMismatchWarning || 'Importação bloqueada: CNPJ incompatível.');
      } else {
        setErrorMsg('');
        setSuccessMsg('Nota Fiscal de Exemplo gerada com o CNPJ da sua empresa e analisada com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    }
  };

  // Parse Pasted Raw XML String
  const handleParsePastedXML = () => {
    if (!xmlRawText.trim()) {
      setErrorMsg('Cole o conteúdo XML da Nota Fiscal no campo antes de analisar.');
      return;
    }
    const companyCnpj = db.companyInfo?.cnpj;
    const parsed = parseNFeXML(xmlRawText, db.parts, companyCnpj);
    if (parsed) {
      setParsedNFe(parsed);
      if (parsed.isCnpjValid === false) {
        setErrorMsg(parsed.cnpjMismatchWarning || 'Importação bloqueada: O CNPJ do destinatário é diferente do CNPJ da empresa.');
      } else {
        setErrorMsg('');
        setSuccessMsg('Nota Fiscal analisada com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } else {
      setErrorMsg('XML inválido. Verifique o texto colado e certifique-se de que é uma NFe válida.');
    }
  };

  // Confirm and Commit NFe Import to Database
  const handleCommitNFeImport = () => {
    if (!parsedNFe || parsedNFe.items.length === 0) return;

    if (parsedNFe.isCnpjValid === false) {
      setErrorMsg(parsedNFe.cnpjMismatchWarning || 'Importação bloqueada: CNPJ do destinatário é diferente do CNPJ cadastrado na empresa.');
      return;
    }

    const updatedParts = [...db.parts];
    const newMovements: StockMovement[] = [];
    let itemsUpdatedCount = 0;
    let itemsCreatedCount = 0;

    parsedNFe.items.forEach(item => {
      if (item.action === 'ignore') return;

      if (item.action === 'update_stock' && item.matchedPartId) {
        const index = updatedParts.findIndex(p => p.id === item.matchedPartId);
        if (index !== -1) {
          const currentPart = updatedParts[index];
          const newStock = currentPart.stock + item.qCom;
          
          updatedParts[index] = {
            ...currentPart,
            stock: newStock,
            costPrice: item.vUnCom, // update purchase cost
            price: item.suggestedSalePrice || currentPart.price,
            lastSupplier: parsedNFe.emitente,
            ncm: item.ncm || currentPart.ncm
          };

          itemsUpdatedCount++;

          newMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            partId: currentPart.id,
            partName: currentPart.name,
            partCode: currentPart.code,
            type: 'in',
            quantity: item.qCom,
            unitCost: item.vUnCom,
            reason: `Entrada por Importação NFe #${parsedNFe.nNF} (${parsedNFe.emitente})`,
            supplierOrNFe: `NFe #${parsedNFe.nNF}`,
            date: new Date().toISOString(),
            userName: currentUser ? currentUser.name : 'Operador'
          });
        }
      } else if (item.action === 'create_new') {
        const newPart: Part = {
          id: `prt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.xProd,
          code: item.cProd.toUpperCase(),
          stock: item.qCom,
          minStock: 5,
          costPrice: item.vUnCom,
          price: item.suggestedSalePrice || (item.vUnCom * 1.5),
          unit: item.uCom || 'UN',
          location: 'Prateleira NFe',
          ncm: item.ncm,
          lastSupplier: parsedNFe.emitente,
          category: 'Entrada NFe'
        };

        updatedParts.push(newPart);
        itemsCreatedCount++;

        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          partId: newPart.id,
          partName: newPart.name,
          partCode: newPart.code,
          type: 'in',
          quantity: item.qCom,
          unitCost: item.vUnCom,
          reason: `Cadastro e Entrada por Importação NFe #${parsedNFe.nNF} (${parsedNFe.emitente})`,
          supplierOrNFe: `NFe #${parsedNFe.nNF}`,
          date: new Date().toISOString(),
          userName: currentUser ? currentUser.name : 'Operador'
        });
      }
    });

    onSaveParts(updatedParts);

    const currentMovements = db.stockMovements || [];
    if (onSaveStockMovements) {
      onSaveStockMovements([...newMovements, ...currentMovements]);
    }

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'user_activity',
        'Importação de Nota Fiscal NFe',
        `Efetivou a importação da NFe #${parsedNFe.nNF} (${parsedNFe.emitente}) - Total: R$ ${parsedNFe.vNF.toFixed(2)}. ${itemsUpdatedCount} itens com estoque atualizado, ${itemsCreatedCount} novas peças cadastradas.`,
        '',
        ''
      );
    }

    setSuccessMsg(`Sucesso! Importação da NFe #${parsedNFe.nNF} concluída. ${itemsUpdatedCount + itemsCreatedCount} itens adicionados/atualizados no estoque.`);
    setTimeout(() => setSuccessMsg(''), 5000);

    // Reset NFe view state
    setParsedNFe(null);
    setXmlRawText('');
    setActiveTab('catalog');
  };

  useEffect(() => {
    if (isFormOpen && isFormDirty) {
      setUnsavedTask({
        type: 'os',
        saveCallback: () => { executeSave(); },
        discardCallback: () => { resetForm(); }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [isFormOpen, name, code, stock, price, costPrice]);

  // Catalog Filtering
  const categoriesList = Array.from(
    new Set(db.parts.map(p => p.category || 'Geral'))
  );

  // Cross-Store Permission Check
  const userCanViewOtherStores = currentUser?.permissions?.canViewOtherStoresStock ?? (currentUser?.role === 'admin' || currentUser?.role === 'qa');

  const filteredParts = db.parts.filter(p => {
    // Restrict to user company if user cannot view other stores' stock
    if (!userCanViewOtherStores && currentUser?.companyId) {
      if (p.companyId && p.companyId !== currentUser.companyId) {
        return false;
      }
    }

    // Filter by store combobox if selected
    if (userCanViewOtherStores && selectedStoreFilter !== 'all') {
      const partCompId = p.companyId || db.companyInfo?.id || 'comp-1';
      if (partCompId !== selectedStoreFilter) {
        return false;
      }
    }

    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || (p.category || 'Geral') === selectedCategory;

    const isLowStock = p.stock <= (p.minStock ?? 5);
    const matchesStockStatus = 
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && isLowStock) ||
      (stockStatusFilter === 'normal' && !isLowStock);

    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  // Calculate Key Inventory Metrics
  const totalItemsCount = db.parts.length;
  const totalPhysicalUnits = db.parts.reduce((acc, p) => acc + p.stock, 0);
  const totalStockCostValue = db.parts.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0);
  const totalStockSalesValue = db.parts.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const lowStockCount = db.parts.filter(p => p.stock <= (p.minStock ?? 5)).length;

  const stockMovements = db.stockMovements || [];

  return (
    <div className="space-y-6 animate-fade-in" id="inventory-parts-view-container">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">Gestão de Estoque & Importação de NFe</h1>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 uppercase font-mono">RF004</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle de inventário físico, valorização de estoque, extrato de movimentações e importação de Notas Fiscais Eletrônicas (XML).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            id="btn-tab-catalog"
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'catalog' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" /> Catálogo ({totalItemsCount})
          </button>

          <button 
            id="btn-tab-nfe"
            type="button"
            onClick={() => setActiveTab('nfe')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'nfe' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-600" /> Importar NFe (XML)
          </button>

          <button 
            id="btn-tab-movements"
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'movements' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" /> Extrato de Entradas/Saídas
          </button>
        </div>
      </div>

      {/* SUCCESS & ERROR ALERT MESSAGES */}
      {successMsg && (
        <div id="parts-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-200 animate-slide-up shadow-2xs font-sans">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div id="parts-error-alert" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-200 animate-slide-up font-sans">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="inventory-kpi-cards">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Unidades em Estoque</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 font-display">{totalPhysicalUnits} <span className="text-xs font-medium text-slate-400 font-sans">un</span></p>
          <p className="text-[10px] text-slate-400 font-sans">Distribuídas em {totalItemsCount} peças catalogadas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Valor do Estoque (Custo)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-display">R$ {totalStockCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-slate-400 font-sans">Capital investido em mercadorias</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Valor Potencial de Venda</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-display">R$ {totalStockSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-slate-400 font-sans">Lucro projetado: R$ {(totalStockSalesValue - totalStockCostValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-2xs space-y-1 ${
          lowStockCount > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Alertas de Estoque Baixo</span>
            <ShieldAlert className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black font-display ${lowStockCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {lowStockCount} <span className="text-xs font-medium text-slate-500 font-sans">itens</span>
          </p>
          <p className="text-[10px] text-slate-500 font-sans">Itens abaixo do estoque mínimo configurado</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CATALOG & PHYSICAL INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4" id="tab-content-catalog">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  id="part-search-input"
                  type="text" 
                  placeholder="Buscar por nome, código ou prateleira..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition font-sans"
                />
              </div>

              {/* Category Filter */}
              <select
                id="select-category-filter"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Todas Categorias</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                id="select-stock-filter"
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value as any)}
                className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Todos os Status</option>
                <option value="low">⚠️ Apenas Estoque Baixo</option>
                <option value="normal">✅ Saldo Normal</option>
              </select>

              {/* Store / Branch Filter Combobox */}
              {userCanViewOtherStores ? (
                <div className="flex items-center gap-1.5 bg-indigo-50/90 px-2.5 py-1.5 rounded-lg border border-indigo-200">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    id="select-store-stock-filter"
                    value={selectedStoreFilter}
                    onChange={e => setSelectedStoreFilter(e.target.value)}
                    className="text-xs border-none bg-transparent font-bold text-indigo-950 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">🏬 Todas as Lojas / Filiais (Rede)</option>
                    {(db.registeredCompanies && db.registeredCompanies.length > 0 ? db.registeredCompanies : [db.companyInfo]).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyType === 'filial' ? '🏬' : '🏢'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Estoque Restrito à Sua Loja</span>
                </div>
              )}
            </div>

            {/* Add Part Button */}
            {!isFormOpen && (
              <button 
                id="btn-add-part"
                type="button"
                onClick={openNewForm} 
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-3xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Peça Manualmente
              </button>
            )}
          </div>

          {/* Form Modal / Panel */}
          {isFormOpen && (
            <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-lg animate-slide-up space-y-4" id="part-form-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  {editingPart ? `Editar Peça: ${editingPart.name}` : 'Cadastrar Nova Peça no Estoque'}
                </h3>
                <button 
                  id="btn-close-part-form"
                  type="button"
                  onClick={resetForm} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4" id="form-part">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-name-input">Nome / Descrição da Peça *</label>
                  <input 
                    id="part-name-input"
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Amortecedor Dianteiro Cofap TurboGás" 
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-500 font-sans"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-code-input">Código da Peça / SKU * (Único)</label>
                  <input 
                    id="part-code-input"
                    type="text" 
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Ex: PE-045" 
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-500 font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-category-input">Categoria</label>
                  <input 
                    id="part-category-input"
                    type="text" 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Ex: Freios, Suspensão, Óleos, Filtros" 
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-stock-input">Estoque Inicial (Saldo) *</label>
                  <input 
                    id="part-stock-input"
                    type="number" 
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    min="0"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-minstock-input">Estoque Mínimo (Alerta)</label>
                  <input 
                    id="part-minstock-input"
                    type="number" 
                    value={minStock}
                    onChange={e => setMinStock(Number(e.target.value))}
                    min="0"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-costprice-input">Preço de Custo (Compra) R$</label>
                  <input 
                    id="part-costprice-input"
                    type="number" 
                    value={costPrice}
                    onChange={e => setCostPrice(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-price-input">Preço de Venda Unitário R$ *</label>
                  <input 
                    id="part-price-input"
                    type="number" 
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold text-indigo-700 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-location-input">Localização / Prateleira</label>
                  <input 
                    id="part-location-input"
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: Prateleira A-2, Galpão B" 
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="part-supplier-input">Último Fornecedor</label>
                  <input 
                    id="part-supplier-input"
                    type="text" 
                    value={lastSupplier}
                    onChange={e => setLastSupplier(e.target.value)}
                    placeholder="Ex: AutoPeças Brasil S/A" 
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                {/* UNIDADE DE MEDIDA & CÁLCULO POR DIMENSÕES */}
                <div className="md:col-span-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-4 my-1" id="part-uom-section">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/70 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <Ruler className="w-4 h-4 text-indigo-600" />
                        Unidade de Medida & Cálculo por Dimensões (Metragem Linear, Área m², Volume m³)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Selecione a unidade de medida do produto. Caso seja calculada por metro linear, área ou volume, informe as dimensões padrão da peça.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-uom-select">Unidade de Medida *</label>
                      <select
                        id="part-uom-select"
                        value={unitOfMeasureId || unit}
                        onChange={e => {
                          const val = e.target.value;
                          const matchedUom = (db.unitsOfMeasure || []).find(u => u.id === val || (u.acronym || u.code) === val);
                          if (matchedUom) {
                            setUnitOfMeasureId(matchedUom.id);
                            setUnit(matchedUom.acronym || matchedUom.code || 'UN');
                            setUnitName(matchedUom.name);
                          } else {
                            setUnitOfMeasureId('');
                            setUnit(val.toUpperCase());
                            setUnitName(val);
                          }
                        }}
                        className="w-full text-xs p-2 border border-indigo-200 rounded-lg bg-white font-bold text-indigo-900"
                      >
                        {(db.unitsOfMeasure || []).map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.acronym || uom.code} - {uom.name} ({uom.calculationType === 'LINEAR' ? '📏 Linear' : uom.calculationType === 'AREA' ? '📐 Área m²' : uom.calculationType === 'VOLUME' ? '📦 Volume m³' : '📦 Simples'})
                          </option>
                        ))}
                        {!(db.unitsOfMeasure || []).some(u => (u.acronym || u.code) === unit) && (
                          <option value={unit}>{unit} (Personalizado)</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2 flex items-end">
                      {(() => {
                        const selectedUom = (db.unitsOfMeasure || []).find(u => u.id === unitOfMeasureId || (u.acronym || u.code) === unit);
                        const isLinear = selectedUom?.calculationType === 'LINEAR';
                        const isArea = selectedUom?.calculationType === 'AREA';
                        const isVolume = selectedUom?.calculationType === 'VOLUME';

                        return (
                          <div className="w-full text-xs bg-white p-2.5 rounded-lg border border-indigo-100 flex items-center justify-between">
                            <span className="text-slate-600 font-medium">
                              Tipo de Cálculo: <strong className="text-indigo-700 uppercase">{selectedUom?.calculationType || 'SIMPLES'}</strong>
                              {isLinear && ' • Faturamento e Estoque calculados por Comprimento (Metro Linear)'}
                              {isArea && ' • Faturamento e Estoque calculados por Área (Comprimento × Largura)'}
                              {isVolume && ' • Faturamento e Estoque calculados por Volume (Comprimento × Largura × Altura)'}
                              {!isLinear && !isArea && !isVolume && ' • Faturamento direto por Quantidade × Preço Unitário'}
                            </span>
                            <span className="text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                              Sigla: {unit}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* CAMPOS DE DIMENSÕES SE UOM FOR LINEAR, AREA OU VOLUME */}
                  {(() => {
                    const selectedUom = (db.unitsOfMeasure || []).find(u => u.id === unitOfMeasureId || (u.acronym || u.code) === unit);
                    const calcType = selectedUom?.calculationType;
                    const needsDimensions = calcType === 'LINEAR' || calcType === 'AREA' || calcType === 'VOLUME';

                    if (!needsDimensions) return null;

                    return (
                      <div className="bg-white p-3.5 rounded-lg border border-indigo-200/70 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                          Dimensões Padrão do Produto (Medidas Físicas)
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700" htmlFor="dim-length-input">Comprimento *</label>
                            <div className="flex gap-1">
                              <input
                                id="dim-length-input"
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder="0.00"
                                value={dimLength ?? ''}
                                onChange={e => setDimLength(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono font-bold"
                              />
                              <select
                                value={dimUnitLength}
                                onChange={e => setDimUnitLength(e.target.value as any)}
                                className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                              >
                                <option value="m">m</option>
                                <option value="cm">cm</option>
                                <option value="mm">mm</option>
                              </select>
                            </div>
                          </div>

                          {(calcType === 'AREA' || calcType === 'VOLUME') && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700" htmlFor="dim-width-input">Largura *</label>
                              <div className="flex gap-1">
                                <input
                                  id="dim-width-input"
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  placeholder="0.00"
                                  value={dimWidth ?? ''}
                                  onChange={e => setDimWidth(e.target.value ? Number(e.target.value) : undefined)}
                                  className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono font-bold"
                                />
                                <select
                                  value={dimUnitWidth}
                                  onChange={e => setDimUnitWidth(e.target.value as any)}
                                  className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                                >
                                  <option value="m">m</option>
                                  <option value="cm">cm</option>
                                  <option value="mm">mm</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {calcType === 'VOLUME' && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700" htmlFor="dim-height-input">Altura / Espessura *</label>
                              <div className="flex gap-1">
                                <input
                                  id="dim-height-input"
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  placeholder="0.00"
                                  value={dimHeight ?? ''}
                                  onChange={e => setDimHeight(e.target.value ? Number(e.target.value) : undefined)}
                                  className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono font-bold"
                                />
                                <select
                                  value={dimUnitHeight}
                                  onChange={e => setDimUnitHeight(e.target.value as any)}
                                  className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                                >
                                  <option value="m">m</option>
                                  <option value="cm">cm</option>
                                  <option value="mm">mm</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Prévia do cálculo dimensional */}
                        {dimLength && (
                          <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-md text-xs flex items-center justify-between">
                            <span>
                              {calcType === 'LINEAR' && (
                                <>Medida linear por unidade: <strong>{dimLength} {dimUnitLength}</strong></>
                              )}
                              {calcType === 'AREA' && dimWidth && (
                                <>Área calculada: <strong>{dimLength}{dimUnitLength} × {dimWidth}{dimUnitWidth} = {(dimLength * dimWidth).toFixed(3)} m²</strong> por peça</>
                              )}
                              {calcType === 'VOLUME' && dimWidth && dimHeight && (
                                <>Volume calculado: <strong>{dimLength}{dimUnitLength} × {dimWidth}{dimUnitWidth} × {dimHeight}{dimUnitHeight} = {(dimLength * dimWidth * dimHeight).toFixed(4)} m³</strong> por peça</>
                              )}
                            </span>
                            <span className="text-[10px] font-semibold bg-indigo-200/70 text-indigo-950 px-2 py-0.5 rounded">
                              Preço de venda R$ {price.toFixed(2)} por {unit}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* CLASSIFICAÇÃO FISCAL E REGRAS DA CONTABILIDADE */}
                <div className="md:col-span-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4 my-1" id="part-fiscal-fields-section">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <FileCode className="w-4 h-4 text-emerald-600" />
                        Informações Fiscais & Tributação do Produto (Orientações da Contabilidade / SEFAZ)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Defina NCM, CEST, Origem e tributações (CSOSN/CST ICMS, PIS, COFINS, IPI). Ao importar o XML da NFe do fornecedor, esses dados são atualizados automaticamente conforme a nota fiscal.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-ncm-field">NCM Fiscal *</label>
                      <input
                        id="part-ncm-field"
                        type="text"
                        value={ncm}
                        onChange={e => setNcm(e.target.value)}
                        placeholder="Ex: 8708.30.90"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-cest-field">CEST (Subst. Tributária)</label>
                      <input
                        id="part-cest-field"
                        type="text"
                        value={cest}
                        onChange={e => setCest(e.target.value)}
                        placeholder="Ex: 01.001.00"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-origem-field">Origem da Mercadoria</label>
                      <select
                        id="part-origem-field"
                        value={origem}
                        onChange={e => setOrigem(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium"
                      >
                        <option value="0">0 - Nacional</option>
                        <option value="1">1 - Estrangeira (Importação Direta)</option>
                        <option value="2">2 - Estrangeira (Mercado Interno)</option>
                        <option value="3">3 - Nacional (&gt;40% Importação)</option>
                        <option value="4">4 - Nacional (Processos Básicos)</option>
                        <option value="5">5 - Nacional (&lt;=40% Importação)</option>
                        <option value="6">6 - Estrangeira (Sem Similar Nacional)</option>
                        <option value="7">7 - Estrangeira (Adquirida Mercado Interno)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-csosn-field">CSOSN / CST ICMS</label>
                      <select
                        id="part-csosn-field"
                        value={icmsCstOrCsosn}
                        onChange={e => setIcmsCstOrCsosn(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium"
                      >
                        <option value="101">101 - Simples Nacional com Crédito</option>
                        <option value="102">102 - Simples Nacional sem Crédito</option>
                        <option value="500">500 - ICMS por Substituição Tributária</option>
                        <option value="900">900 - Outros (Simples Nacional)</option>
                        <option value="00">00 - Tributada Integral (Regime Normal)</option>
                        <option value="20">20 - Com Redução de Base de Cálculo</option>
                        <option value="60">60 - ICMS Cobrado Anteriormente por ST</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-icmsrate-field">Alíquota ICMS (%)</label>
                      <input
                        id="part-icmsrate-field"
                        type="number"
                        value={icmsRatePercent}
                        onChange={e => setIcmsRatePercent(Number(e.target.value))}
                        min="0"
                        step="0.1"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-piscst-field">CST PIS</label>
                      <select
                        id="part-piscst-field"
                        value={pisCst}
                        onChange={e => setPisCst(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium"
                      >
                        <option value="01">01 - Tributável Alíquota Normal</option>
                        <option value="07">07 - Operação Isenta de PIS</option>
                        <option value="08">08 - Sem Incidência de PIS</option>
                        <option value="49">49 - Outras Operações de Saída</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-cofinscst-field">CST COFINS</label>
                      <select
                        id="part-cofinscst-field"
                        value={cofinsCst}
                        onChange={e => setCofinsCst(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium"
                      >
                        <option value="01">01 - Tributável Alíquota Normal</option>
                        <option value="07">07 - Operação Isenta de COFINS</option>
                        <option value="08">08 - Sem Incidência de COFINS</option>
                        <option value="49">49 - Outras Operações de Saída</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="part-anp-field">Código ANP / Benefício Fiscal</label>
                      <input
                        id="part-anp-field"
                        type="text"
                        value={anpCode}
                        onChange={e => setAnpCode(e.target.value)}
                        placeholder="ANP (ex: 820101001 óleos)"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTROLE DE PRODUTO / PEÇA PERIÓDICA */}
                <div className="md:col-span-3 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-3 my-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 font-display">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Produto Periódico / Item de Manutenção Preventiva
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Ative caso esta peça (ex: óleo, filtro, pneu, fluído) exija acompanhamento de troca preventiva.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer" htmlFor="toggle-part-periodic">
                      <input
                        id="toggle-part-periodic"
                        type="checkbox"
                        checked={isPeriodic}
                        onChange={e => setIsPeriodic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-xs font-bold text-indigo-900">
                        {isPeriodic ? 'Periódico Sim' : 'Não'}
                      </span>
                    </label>
                  </div>

                  {isPeriodic && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-indigo-100">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipo de Manutenção</label>
                        <select
                          value={maintCategory}
                          onChange={e => setMaintCategory(e.target.value as any)}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md bg-white"
                        >
                          <option value="oil_change">🛢️ Troca de Óleo / Filtros</option>
                          <option value="tire_change">🚗 Pneus e Rodas</option>
                          <option value="tire_alignment_balance">⚖️ Alinhamento / Balanceamento</option>
                          <option value="general_maintenance">🔧 Revisão Periódica / Correia</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Intervalo KM Padrão</label>
                        <input
                          type="number"
                          step="1000"
                          value={defaultIntervalKm}
                          onChange={e => setDefaultIntervalKm(Number(e.target.value))}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Intervalo Dias (Meses)</label>
                        <input
                          type="number"
                          step="30"
                          value={defaultIntervalDays}
                          onChange={e => setDefaultIntervalDays(Number(e.target.value))}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTROLE DE VENDA CASADA (CROSS-SELLING) */}
                <div className="md:col-span-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-3 my-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5 font-display">
                        <LinkIcon className="w-4 h-4 text-amber-600" />
                        Venda Casada / Itens & Serviços Vinculados
                      </h4>
                      <p className="text-[11px] text-amber-900/80">
                        Ex: Óleo de Motor casa automaticamente com a mão de obra de Troca de Óleo e o Filtro de Óleo. Ao orçar este produto, os itens vinculados serão sugeridos/inseridos automaticamente.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer" htmlFor="toggle-part-cross-sell">
                      <input
                        id="toggle-part-cross-sell"
                        type="checkbox"
                        checked={isCrossSell}
                        onChange={e => setIsCrossSell(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      <span className="ml-2 text-xs font-bold text-amber-950">
                        {isCrossSell ? 'Venda Casada Sim' : 'Não'}
                      </span>
                    </label>
                  </div>

                  {isCrossSell && (
                    <div className="space-y-3 bg-white p-3.5 rounded-lg border border-amber-200">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipo de Item Casado</label>
                          <select
                            value={csType}
                            onChange={e => {
                              const t = e.target.value as 'service' | 'part';
                              setCsType(t);
                              setCsItemId('');
                            }}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold"
                          >
                            <option value="service">🛠️ Serviço / Mão de Obra</option>
                            <option value="part">📦 Peça / Produto</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            {csType === 'service' ? 'Selecione o Serviço Cadastrado' : 'Selecione a Peça Cadastrada'}
                          </label>
                          <select
                            value={csItemId}
                            onChange={e => setCsItemId(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                          >
                            <option value="">-- Selecione o item --</option>
                            {csType === 'service'
                              ? db.services.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} - R$ {s.price.toFixed(2)}
                                  </option>
                                ))
                              : db.parts
                                  .filter(p => !editingPart || p.id !== editingPart.id)
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.code}) - R$ {p.price.toFixed(2)}
                                    </option>
                                  ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Qtd Padrão</label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={csQty}
                              onChange={e => setCsQty(Math.max(1, Number(e.target.value)))}
                              className="w-20 text-xs p-2 border border-slate-200 rounded-lg font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!csItemId) return;
                                const selectedName = csType === 'service'
                                  ? db.services.find(s => s.id === csItemId)?.name || 'Serviço'
                                  : db.parts.find(p => p.id === csItemId)?.name || 'Peça';

                                if (crossSellItems.some(item => item.itemId === csItemId && item.type === csType)) {
                                  return;
                                }

                                const newItem: CrossSellItem = {
                                  id: `cs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                  type: csType,
                                  itemId: csItemId,
                                  name: selectedName,
                                  defaultQuantity: csQty
                                };

                                setCrossSellItems(prev => [...prev, newItem]);
                                setCsItemId('');
                                setCsQty(1);
                              }}
                              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center cursor-pointer shrink-0"
                              title="Vincular item casado"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Itens Casados Atuais */}
                      {crossSellItems.length > 0 && (
                        <div className="pt-2 border-t border-amber-100">
                          <span className="text-[11px] font-bold text-amber-900 block mb-1.5">
                            Itens Vinculados nesta Venda Casada ({crossSellItems.length}):
                          </span>
                          <div className="space-y-1.5">
                            {crossSellItems.map(item => (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-amber-50/80 rounded-lg border border-amber-200 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.type === 'service' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {item.type === 'service' ? 'Serviço' : 'Peça'}
                                  </span>
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  <span className="text-slate-500 font-mono">(Qtd: {item.defaultQuantity})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCrossSellItems(prev => prev.filter(i => i.id !== item.id))}
                                  className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded transition"
                                  title="Remover vínculo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex gap-3 md:col-span-3">
                  <button 
                    id="btn-save-part"
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-3xs cursor-pointer"
                  >
                    {editingPart ? 'Salvar Alterações' : 'Salvar Peça no Estoque'}
                  </button>
                  <button 
                    id="btn-cancel-part"
                    type="button" 
                    onClick={resetForm} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-lg transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Catalog Parts Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden" id="parts-list-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="parts-table">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 bg-slate-50">
                    <th className="p-3.5">Peça & Categoria</th>
                    <th className="p-3.5">Código / NCM</th>
                    <th className="p-3.5">Localização</th>
                    <th className="p-3.5">Balanço do Estoque (Físico / Reservado / Disponível)</th>
                    <th className="p-3.5">Custo Unit.</th>
                    <th className="p-3.5">Preço Venda</th>
                    <th className="p-3.5">Margem (%)</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Nenhuma peça encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map(part => {
                      const stockDetails = getPartStockDetails(part, db.budgets, db.serviceOrders);
                      const isLowStock = stockDetails.isLowStock;
                      const cost = part.costPrice || 0;
                      const marginPercent = cost > 0 ? Math.round(((part.price - cost) / cost) * 100) : 0;

                      return (
                        <tr key={part.id} className="hover:bg-slate-50/70 transition" id={`part-row-${part.id}`}>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-800">{part.name}</p>
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                                    {part.unit || 'UN'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-semibold">{part.category || 'Geral'}</span>
                                  {part.dimensions && (part.dimensions.length || part.dimensions.width) && (
                                    <span className="text-[10px] text-indigo-600 bg-indigo-50/50 px-1 rounded flex items-center gap-1">
                                      <Ruler className="w-2.5 h-2.5" />
                                      {part.dimensions.length}{part.dimensions.unitLength || 'm'}
                                      {part.dimensions.width && ` × ${part.dimensions.width}${part.dimensions.unitWidth || 'm'}`}
                                      {part.dimensions.height && ` × ${part.dimensions.height}${part.dimensions.unitHeight || 'm'}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-[11px]">
                            <p className="font-bold text-slate-700 uppercase">{part.code}</p>
                            {part.ncm && <p className="text-[10px] text-slate-400">NCM: {part.ncm}</p>}
                          </td>

                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {part.location || 'Sem prateleira'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Estoque Físico Total">
                                  Físico: {stockDetails.totalStock} {part.unit || 'UN'}
                                </span>
                                {stockDetails.reservedStock > 0 && (
                                  <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Reservado em orçamentos">
                                    Reservado: {stockDetails.reservedStock}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded font-bold border ${
                                  stockDetails.availableStock > 0 
                                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
                                    : 'text-rose-800 bg-rose-50 border-rose-200'
                                }`} title="Livre para venda imediata">
                                  Disp: {stockDetails.availableStock}
                                </span>
                              </div>
                              {isLowStock && (
                                <div className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1 w-fit">
                                  <ShieldAlert className="w-3 h-3" /> Estoque Baixo (Mín: {stockDetails.minStock})
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-slate-600">
                            R$ {(part.costPrice || 0).toFixed(2)}
                          </td>

                          <td className="p-3.5 font-mono font-bold text-slate-800">
                            R$ {part.price.toFixed(2)}
                          </td>

                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              marginPercent >= 40 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              +{marginPercent}%
                            </span>
                          </td>

                          <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                            <button 
                              id={`btn-adjust-part-${part.id}`}
                              type="button"
                              onClick={() => {
                                setAdjustPart(part);
                                setAdjustType('in');
                                setAdjustQty(1);
                                setAdjustReason('');
                              }} 
                              className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition inline-flex items-center gap-1 text-[11px] font-bold"
                              title="Movimentação / Ajuste Rápido de Saldo"
                            >
                              <ArrowUpDown className="w-3 h-3" /> Movimentar
                            </button>

                            <button 
                              id={`btn-edit-part-${part.id}`}
                              type="button"
                              onClick={() => openEditForm(part)} 
                              className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md transition inline-flex items-center gap-1 text-[11px] font-bold"
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </button>
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

      {/* ========================================================================= */}
      {/* TAB 2: IMPORTAR NOTA FISCAL (NFe XML) */}
      {/* ========================================================================= */}
      {activeTab === 'nfe' && (
        <div className="space-y-6" id="tab-content-nfe">
          {/* NFe Import Header Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-emerald-600" />
                  Importação Automática de Nota Fiscal Eletrônica (NFe XML)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Carregue o arquivo XML ou digite os dados da nota. O sistema extrai automaticamente o fornecedor, os produtos, quantidades e custos unitários para dar entrada direta no estoque.
                </p>
              </div>

              {/* Sample XML Button */}
              <button
                id="btn-load-sample-xml"
                type="button"
                onClick={handleLoadSampleXML}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-xs font-bold transition shadow-3xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                ⚡ Testar com NFe de Exemplo (1-Clique)
              </button>
            </div>

            {/* Input Method Selector */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                id="btn-nfe-mode-file"
                type="button"
                onClick={() => setNfeInputMode('file')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  nfeInputMode === 'file' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload de Arquivo .XML
              </button>

              <button
                id="btn-nfe-mode-text"
                type="button"
                onClick={() => setNfeInputMode('text')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  nfeInputMode === 'text' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4" /> Colar Código XML Manualmente
              </button>
            </div>

            {/* MODE A: Upload File */}
            {nfeInputMode === 'file' && (
              <div 
                className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/20 hover:bg-indigo-50/40 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                id="nfe-file-dropzone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xml" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="input-nfe-file"
                />
                <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Clique aqui ou arraste o arquivo XML da Nota Fiscal</p>
                <p className="text-xs text-slate-400 mt-1">Suporta arquivos .XML padrão NFe v4.00 da Receita Federal</p>
              </div>
            )}

            {/* MODE B: Paste Text */}
            {nfeInputMode === 'text' && (
              <div className="space-y-3" id="nfe-text-paste-zone">
                <textarea
                  id="textarea-xml-raw"
                  rows={6}
                  value={xmlRawText}
                  onChange={e => setXmlRawText(e.target.value)}
                  placeholder="Cole aqui a string completa do XML da NFe (ex: <nfeProc><NFe>...)"
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 transition"
                />
                <div className="flex justify-end">
                  <button
                    id="btn-parse-pasted-xml"
                    type="button"
                    onClick={handleParsePastedXML}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg transition shadow-3xs cursor-pointer flex items-center gap-2"
                  >
                    <FileCheck2 className="w-4 h-4" /> Analisar XML Colado
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PARSED NFE PREVIEW & CONFIRMATION TABLE */}
          {parsedNFe && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-md p-6 space-y-6 animate-slide-up" id="nfe-parsed-preview-panel">
              {/* Header Info Banner */}
              <div className="bg-slate-900 text-white p-4.5 rounded-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                        NFe #{parsedNFe.nNF} (Série {parsedNFe.serie || '1'})
                      </span>
                      {parsedNFe.isCnpjValid === false ? (
                        <span className="text-[10px] font-bold uppercase text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded border border-rose-700 font-mono flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> CNPJ Incompatível
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700 font-mono flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> CNPJ Validado
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold font-display mt-1 text-slate-100">{parsedNFe.emitente}</h3>
                    <p className="text-xs text-slate-400 font-mono">CNPJ Emitente: {formatCNPJ(parsedNFe.cnpjEmitente) || 'Não informado'} • Data: {new Date(parsedNFe.dhEmi).toLocaleDateString('pt-BR')}</p>
                  </div>

                  <div className="text-right border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Total da Nota Fiscal</p>
                    <p className="text-2xl font-black text-emerald-400 font-display">R$ {parsedNFe.vNF.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">{parsedNFe.items.length} itens localizados no XML</p>
                  </div>
                </div>

                {/* Recipient CNPJ Comparison Info Bar */}
                <div className="border-t border-slate-800/80 pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400">Destinatário na NF-e:</span>
                    <span className="font-mono font-bold text-slate-100">
                      {parsedNFe.destinatario ? `${parsedNFe.destinatario} • ` : ''}{parsedNFe.cnpjDestinatario ? formatCNPJ(parsedNFe.cnpjDestinatario) : 'CNPJ Não Informado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-400">Empresa no Sistema:</span>
                    <span className="font-mono font-bold text-slate-100">
                      {db.companyInfo?.name ? `${db.companyInfo.name} • ` : ''}{db.companyInfo?.cnpj ? formatCNPJ(db.companyInfo.cnpj) : 'CNPJ Não Cadastrado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CNPJ VALIDATION ALERT BANNER */}
              {parsedNFe.isCnpjValid === false ? (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 space-y-2 text-rose-950 animate-fade-in" id="nfe-cnpj-mismatch-alert">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
                    <span>IMPORTAÇÃO BLOQUEADA — CNPJ DO DESTINATÁRIO DIVERGENTE</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    {parsedNFe.cnpjMismatchWarning || `O CNPJ do destinatário da NF-e (${formatCNPJ(parsedNFe.cnpjDestinatario)}) não coincide com o CNPJ cadastrado para a sua empresa (${formatCNPJ(db.companyInfo?.cnpj)}).`}
                  </p>
                  <p className="text-[11px] font-semibold text-rose-950 bg-rose-100/90 p-2.5 rounded-lg border border-rose-200/80 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    Para prevenir entradas fiscais incorretas ou fraude de estoque de terceiros, o sistema bloqueia a importação de Notas Fiscais emitidas para outros CNPJs.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-emerald-900 text-xs font-semibold" id="nfe-cnpj-valid-badge">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Validação de CNPJ Aprovada: O destinatário no XML ({formatCNPJ(parsedNFe.cnpjDestinatario)}) é exatamente o mesmo da empresa cadastrada no sistema.</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                    Verificado
                  </span>
                </div>
              )}

              {/* Items Matching Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Revisão e Vínculo de Itens da NFe com o Estoque</h4>
                  <span className="text-[11px] text-slate-400">Verifique se deseja vincular a peças existentes ou cadastrar novas peças</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse" id="nfe-items-table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <th className="p-3">Código (NFe)</th>
                        <th className="p-3">Descrição do Produto (XML)</th>
                        <th className="p-3">Qtd / Un.</th>
                        <th className="p-3">Custo Unit. (NFe)</th>
                        <th className="p-3">Subtotal</th>
                        <th className="p-3">Ação no Sistema</th>
                        <th className="p-3">Preço de Venda Sugerido (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {parsedNFe.items.map((item, idx) => {
                        const matchedPart = db.parts.find(p => p.id === item.matchedPartId);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-700 uppercase">{item.cProd}</td>

                            <td className="p-3">
                              <p className="font-bold text-slate-800">{item.xProd}</p>
                              {item.ncm && <span className="text-[10px] text-slate-400 font-mono">NCM: {item.ncm}</span>}
                            </td>

                            <td className="p-3 font-bold text-slate-800">
                              {item.qCom} {item.uCom || 'UN'}
                            </td>

                            <td className="p-3 font-mono text-slate-700">
                              R$ {item.vUnCom.toFixed(2)}
                            </td>

                            <td className="p-3 font-mono font-bold text-slate-900">
                              R$ {item.vProd.toFixed(2)}
                            </td>

                            <td className="p-3">
                              <select
                                value={item.action}
                                onChange={e => {
                                  const updatedItems = [...parsedNFe.items];
                                  updatedItems[idx].action = e.target.value as any;
                                  setParsedNFe({ ...parsedNFe, items: updatedItems });
                                }}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border ${
                                  item.action === 'update_stock' 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : item.action === 'create_new' 
                                    ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                <option value="update_stock">
                                  {matchedPart ? `➕ Incrementar Saldo de: ${matchedPart.name}` : '➕ Incrementar Peça Existente'}
                                </option>
                                <option value="create_new">✨ Cadastrar como Nova Peça</option>
                                <option value="ignore">⛔ Ignorar Item</option>
                              </select>
                            </td>

                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={item.suggestedSalePrice || 0}
                                onChange={e => {
                                  const updatedItems = [...parsedNFe.items];
                                  updatedItems[idx].suggestedSalePrice = parseFloat(e.target.value) || 0;
                                  setParsedNFe({ ...parsedNFe, items: updatedItems });
                                }}
                                className="w-28 text-xs px-2 py-1 border border-slate-200 rounded font-mono font-bold text-indigo-700"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setParsedNFe(null)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                >
                  Cancelar Importação
                </button>

                <button
                  id="btn-commit-nfe-import"
                  type="button"
                  disabled={parsedNFe.isCnpjValid === false}
                  onClick={handleCommitNFeImport}
                  className={`font-bold text-sm px-6 py-3 rounded-xl transition shadow-md flex items-center gap-2 ${
                    parsedNFe.isCnpjValid === false
                      ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                  title={parsedNFe.isCnpjValid === false ? 'Importação desativada: CNPJ do destinatário não coincide com o CNPJ da empresa.' : 'Dar entrada das peças e atualizar estoque'}
                >
                  {parsedNFe.isCnpjValid === false ? (
                    <>
                      <Lock className="w-5 h-5 text-slate-400" />
                      Importação Bloqueada (CNPJ Incompatível)
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Efetivar Importação da NFe e Dar Entrada no Estoque
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXTRATO DE MOVIMENTAÇÕES DE ESTOQUE */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden space-y-4 p-5" id="tab-content-movements">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-display">Extrato Auditável de Movimentações</h3>
              <p className="text-xs text-slate-500">Histórico completo de entradas por NFe, baixas por OS e ajustes manuais no estoque.</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
              {stockMovements.length} Registros Auditados
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse" id="movements-table">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Peça / Código</th>
                  <th className="p-3.5">Quantidade</th>
                  <th className="p-3.5">Custo Unit.</th>
                  <th className="p-3.5">Motivo / Documento</th>
                  <th className="p-3.5">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhuma movimentação de estoque registrada.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(mov.date).toLocaleString('pt-BR')}
                      </td>

                      <td className="p-3.5">
                        {mov.type === 'in' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Entrada
                          </span>
                        )}
                        {mov.type === 'out' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 uppercase">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Saída
                          </span>
                        )}
                        {mov.type === 'adjustment' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 uppercase">
                            <RefreshCw className="w-3 h-3 text-slate-600" /> Ajuste
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">{mov.partName}</p>
                        <span className="text-[10px] font-mono text-slate-400">{mov.partCode}</span>
                      </td>

                      <td className="p-3.5 font-bold text-sm">
                        {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : ''}{mov.quantity} un
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">
                        {mov.unitCost ? `R$ ${mov.unitCost.toFixed(2)}` : '-'}
                      </td>

                      <td className="p-3.5 text-slate-700">
                        {mov.reason}
                      </td>

                      <td className="p-3.5 text-slate-500 font-medium">
                        {mov.userName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MANUAL ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {adjustPart && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="adjust-part-modal">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-slide-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm font-display">Movimentação Manual: {adjustPart.name}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setAdjustPart(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Saldo Atual no Estoque:</span>
                <span className="font-bold text-slate-800 font-mono text-sm">{adjustPart.stock} {adjustPart.unit || 'UN'}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Tipo de Movimentação *</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="in">➕ Entrada de Estoque (Compra Avulsa)</option>
                  <option value="out">➖ Saída de Estoque (Perda / Avaria / Uso)</option>
                  <option value="adjustment">🔄 Ajuste Direto de Inventário (Definir Novo Saldo)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  {adjustType === 'adjustment' ? 'Novo Saldo Total *' : 'Quantidade *'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Motivo / Justificativa *</label>
                <input
                  type="text"
                  placeholder="Ex: Compra local emergencial, Contagem de inventário, Peça danificada"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-sans"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  id="btn-submit-adjust"
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition shadow-3xs cursor-pointer"
                >
                  Confirmar Movimentação
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustPart(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
