const ExcelJS = require('exceljs');

/**
 * Excel Generator Utility
 * Generates Excel reports with professional formatting
 */
class ExcelGenerator {
  /**
   * Generate Excel from report data
   * @param {Object} options - { title, data, columns, filters, filename, sheetName }
   * @param {Object} res - Express response object
   */
  async generateExcel(options, res) {
    const { title, data, columns, filters, filename, sheetName = 'Report' } = options;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20;

    // Add title
    worksheet.mergeCells('A1:' + this.getColumnLetter(columns.length) + '1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `B-Trust Banking System - ${title}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };
    worksheet.getRow(1).height = 30;

    // Add generated date
    worksheet.mergeCells('A2:' + this.getColumnLetter(columns.length) + '2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Generated: ${new Date().toLocaleString()}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

    let currentRow = 3;

    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      currentRow++;
      const filterCell = worksheet.getCell(`A${currentRow}`);
      filterCell.value = 'Filters Applied:';
      filterCell.font = { bold: true };

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          currentRow++;
          worksheet.getCell(`A${currentRow}`).value = `${key}:`;
          worksheet.getCell(`B${currentRow}`).value = value;
        }
      });
      currentRow++;
    }

    currentRow += 2;

    // Add headers
    const headerRow = worksheet.getRow(currentRow);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 25;

    currentRow++;

    // Add data rows
    data.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(currentRow + rowIndex);

      columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        let value = row[col.key];

        // Format value based on type
        if (col.format === 'currency') {
          cell.value = parseFloat(value || 0);
          cell.numFmt = '$#,##0.00';
        } else if (col.format === 'number') {
          cell.value = parseInt(value || 0);
          cell.numFmt = '#,##0';
        } else if (col.format === 'percentage') {
          cell.value = parseFloat(value || 0) / 100;
          cell.numFmt = '0.00%';
        } else if (col.format === 'date') {
          if (value) {
            cell.value = new Date(value);
            cell.numFmt = 'mm/dd/yyyy';
          } else {
            cell.value = '-';
          }
        } else {
          cell.value = value || '-';
        }

        // Alignment
        cell.alignment = {
          vertical: 'middle',
          horizontal: col.align || 'left'
        };

        // Border
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alternating row colors
        if (rowIndex % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        }
      });
    });

    currentRow += data.length;

    // Add totals row if applicable
    const totalColumns = columns.filter(c => c.showTotal);
    if (totalColumns.length > 0) {
      currentRow++;
      const totalRow = worksheet.getRow(currentRow);

      columns.forEach((col, index) => {
        const cell = totalRow.getCell(index + 1);

        if (col.showTotal) {
          const total = data.reduce((sum, row) => sum + parseFloat(row[col.key] || 0), 0);

          if (index === 0) {
            cell.value = 'TOTAL:';
          } else {
            cell.value = total;
            if (col.format === 'currency') {
              cell.numFmt = '$#,##0.00';
            } else if (col.format === 'number') {
              cell.numFmt = '#,##0';
            }
          }

          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' }
          };
        }

        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });
    }

    // Auto-fit columns
    columns.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      let maxLength = col.header.length;

      data.forEach(row => {
        const value = String(row[col.key] || '');
        if (value.length > maxLength) {
          maxLength = value.length;
        }
      });

      column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: currentRow - data.length - 1 }
    ];

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Convert column number to Excel column letter
   */
  getColumnLetter(columnNumber) {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }
}

module.exports = new ExcelGenerator();
