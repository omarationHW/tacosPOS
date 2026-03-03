import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logoBase64';

const BRAND = 'Taqueria La Andaluza';
const BRAND_RGB: [number, number, number] = [196, 171, 130]; // #c4ab82
const BRAND_DARK_RGB: [number, number, number] = [160, 134, 88]; // #a08658

interface ExportPdfOptions {
  filename: string;
  title: string;
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
}

function addHeader(doc: jsPDF, title: string, period?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo
  doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 30, 30);

  // Brand name + title (right of logo)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text(BRAND, 50, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(title, 50, 27);

  if (period) {
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(period, 50, 33);
  }

  // Brand color line under header
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.8);
  doc.line(14, 44, pageWidth - 14, 44);

  return 50;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Brand color line above footer
    doc.setDrawColor(...BRAND_RGB);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${BRAND}`,
      14,
      pageHeight - 10,
    );
    doc.text(
      `Generado: ${new Date().toLocaleString('es-MX')}  |  Pagina ${i}/${pageCount}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' },
    );
  }
}

export function exportPdf({ filename, title, period, headers, rows, summary }: ExportPdfOptions) {
  const doc = new jsPDF();

  let startY = addHeader(doc, title, period);

  // Summary cards
  if (summary && summary.length > 0) {
    const cardWidth = 56;
    const cardHeight = 18;
    const gap = 6;
    const cols = 3;
    const startX = 14;

    summary.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + 4);

      // Card background
      doc.setFillColor(248, 246, 242);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');

      // Left accent bar
      doc.setFillColor(...BRAND_RGB);
      doc.rect(x, y + 2, 1.5, cardHeight - 4, 'F');

      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(item.label, x + 5, y + 6);

      // Value
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50);
      doc.text(item.value, x + 5, y + 14);
    });

    startY += Math.ceil(summary.length / cols) * (cardHeight + 4) + 6;
  }

  // Table
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.map((row) => row.map(String)),
    theme: 'striped',
    headStyles: {
      fillColor: [...BRAND_DARK_RGB],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [248, 246, 242],
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);

  doc.save(`${filename}.pdf`);
}
