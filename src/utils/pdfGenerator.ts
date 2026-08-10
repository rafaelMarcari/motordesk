/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Mathematical conversion of OKLCH color parameters to sRGB.
 */
function oklchToRgb(l: number, c: number, h: number) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const gammaCorrect = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    const srgb = clamped >= 0.0031308
      ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
      : 12.92 * clamped;
    return Math.round(srgb * 255);
  };

  return {
    r: gammaCorrect(rLinear),
    g: gammaCorrect(gLinear),
    b: gammaCorrect(bLinear),
  };
}

/**
 * Converts oklch, oklab, and color-mix strings in CSS text into valid sRGB rgb/rgba formats.
 */
export function convertOklchString(cssText: string): string {
  if (!cssText) return cssText;
  let res = cssText;

  // Convert oklch(...)
  res = res.replace(/oklch\(\s*([\d.%]+)[\s,]+([\d.%]+)[\s,]+([\d.%]+)(?:\s*[\/,]\s*([\d.%]+))?\s*\)/gi, (_, p1, p2, p3, p4) => {
    let l = parseFloat(p1);
    if (p1.endsWith('%')) l = l / 100;

    let c = parseFloat(p2);
    if (p2.endsWith('%')) c = (c / 100) * 0.4;

    let h = parseFloat(p3);

    let alpha = 1;
    if (p4 !== undefined) {
      alpha = parseFloat(p4);
      if (p4.endsWith('%')) alpha = alpha / 100;
    }

    const { r, g, b } = oklchToRgb(l, c, h);
    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  });

  // Convert oklab(...)
  res = res.replace(/oklab\(\s*([\d.%]+)[\s,]+([-\d.%]+)[\s,]+([-\d.%]+)(?:\s*[\/,]\s*([\d.%]+))?\s*\)/gi, (_, p1, p2, p3, p4) => {
    let l = parseFloat(p1);
    if (p1.endsWith('%')) l = l / 100;

    let a = parseFloat(p2);
    if (p2.endsWith('%')) a = (a / 100) * 0.4;

    let b = parseFloat(p3);
    if (p3.endsWith('%')) b = (b / 100) * 0.4;

    let alpha = 1;
    if (p4 !== undefined) {
      alpha = parseFloat(p4);
      if (p4.endsWith('%')) alpha = alpha / 100;
    }

    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const gammaCorrect = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      const srgb = clamped >= 0.0031308
        ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
        : 12.92 * clamped;
      return Math.round(srgb * 255);
    };

    const r = gammaCorrect(rLinear);
    const g = gammaCorrect(gLinear);
    const bComp = gammaCorrect(bLinear);

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${bComp}, ${alpha.toFixed(2)})`;
    }
    return `rgb(${r}, ${g}, ${bComp})`;
  });

  // Convert color-mix(...)
  res = res.replace(/color-mix\([^\);}]*\)/gi, (m) => {
    if (m.includes('transparent')) return 'rgba(0, 0, 0, 0)';
    return 'inherit';
  });

  return res;
}

/**
 * Replaces modern OKLCH/OKLAB colors in all document style tags and style attributes with sRGB equivalents.
 * Returns a restoration function.
 */
function replaceDocumentOklchStyles(): () => void {
  const restoreActions: (() => void)[] = [];

  const styleElements = Array.from(document.querySelectorAll('style'));
  styleElements.forEach((styleEl) => {
    if (
      styleEl.textContent &&
      (styleEl.textContent.includes('oklch') ||
        styleEl.textContent.includes('oklab') ||
        styleEl.textContent.includes('color-mix'))
    ) {
      const original = styleEl.textContent;
      styleEl.textContent = convertOklchString(original);
      restoreActions.push(() => {
        styleEl.textContent = original;
      });
    }
  });

  const elementsWithStyle = Array.from(document.querySelectorAll('[style]'));
  elementsWithStyle.forEach((el) => {
    const origAttr = el.getAttribute('style');
    if (
      origAttr &&
      (origAttr.includes('oklch') ||
        origAttr.includes('oklab') ||
        origAttr.includes('color-mix'))
    ) {
      el.setAttribute('style', convertOklchString(origAttr));
      restoreActions.push(() => {
        el.setAttribute('style', origAttr);
      });
    }
  });

  return () => {
    restoreActions.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        // Ignore restoration errors
      }
    });
  };
}

/**
 * Synchronizes inputs/selects/textareas to DOM attributes and cleans up edit borders for printable layout.
 */
function prepareElementForCapture(element: HTMLElement): () => void {
  const restoredActions: (() => void)[] = [];

  element.querySelectorAll('input').forEach((input) => {
    const htmlInput = input as HTMLInputElement;
    if (htmlInput.type === 'checkbox' || htmlInput.type === 'radio') {
      if (htmlInput.checked) {
        htmlInput.setAttribute('checked', 'true');
      } else {
        htmlInput.removeAttribute('checked');
      }
    } else {
      const val = htmlInput.value || '';
      htmlInput.setAttribute('value', val);

      const origBorder = htmlInput.style.border;
      const origBg = htmlInput.style.backgroundColor;
      htmlInput.style.border = 'none';
      htmlInput.style.backgroundColor = 'transparent';
      restoredActions.push(() => {
        htmlInput.style.border = origBorder;
        htmlInput.style.backgroundColor = origBg;
      });
    }
  });

  element.querySelectorAll('textarea').forEach((textarea) => {
    const htmlTextarea = textarea as HTMLTextAreaElement;
    htmlTextarea.textContent = htmlTextarea.value || '';

    const origBorder = htmlTextarea.style.border;
    const origBg = htmlTextarea.style.backgroundColor;
    htmlTextarea.style.border = 'none';
    htmlTextarea.style.backgroundColor = 'transparent';
    restoredActions.push(() => {
      htmlTextarea.style.border = origBorder;
      htmlTextarea.style.backgroundColor = origBg;
    });
  });

  element.querySelectorAll('select').forEach((select) => {
    const htmlSelect = select as HTMLSelectElement;
    const options = htmlSelect.querySelectorAll('option');
    options.forEach((opt) => {
      if (opt.value === htmlSelect.value) {
        opt.setAttribute('selected', 'true');
      } else {
        opt.removeAttribute('selected');
      }
    });
  });

  return () => {
    restoredActions.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        // Ignore restoration errors
      }
    });
  };
}

/**
 * Generates and downloads a clean, multi-page PDF document from any HTML element.
 */
export async function generatePdfFromElement(
  elementId: string,
  filename: string = 'documento.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for PDF generation.`);
    return false;
  }

  // Convert modern oklch/oklab styles to sRGB & clean up form inputs
  const restoreStyles = replaceDocumentOklchStyles();
  const restoreFormControls = prepareElementForCapture(element);

  // Preserve layout height/overflow limits
  const origMaxHeight = element.style.maxHeight;
  const origOverflow = element.style.overflow;
  const origHeight = element.style.height;

  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';
  element.style.height = 'auto';

  try {
    const width = Math.max(element.scrollWidth, element.offsetWidth, 800);
    const height = Math.max(element.scrollHeight, element.offsetHeight);

    let dataUrl = '';
    try {
      dataUrl = await toPng(element, {
        width,
        height,
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });
    } catch (pngErr) {
      console.warn('html-to-image PNG capture fallback to html2canvas:', pngErr);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      dataUrl = canvas.toDataURL('image/png');
    }

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const imgWidth = img.width || width;
    const imgHeight = img.height || height;

    // A4 document (210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const margin = 5;
    const printWidth = pdfWidth - margin * 2;
    const printHeight = (imgHeight * printWidth) / imgWidth;

    let heightLeft = printHeight;
    let position = margin;

    pdf.addImage(dataUrl, 'PNG', margin, position, printWidth, printHeight, '', 'FAST');
    heightLeft -= pdfPageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - printHeight + margin;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', margin, position, printWidth, printHeight, '', 'FAST');
      heightLeft -= pdfPageHeight;
    }

    const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
    pdf.save(`${safeFilename}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    printElementInIframe(elementId, filename);
    return false;
  } finally {
    element.style.maxHeight = origMaxHeight;
    element.style.overflow = origOverflow;
    element.style.height = origHeight;

    restoreFormControls();
    restoreStyles();
  }
}

/**
 * Isolated iframe print fallback.
 */
function printElementInIframe(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; background: #fff; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Iframe print error:', e);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  }, 300);
}


