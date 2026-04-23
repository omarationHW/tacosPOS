import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logoBase64';

const BRAND = 'Taqueria La Andaluza';
const BRAND_RGB: [number, number, number] = [196, 171, 130]; // #c4ab82
const BRAND_DARK_RGB: [number, number, number] = [160, 134, 88]; // #a08658

interface PdfSection {
  title: string;
  summary?: { label: string; value: string }[];
  headers: string[];
  rows: (string | number)[][];
}

interface ExportPdfOptions {
  filename: string;
  title: string;
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
  /**
   * Optional per-line sections. When present, the PDF first renders a
   * "Consolidado" block (from headers/rows/summary), then each section below
   * with its own heading, summary cards and table.
   */
  sections?: PdfSection[];
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

function renderSummaryCards(doc: jsPDF, summary: { label: string; value: string }[], startY: number): number {
  if (summary.length === 0) return startY;
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

    doc.setFillColor(248, 246, 242);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFillColor(...BRAND_RGB);
    doc.rect(x, y + 2, 1.5, cardHeight - 4, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(item.label, x + 5, y + 6);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    doc.text(item.value, x + 5, y + 14);
  });

  return startY + Math.ceil(summary.length / cols) * (cardHeight + 4) + 6;
}

function renderTable(doc: jsPDF, headers: string[], rows: (string | number)[][], startY: number): number {
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
  // jspdf-autotable attaches lastAutoTable on the doc (typed loosely).
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
}

function renderSectionHeading(doc: jsPDF, label: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_DARK_RGB);
  doc.rect(14, y, 3, 7, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text(label, 20, y + 5.5);
  doc.setDrawColor(230);
  doc.setLineWidth(0.2);
  doc.line(14, y + 9, pageWidth - 14, y + 9);
  return y + 13;
}

function maybePageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 22) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function exportPdf({ filename, title, period, headers, rows, summary, sections }: ExportPdfOptions) {
  const doc = new jsPDF();

  let y = addHeader(doc, title, period);

  // Consolidated block (if any sections are provided, this acts as "Consolidado").
  if (sections && sections.length > 0) {
    y = renderSectionHeading(doc, 'Consolidado', y);
  }
  if (summary && summary.length > 0) {
    y = renderSummaryCards(doc, summary, y);
  }
  y = renderTable(doc, headers, rows, y);

  if (sections && sections.length > 0) {
    for (const section of sections) {
      y = maybePageBreak(doc, y, 60);
      y = renderSectionHeading(doc, section.title, y);
      if (section.summary && section.summary.length > 0) {
        y = renderSummaryCards(doc, section.summary, y);
      }
      y = renderTable(doc, section.headers, section.rows, y);
    }
  }

  addFooter(doc);
  doc.save(`${filename}.pdf`);
}
