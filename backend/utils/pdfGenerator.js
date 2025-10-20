const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator Utility
 * Generates professional PDF reports for B-Trust Banking System
 */
class PDFGenerator {
  /**
   * Generate PDF from report data
   * @param {Object} options - { title, subtitle, data, columns, filters, filename }
   * @param {Object} res - Express response object
   */
  async generatePDF(options, res) {
    const { title, subtitle, data, columns, filters, filename } = options;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add header
    this.addHeader(doc, title, subtitle);

    // Add filter information
    if (filters) {
      this.addFilters(doc, filters);
    }

    // Add table
    this.addTable(doc, data, columns);

    // Add footer with page numbers
    this.addFooter(doc);

    // Finalize PDF
    doc.end();
  }

  /**
   * Add header to PDF
   */
  addHeader(doc, title, subtitle) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('B-Trust Banking System', 50, 50)
      .fontSize(16)
      .text(title, 50, 75)
      .fontSize(10)
      .font('Helvetica')
      .text(subtitle || '', 50, 95)
      .text(`Generated: ${new Date().toLocaleString()}`, 50, 110)
      .moveDown(2);
  }

  /**
   * Add filters section
   */
  addFilters(doc, filters) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Filters Applied:', 50, doc.y);

    doc.font('Helvetica');
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        doc.text(`${key}: ${value}`, 70, doc.y);
      }
    });

    doc.moveDown(1);
  }

  /**
   * Add data table
   */
  addTable(doc, data, columns) {
    if (!data || data.length === 0) {
      doc.text('No data available for the selected criteria.', 50, doc.y);
      return;
    }

    const startY = doc.y;
    const tableTop = startY + 10;
    const itemHeight = 25;
    const pageHeight = 700;
    let currentY = tableTop;

    // Calculate column widths
    const tableWidth = 495; // A4 width - margins
    const columnWidth = tableWidth / columns.length;

    // Draw header
    doc.font('Helvetica-Bold').fontSize(9);
    columns.forEach((col, i) => {
      doc.text(
        col.header,
        50 + i * columnWidth,
        currentY,
        { width: columnWidth - 5, align: col.align || 'left' }
      );
    });

    // Draw header line
    currentY += 15;
    doc
      .moveTo(50, currentY)
      .lineTo(545, currentY)
      .stroke();

    currentY += 5;

    // Draw data rows
    doc.font('Helvetica').fontSize(8);
    data.forEach((row, rowIndex) => {
      // Check if need new page
      if (currentY > pageHeight) {
        doc.addPage();
        currentY = 50;

        // Redraw header on new page
        doc.font('Helvetica-Bold').fontSize(9);
        columns.forEach((col, i) => {
          doc.text(
            col.header,
            50 + i * columnWidth,
            currentY,
            { width: columnWidth - 5, align: col.align || 'left' }
          );
        });
        currentY += 15;
        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 5;
        doc.font('Helvetica').fontSize(8);
      }

      // Draw row
      columns.forEach((col, i) => {
        let value = row[col.key];

        // Format value
        if (col.format === 'currency') {
          value = `$${parseFloat(value || 0).toFixed(2)}`;
        } else if (col.format === 'number') {
          value = parseInt(value || 0).toLocaleString();
        } else if (col.format === 'date') {
          value = value ? new Date(value).toLocaleDateString() : '-';
        } else if (value === null || value === undefined) {
          value = '-';
        }

        doc.text(
          String(value),
          50 + i * columnWidth,
          currentY,
          { width: columnWidth - 5, align: col.align || 'left' }
        );
      });

      currentY += itemHeight;

      // Draw row line
      if (rowIndex < data.length - 1) {
        doc
          .moveTo(50, currentY - 5)
          .lineTo(545, currentY - 5)
          .strokeOpacity(0.2)
          .stroke()
          .strokeOpacity(1);
      }
    });

    // Summary section if provided
    if (data.length > 0 && columns.some(c => c.showTotal)) {
      currentY += 10;
      doc
        .moveTo(50, currentY)
        .lineTo(545, currentY)
        .stroke();
      currentY += 10;

      doc.font('Helvetica-Bold');
      columns.forEach((col, i) => {
        if (col.showTotal) {
          const total = data.reduce((sum, row) => sum + parseFloat(row[col.key] || 0), 0);
          const formattedTotal = col.format === 'currency'
            ? `$${total.toFixed(2)}`
            : total.toLocaleString();

          doc.text(
            `Total: ${formattedTotal}`,
            50 + i * columnWidth,
            currentY,
            { width: columnWidth - 5, align: col.align || 'left' }
          );
        }
      });
    }
  }

  /**
   * Add footer with page numbers
   */
  addFooter(doc) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer line
      doc
        .moveTo(50, 750)
        .lineTo(545, 750)
        .stroke();

      // Page number
      doc
        .fontSize(8)
        .text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          760,
          { align: 'center' }
        );

      // Company info
      doc.text(
        'B-Trust Banking System - Confidential',
        50,
        760,
        { align: 'right' }
      );
    }
  }
}

module.exports = new PDFGenerator();
