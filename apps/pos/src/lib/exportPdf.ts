import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = 'Taqueria La Andaluza';

interface ExportPdfOptions {
  filename: string;
  title: string;
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
}

export function exportPdf({ filename, title, period, headers, rows, summary }: ExportPdfOptions) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND, 14, 20);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 28);

  if (period) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(period, 14, 34);
    doc.setTextColor(0);
  }

  const startY = period ? 40 : 34;

  // Summary cards (if provided)
  let tableStartY = startY;
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    summary.forEach((item, i) => {
      const x = 14 + (i % 3) * 62;
      const y = tableStartY + Math.floor(i / 3) * 12;
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(item.label, x, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(item.value, x, y + 5);
    });
    tableStartY += Math.ceil(summary.length / 3) * 12 + 6;
  }

  // Table
  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: rows.map((row) => row.map(String)),
    theme: 'striped',
    headStyles: {
      fillColor: [217, 119, 6], // amber-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `${BRAND} - Generado: ${new Date().toLocaleString('es-MX')} - Pagina ${i}/${pageCount}`,
      14,
      pageHeight - 10,
    );
  }

  doc.save(`${filename}.pdf`);
}
