import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileImage, Loader } from 'lucide-react';

const ReportExport = ({ 
  data, 
  reportType, 
  fileName = 'report',
  isLoading = false 
}) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    setIsExporting(true);
    
    try {
      switch (format) {
        case 'pdf':
          await exportToPDF();
          break;
        case 'excel':
          await exportToExcel();
          break;
        case 'csv':
          await exportToCSV();
          break;
        default:
          console.warn('Unsupported export format:', format);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    // This would typically use a library like jsPDF or html2canvas
    console.log('Exporting to PDF:', { data, reportType, fileName });
    
    // Simulate PDF export
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a simple text file as PDF placeholder
    const content = generateReportContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    console.log('Exporting to Excel:', { data, reportType, fileName });
    
    // Simulate Excel export
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create CSV as Excel placeholder
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = async () => {
    console.log('Exporting to CSV:', { data, reportType, fileName });
    
    // Simulate CSV export
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateReportContent = () => {
    const timestamp = new Date().toLocaleString();
    let content = `${reportType} Report\n`;
    content += `Generated: ${timestamp}\n`;
    content += `=====================================\n\n`;
    
    if (data && Array.isArray(data)) {
      data.forEach((item, index) => {
        content += `${index + 1}. ${JSON.stringify(item, null, 2)}\n\n`;
      });
    } else if (data) {
      content += JSON.stringify(data, null, 2);
    }
    
    return content;
  };

  const generateCSVContent = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 'No data available';
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV', icon: FileImage }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formatOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setExportFormat(option.value)}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 border rounded-md transition-colors ${
                    exportFormat === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Name
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => {/* Handle fileName change if needed */}}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter file name"
          />
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={() => handleExport(exportFormat)}
            disabled={isLoading || isExporting || !data}
            className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export {formatOptions.find(f => f.value === exportFormat)?.label}</span>
              </>
            )}
          </button>
        </div>

        {/* Export Info */}
        {data && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <p>
              <strong>Data Summary:</strong> {Array.isArray(data) ? data.length : 1} record(s) available for export
            </p>
            <p className="mt-1">
              <strong>Format:</strong> {formatOptions.find(f => f.value === exportFormat)?.label} 
              {exportFormat === 'pdf' && ' (Text format as placeholder)'}
              {exportFormat === 'excel' && ' (CSV format as placeholder)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportExport;
