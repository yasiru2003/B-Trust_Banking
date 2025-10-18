import jsPDF from 'jspdf';

export const generateTransactionReceipt = (transaction) => {
  const doc = new jsPDF();
  
  // Set up the document
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('B-Trust Banking', 20, 30);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Transaction Receipt', 20, 45);
  
  // Add a line separator
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);
  
  // Transaction details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  
  const startY = 65;
  let currentY = startY;
  
  // Transaction ID
  doc.text('Transaction ID:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.transaction_id || 'N/A', 80, currentY);
  currentY += 15;
  
  // Date and Time
  doc.setFont('helvetica', 'bold');
  doc.text('Date & Time:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  const dateTime = transaction.date ? new Date(transaction.date).toLocaleString() : 'N/A';
  doc.text(dateTime, 80, currentY);
  currentY += 15;
  
  // Customer Name
  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.customer_name || 'N/A', 80, currentY);
  currentY += 15;
  
  // Account Number
  doc.setFont('helvetica', 'bold');
  doc.text('Account Number:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.account_number || 'N/A', 80, currentY);
  currentY += 15;
  
  // Transaction Type
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Type:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  const transactionType = transaction.type_name === 'Interest_Calculation' ? 'Interest Calculation' : (transaction.type_name || transaction.transaction_type || 'N/A');
  doc.text(transactionType, 80, currentY);
  currentY += 15;
  
  // Amount
  doc.setFont('helvetica', 'bold');
  doc.text('Amount:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`LKR ${transaction.amount?.toLocaleString() || '0'}`, 80, currentY);
  currentY += 15;
  
  // Status
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  const status = transaction.status === true ? 'Approved' : transaction.status === false ? 'Pending' : 'Unknown';
  doc.text(status, 80, currentY);
  currentY += 20;
  
  // Add description if available
  if (transaction.description) {
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    
    // Handle long descriptions by splitting into multiple lines
    const splitDescription = doc.splitTextToSize(transaction.description, 150);
    doc.text(splitDescription, 80, currentY);
    currentY += splitDescription.length * 5 + 10;
  }
  
  // Add footer
  currentY += 20;
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 190, currentY);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt.', 20, currentY);
  doc.text('Thank you for banking with B-Trust!', 20, currentY + 10);
  
  // Add bank logo placeholder (you can replace this with actual logo)
  doc.setFontSize(8);
  doc.text('B-Trust Banking System', 20, 280);
  doc.text('Generated on: ' + new Date().toLocaleString(), 20, 285);
  
  // Add transaction reference
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Reference: ' + transaction.transaction_id, 20, 270);
  
  // Add security note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Keep this receipt for your records.', 20, 290);
  
  return doc;
};

export const downloadTransactionReceipt = (transaction) => {
  try {
    const doc = generateTransactionReceipt(transaction);
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `transaction_receipt_${transaction.transaction_id}_${date}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};
