const QRCode = require('qrcode');
const Pdf = require('../models/Pdf');

/**
 * Generate a QR code for a PDF file
 * @param {string} pdfId - The MongoDB ID of the PDF
 * @param {string} baseUrl - Base URL for the download link
 * @returns {Promise<string>} - The QR code data URL
 */
async function generateQRCodeForPdf(pdfId, baseUrl) {
  try {
    const pdf = await Pdf.findById(pdfId);
    
    if (!pdf) {
      throw new Error('PDF not found');
    }
    
    // Create download URL for the PDF
    const downloadUrl = `${baseUrl}/pdfs/download/${pdfId}`;
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl);
    
    // Update the PDF document with QR code data
    pdf.qrCodeData = qrCodeDataUrl;
    pdf.qrCodeGenerated = true;
    await pdf.save();
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Get QR code for a PDF, generating it if necessary
 * @param {string} pdfId - The MongoDB ID of the PDF
 * @param {string} baseUrl - Base URL for the download link
 * @returns {Promise<string>} - The QR code data URL
 */
async function getQRCodeForPdf(pdfId, baseUrl) {
  const pdf = await Pdf.findById(pdfId);
  
  if (!pdf) {
    throw new Error('PDF not found');
  }
  
  // Return existing QR code if already generated
  if (pdf.qrCodeGenerated && pdf.qrCodeData) {
    return pdf.qrCodeData;
  }
  
  // Generate new QR code if not available
  return generateQRCodeForPdf(pdfId, baseUrl);
}

module.exports = {
  generateQRCodeForPdf,
  getQRCodeForPdf
};