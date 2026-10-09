/**
 * PDF exportado (report-exporter-bundle.js): o logo da empresa entra no canto direito da faixa escura do
 * cabeçalho, sobre uma placa branca (logos escuros continuam legíveis). O logo vem já convertido em PNG
 * pela tela que exporta: e.logoDataUrl, com largura e altura em mm (e.logoW, e.logoH).
 *
 * Uso: node scripts/exportacao-logo-pdf.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.resolve(__dirname, '..', 'public/report-exporter-bundle.js');
const MARK = '/*MD-PDF-LOGO-v1*/';
let s = fs.readFileSync(ARQ, 'utf8');
if (s.includes(MARK)) { console.log('já aplicado'); process.exit(0); }
const a = 't.setFillColor(30,41,59),t.rect(0,0,r,24,"F"),';
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('cabeçalho do PDF: ' + n + ' ocorrências');
s = s.split(a).join(a + MARK + 'e.logoDataUrl&&(()=>{try{let lw=Math.min(e.logoW||36,48),lh=Math.min(e.logoH||16,17),lx=r-14-lw,ly=(24-lh)/2;t.setFillColor(255,255,255),t.roundedRect(lx-2,ly-1.5,lw+4,lh+3,1.5,1.5,"F"),t.addImage(e.logoDataUrl,"PNG",lx,ly,lw,lh)}catch(_e){}})(),');
fs.writeFileSync(ARQ, s);
console.log('ok');
