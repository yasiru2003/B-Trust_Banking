const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);

/**
 * CSV Generator Utility
 * Generates CSV files from report data
 */
class CSVGenerator {
  /**
   * Generate CSV from report data
   * @param {Object} options - { title, data, columns, filename }
   * @param {Object} res - Express response object
   */
  async generateCSV(options, res) {
    const { title, data, columns, filename } = options;

    // Create temporary file path
    const tempFilePath = path.join(__dirname, '..', 'temp', `${Date.now()}_${filename}`);

    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Prepare CSV headers
      const headers = columns.map(col => ({
        id: col.key,
        title: col.header
      }));

      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: tempFilePath,
        header: headers
      });

      // Format data for CSV
      const formattedData = data.map(row => {
        const formattedRow = {};

        columns.forEach(col => {
          let value = row[col.key];

          // Format value based on type
          if (col.format === 'currency') {
            value = `$${parseFloat(value || 0).toFixed(2)}`;
          } else if (col.format === 'number') {
            value = parseInt(value || 0).toLocaleString();
          } else if (col.format === 'date') {
            value = value ? new Date(value).toLocaleDateString() : '-';
          } else if (value === null || value === undefined) {
            value = '-';
          }

          formattedRow[col.key] = value;
        });

        return formattedRow;
      });

      // Write CSV file
      await csvWriter.writeRecords(formattedData);

      // Add metadata at the top of the file
      const fileContent = fs.readFileSync(tempFilePath, 'utf8');
      const metadata = [
        `# B-Trust Banking System - ${title}`,
        `# Generated: ${new Date().toLocaleString()}`,
        `# Total Records: ${data.length}`,
        '',
        fileContent
      ].join('\n');

      fs.writeFileSync(tempFilePath, metadata);

      // Set response headers
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream file to response
      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      // Clean up temp file after sending
      fileStream.on('end', async () => {
        try {
          await unlink(tempFilePath);
        } catch (error) {
          console.error('Error deleting temp CSV file:', error);
        }
      });

      fileStream.on('error', async (error) => {
        console.error('Error streaming CSV file:', error);
        try {
          await unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temp CSV file:', unlinkError);
        }
        res.status(500).json({ success: false, message: 'Error generating CSV file' });
      });

    } catch (error) {
      // Clean up on error
      if (fs.existsSync(tempFilePath)) {
        await unlink(tempFilePath);
      }
      throw error;
    }
  }

  /**
   * Generate simple CSV string (alternative method without temp files)
   * @param {Array} data - Array of objects
   * @param {Array} columns - Column definitions
   * @returns {String} CSV string
   */
  generateCSVString(data, columns) {
    // Create header row
    const headers = columns.map(col => this.escapeCSVValue(col.header)).join(',');

    // Create data rows
    const rows = data.map(row => {
      return columns.map(col => {
        let value = row[col.key];

        // Format value
        if (col.format === 'currency') {
          value = parseFloat(value || 0).toFixed(2);
        } else if (col.format === 'number') {
          value = parseInt(value || 0);
        } else if (col.format === 'date') {
          value = value ? new Date(value).toLocaleDateString() : '';
        } else if (value === null || value === undefined) {
          value = '';
        }

        return this.escapeCSVValue(String(value));
      }).join(',');
    });

    // Combine header and rows
    return [headers, ...rows].join('\n');
  }

  /**
   * Escape CSV value (handle commas, quotes, newlines)
   * @param {String} value
   * @returns {String} Escaped value
   */
  escapeCSVValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}

module.exports = new CSVGenerator();
