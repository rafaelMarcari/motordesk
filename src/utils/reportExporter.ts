import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';

export interface ReportExportData {
  title: string;
  subtitle?: string;
  category?: string;
  companyName?: string;
  companyDoc?: string; // CNPJ
  generatedBy?: string;
  generatedAt?: string;
  period?: string;
  summaryCards?: Array<{ label: string; value: string | number; detail?: string }>;
  columns: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right' }>;
  rows: Array<Record<string, any>>;
  elementIdToCapture?: string; // Para captura visual de gráficos PDF
}

export type ExportFormat = 'PDF' | 'DOCX' | 'XLSX' | 'XLS' | 'CSV' | 'JSON' | 'XML' | 'PRINT';

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

// --------------------------------------------------------------------------------------
// 1. EXPORTAÇÃO CSV (UTF-8 com BOM para Excel)
// --------------------------------------------------------------------------------------
export function exportToCsv(data: ReportExportData) {
  const headers = data.columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';');
  const rows = data.rows.map(row => {
    return data.columns
      .map(col => {
        let val = row[col.key];
        if (val === undefined || val === null) val = '';
        if (typeof val === 'number') {
          val = String(val).replace('.', ',');
        } else {
          val = String(val).replace(/"/g, '""');
        }
        return `"${val}"`;
      })
      .join(';');
  });

  const metadata = [
    `# Relatório: ${data.title}`,
    data.subtitle ? `# Subtítulo: ${data.subtitle}` : '',
    data.companyName ? `# Empresa: ${data.companyName} (${data.companyDoc || ''})` : '',
    data.period ? `# Período: ${data.period}` : '',
    `# Gerado por: ${data.generatedBy || 'Sistema'} em ${data.generatedAt || new Date().toLocaleString('pt-BR')}`,
    ''
  ].filter(Boolean).join('\r\n');

  const csvContent = '\uFEFF' + metadata + '\r\n' + headers + '\r\n' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(blob, filename);
}

// --------------------------------------------------------------------------------------
// 2. EXPORTAÇÃO XLSX & XLS (SheetJS)
// --------------------------------------------------------------------------------------
export function exportToExcel(data: ReportExportData, format: 'xlsx' | 'xls' = 'xlsx') {
  const sheetData: any[][] = [];

  sheetData.push([data.title.toUpperCase()]);
  if (data.subtitle) sheetData.push([data.subtitle]);
  if (data.companyName) sheetData.push([`Empresa: ${data.companyName} ${data.companyDoc ? ' - CNPJ: ' + data.companyDoc : ''}`]);
  if (data.period) sheetData.push([`Período: ${data.period}`]);
  sheetData.push([`Emissão: ${data.generatedAt || new Date().toLocaleString('pt-BR')} | Responsável: ${data.generatedBy || 'Sistema'}`]);
  sheetData.push([]); // linha em branco

  if (data.summaryCards && data.summaryCards.length > 0) {
    sheetData.push(['RESUMO EXECUTIVO']);
    const cardLabels = data.summaryCards.map(c => c.label);
    const cardValues = data.summaryCards.map(c => c.value);
    sheetData.push(cardLabels);
    sheetData.push(cardValues);
    sheetData.push([]);
  }

  sheetData.push(data.columns.map(c => c.label));

  data.rows.forEach(row => {
    const rowValues = data.columns.map(col => {
      const val = row[col.key];
      return val === undefined || val === null ? '' : val;
    });
    sheetData.push(rowValues);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const colWidths = data.columns.map(col => {
    let maxLen = col.label.length;
    data.rows.forEach(r => {
      const v = r[col.key];
      if (v !== undefined && v !== null) {
        maxLen = Math.max(maxLen, String(v).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = data.category ? data.category.slice(0, 30) : 'Relatório';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const bookType = format === 'xls' ? 'biff8' : 'xlsx';
  const out = XLSX.write(wb, { type: 'array', bookType });
  const mime = format === 'xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([out], { type: mime });
  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.${format}`;
  triggerDownload(blob, filename);
}

// --------------------------------------------------------------------------------------
// 3. EXPORTAÇÃO DOCX (Microsoft Word NATIVO)
// --------------------------------------------------------------------------------------
export async function exportToDocx(data: ReportExportData) {
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: data.columns.map(col => {
        return new TableCell({
          shading: { fill: '1e293b' },
          children: [
            new Paragraph({
              alignment: col.align === 'right' ? AlignmentType.RIGHT : col.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: col.label,
                  bold: true,
                  color: 'FFFFFF',
                  size: 18
                })
              ]
            })
          ]
        });
      })
    })
  );

  data.rows.forEach((row, index) => {
    const isEven = index % 2 === 0;
    tableRows.push(
      new TableRow({
        children: data.columns.map(col => {
          const val = row[col.key];
          const textVal = val === undefined || val === null ? '-' : String(val);
          return new TableCell({
            shading: isEven ? { fill: 'F8FAFC' } : { fill: 'FFFFFF' },
            children: [
              new Paragraph({
                alignment: col.align === 'right' ? AlignmentType.RIGHT : col.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: textVal,
                    size: 16
                  })
                ]
              })
            ]
          });
        })
      })
    );
  });

  const doc = new Document({
    title: data.title,
    description: data.subtitle || 'Relatório Gerencial do Sistema',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000
            }
          }
        },
        children: [
          new Paragraph({
            text: data.companyName ? `${data.companyName.toUpperCase()}` : 'RELATÓRIO GERENCIAL',
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: data.companyDoc ? ` • CNPJ: ${data.companyDoc}` : '',
                size: 16,
                color: '64748B'
              })
            ]
          }),
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100 }
          }),
          ...(data.subtitle
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.subtitle,
                      italics: true,
                      color: '475569',
                      size: 20
                    })
                  ],
                  spacing: { after: 150 }
                })
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: 'Emissão: ', bold: true }),
              new TextRun({ text: (data.generatedAt || new Date().toLocaleString('pt-BR')) + ' ' }),
              new TextRun({ text: '• Responsável: ', bold: true }),
              new TextRun({ text: (data.generatedBy || 'Sistema') + ' ' }),
              ...(data.period ? [new TextRun({ text: '• Período: ', bold: true }), new TextRun({ text: data.period })] : [])
            ],
            spacing: { after: 200 }
          }),
          ...(data.summaryCards && data.summaryCards.length > 0
            ? [
                new Paragraph({
                  text: 'RESUMO DE INDICADORES',
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 100, after: 100 }
                }),
                new Paragraph({
                  children: data.summaryCards.flatMap(c => [
                    new TextRun({ text: `[ ${c.label}: `, bold: true, color: '0F172A' }),
                    new TextRun({ text: `${c.value} `, bold: true, color: '2563EB' }),
                    new TextRun({ text: c.detail ? `(${c.detail}) ]  ` : ']  ', color: '64748B' })
                  ]),
                  spacing: { after: 250 }
                })
              ]
            : []),
          new Paragraph({
            text: 'DETALHAMENTO DE REGISTROS',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 100 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: 'Documento gerado eletronicamente pelo Sistema de Gestão Industrial & Comercial.',
                italics: true,
                size: 14,
                color: '94A3B8'
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.docx`;
  triggerDownload(blob, filename);
}

// --------------------------------------------------------------------------------------
// 4. EXPORTAÇÃO PDF ELEGANTE & VETORIAL
// --------------------------------------------------------------------------------------
export function exportToPdf(data: ReportExportData) {
  const doc = new jsPDF({
    orientation: data.columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 15;

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName || 'SISTEMA DE GESTÃO INDUSTRIAL & COMERCIAL', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Documento Oficial • ${data.companyDoc ? 'CNPJ: ' + data.companyDoc + ' • ' : ''}Emissão: ${data.generatedAt || new Date().toLocaleString('pt-BR')}`,
    14,
    18
  );

  currentY = 32;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 14, currentY);
  currentY += 6;

  if (data.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(data.subtitle, 14, currentY);
    currentY += 6;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const metaText = `Responsável: ${data.generatedBy || 'Sistema'} | ${data.period ? 'Período: ' + data.period + ' | ' : ''}Total de Registros: ${data.rows.length}`;
  doc.text(metaText, 14, currentY);
  currentY += 8;

  if (data.summaryCards && data.summaryCards.length > 0) {
    const cardWidth = Math.min(45, (pageWidth - 28) / data.summaryCards.length - 2);
    let cardX = 14;

    data.summaryCards.slice(0, 4).forEach(card => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, 14, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(card.label.toUpperCase(), cardX + 3, currentY + 4.5);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(String(card.value), cardX + 3, currentY + 10.5);

      cardX += cardWidth + 3;
    });

    currentY += 18;
  }

  const startX = 14;
  const tableWidth = pageWidth - 28;
  const colWidth = tableWidth / data.columns.length;

  doc.setFillColor(241, 245, 249);
  doc.rect(startX, currentY, tableWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  data.columns.forEach((col, idx) => {
    const colX = startX + idx * colWidth + 2;
    doc.text(col.label, colX, currentY + 5);
  });
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.rows.forEach((row, rowIdx) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;

      doc.setFillColor(241, 245, 249);
      doc.rect(startX, currentY, tableWidth, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      data.columns.forEach((col, idx) => {
        doc.text(col.label, startX + idx * colWidth + 2, currentY + 5);
      });
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, currentY - 1, tableWidth, 6, 'F');
    }

    doc.setTextColor(30, 41, 59);
    data.columns.forEach((col, idx) => {
      const val = row[col.key];
      const textVal = val === undefined || val === null ? '-' : String(val).slice(0, 35);
      const colX = startX + idx * colWidth + 2;
      doc.text(textVal, colX, currentY + 3.5);
    });

    currentY += 6;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages} • Documento confidencial para uso interno da organização`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// --------------------------------------------------------------------------------------
// 5. EXPORTAÇÃO JSON (BI / Integrações / API)
// --------------------------------------------------------------------------------------
export function exportToJson(data: ReportExportData) {
  const payload = {
    metadata: {
      reportTitle: data.title,
      subtitle: data.subtitle,
      company: data.companyName,
      companyDocument: data.companyDoc,
      generatedAt: data.generatedAt || new Date().toISOString(),
      generatedBy: data.generatedBy || 'Sistema',
      period: data.period,
      totalRows: data.rows.length
    },
    summaryCards: data.summaryCards || [],
    columns: data.columns,
    data: data.rows
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(blob, filename);
}

// --------------------------------------------------------------------------------------
// 6. EXPORTAÇÃO XML (B2B / EDI / Fiscais)
// --------------------------------------------------------------------------------------
export function exportToXml(data: ReportExportData) {
  const escapeXml = (unsafe: any) => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
  xml += `<relatorio tipo="${escapeXml(data.category || 'GERENCIAL')}">\r\n`;
  xml += '  <metadados>\r\n';
  xml += `    <titulo>${escapeXml(data.title)}</titulo>\r\n`;
  if (data.subtitle) xml += `    <subtitulo>${escapeXml(data.subtitle)}</subtitulo>\r\n`;
  if (data.companyName) xml += `    <empresa>${escapeXml(data.companyName)}</empresa>\r\n`;
  if (data.companyDoc) xml += `    <cnpj>${escapeXml(data.companyDoc)}</cnpj>\r\n`;
  xml += `    <dataEmissao>${escapeXml(data.generatedAt || new Date().toISOString())}</dataEmissao>\r\n`;
  xml += `    <responsavel>${escapeXml(data.generatedBy || 'Sistema')}</responsavel>\r\n`;
  if (data.period) xml += `    <periodo>${escapeXml(data.period)}</periodo>\r\n`;
  xml += `    <totalRegistros>${data.rows.length}</totalRegistros>\r\n`;
  xml += '  </metadados>\r\n';

  if (data.summaryCards && data.summaryCards.length > 0) {
    xml += '  <indicadoresResumo>\r\n';
    data.summaryCards.forEach(c => {
      xml += `    <indicador label="${escapeXml(c.label)}" valor="${escapeXml(c.value)}"${c.detail ? ` detalhe="${escapeXml(c.detail)}"` : ''}/>\r\n`;
    });
    xml += '  </indicadoresResumo>\r\n';
  }

  xml += '  <registros>\r\n';
  data.rows.forEach(row => {
    xml += '    <item>\r\n';
    data.columns.forEach(col => {
      const tag = col.key.replace(/[^a-zA-Z0-9_]/g, '_');
      xml += `      <${tag}>${escapeXml(row[col.key])}</${tag}>\r\n`;
    });
    xml += '    </item>\r\n';
  });
  xml += '  </registros>\r\n';
  xml += '</relatorio>\r\n';

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const filename = `${sanitizeFilename(data.title)}_${new Date().toISOString().slice(0, 10)}.xml`;
  triggerDownload(blob, filename);
}

// --------------------------------------------------------------------------------------
// 7. DESPACHANTE UNIFICADO
// --------------------------------------------------------------------------------------
export async function executeReportExport(format: ExportFormat, data: ReportExportData): Promise<void> {
  switch (format) {
    case 'PDF':
      exportToPdf(data);
      break;
    case 'DOCX':
      await exportToDocx(data);
      break;
    case 'XLSX':
      exportToExcel(data, 'xlsx');
      break;
    case 'XLS':
      exportToExcel(data, 'xls');
      break;
    case 'CSV':
      exportToCsv(data);
      break;
    case 'JSON':
      exportToJson(data);
      break;
    case 'XML':
      exportToXml(data);
      break;
    case 'PRINT':
      window.print();
      break;
    default:
      throw new Error(`Formato de exportação não suportado: ${format}`);
  }
}
