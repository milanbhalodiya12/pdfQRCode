const express = require('express');
const QRCode = require('qrcode');
const Pdf = require('../models/Pdf'); 
const path = require('path');
const { getQRCodeForPdf } = require('../utils/qrCodeGenerator');


const router = express.Router();

// Add a check for database connection at the beginning of route handlers
const checkDatabaseConnection = (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send(`Connection Error`);
  }
  next();
};

// Apply the database connection check to all routes that require database access
router.use('/list', checkDatabaseConnection);
router.use('/qrcode', checkDatabaseConnection);
router.use('/download', checkDatabaseConnection);
router.use('/generate-qr', checkDatabaseConnection);


router.get('/generate-qr', async (req, res) => {
  try {
    const pdfs = await Pdf.find();
    const qrCodes = pdfs.map(pdf => {
      const downloadUrl = `${req.protocol}://${req.get('host')}/api/pdf/download/${pdf._id}`;
      const qrCode = QRCode.toDataURL(downloadUrl);
      return { id: pdf._id, qrCode, downloadUrl };
    });

    res.json(qrCodes);
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR codes' });
  }
});

// Serve PDF for Download
router.get('/download/:id', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) return res.status(404).json({ error: 'PDF not found' });

    const filePath = path.join(__dirname, '../../public/pdfs', pdf.fileName);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Error downloading PDF' });
  }
});

// Get QR code for a specific PDF
router.get('/qrcode/:id', async (req, res) => {
  try {
    const pdfId = req.params.id;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const qrCodeData = await getQRCodeForPdf(pdfId, baseUrl);
    
    res.json({ 
      success: true, 
      qrCodeData 
    });
  } catch (error) {
    console.error('Error retrieving QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve QR code',
      error: error.message 
    });
  }
});

// Serve an HTML page displaying all PDFs with their QR codes
router.get('/list', async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ uploadDate: -1 });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Generate QR codes for each PDF if not already generated
    for (const pdf of pdfs) {
      if (!pdf.qrCodeData) {
        const downloadUrl = `${baseUrl}/api/pdf/download/${pdf._id}`;
        pdf.qrCodeData = await QRCode.toDataURL(downloadUrl);
        await pdf.save();
      }
    }
    
    // Render the HTML page with PDF list and QR codes
    res.send(renderPdfListPage(pdfs, baseUrl));
  } catch (err) {
    console.error('Error serving PDF list:', err);
    res.status(500).send(`<h1>Error loading PDF list</h1><p>${err.message}</p>`);
  }
});



// Function to render the HTML page
function renderPdfListPage(pdfs, baseUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Document Library with QR Codes</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }
    body {
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ddd;
    }
    .pdf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 25px;
    }
    .pdf-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: transform 0.3s ease;
    }
    .pdf-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    .pdf-header {
      padding: 15px;
      background-color: #2c3e50;
      color: white;
    }
    .pdf-title {
      font-size: 18px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pdf-date {
      font-size: 12px;
      color: #ddd;
      margin-top: 5px;
    }
    .pdf-content {
      padding: 15px;
      text-align: center;
    }
    .qr-container {
      margin: 10px 0;
    }
    .qr-code {
      max-width: 180px;
      max-height: 180px;
      margin: 0 auto;
    }
    .pdf-actions {
      display: flex;
      justify-content: center;
      padding: 15px;
      border-top: 1px solid #eee;
    }
    .btn {
      display: inline-block;
      padding: 8px 16px;
      background-color: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    .btn:hover {
      background-color: #2980b9;
    }
    .empty-state {
      text-align: center;
      padding: 50px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PDF Document Library</h1>
    
    ${pdfs.length === 0 ? 
      `<div class="empty-state">
        <h2>No PDF documents available</h2>
        <p>Upload PDF documents to see them listed here with QR codes.</p>
      </div>` : 
      `<div class="pdf-grid">
        ${pdfs.map(pdf => `
          <div class="pdf-card">
            <div class="pdf-header">
              <div class="pdf-title">${pdf.fileName}</div>
              <div class="pdf-date">Uploaded on: ${new Date(pdf.uploadDate).toLocaleDateString()}</div>
            </div>
            <div class="pdf-content">
              <div class="qr-container">
                <img src="${pdf.qrCodeData}" alt="QR Code" class="qr-code">
              </div>
              <p>Scan to download</p>
            </div>
            <div class="pdf-actions">
              <a href="${baseUrl}/api/pdf/download/${pdf._id}" class="btn" target="_blank">Download</a>
            </div>
          </div>
        `).join('')}
      </div>`
    }
  </div>
</body>
</html>
  `;
}

module.exports = router;