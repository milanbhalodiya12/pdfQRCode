const express = require('express');
const QRCode = require('qrcode');
const Pdf = require('../models/Pdf'); // MongoDB model
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getQRCodeForPdf } = require('../utils/qrCodeGenerator');
const checkDbConnection = require('../middlewares/dbConnectionCheck');

const router = express.Router();

// Apply the database connection check middleware to all routes
router.use(checkDbConnection);

// Add a check for database connection at the beginning of route handlers
const checkDatabaseConnection = (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Database Connection Error</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error-container { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
          h1 { color: #721c24; }
          .instructions { background-color: #e9ecef; border-radius: 4px; padding: 20px; }
          code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>MongoDB Atlas Connection Error</h1>
          <p>The application cannot connect to the MongoDB Atlas database. This means features will be unavailable.</p>
        </div>
        
        <div class="instructions">
          <h2>How to Fix This Issue</h2>
          <ol>
            <li>Check your MongoDB Atlas connection string
              <ul>
                <li>Verify username and password are correct</li>
                <li>Ensure network access is configured to allow connections from your IP</li>
              </ul>
            </li>
            <li>Set the correct environment variable
              <ul>
                <li>Create a .env file with: <code>MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pdfLibrary</code></li>
                <li>Replace username, password, and cluster with your Atlas credentials</li>
              </ul>
            </li>
            <li>Check your internet connection</li>
            <li>Verify your Atlas cluster is running (check MongoDB Atlas dashboard)</li>
            <li>Restart the application after fixing the connection</li>
          </ol>
        </div>
      </body>
      </html>
    `);
  }
  next();
};

// Apply the database connection check to all routes that require database access
router.use('/list', checkDatabaseConnection);
router.use('/qrcode', checkDatabaseConnection);
router.use('/download', checkDatabaseConnection);
router.use('/generate-qr', checkDatabaseConnection);

// Add a fallback route for when database is unavailable
router.get('/database-error', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Database Connection Error</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .error-container { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
        h1 { color: #721c24; }
        .instructions { background-color: #e9ecef; border-radius: 4px; padding: 20px; }
        code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Database Connection Error</h1>
        <p>The application cannot connect to the MongoDB database. This means some features will be unavailable.</p>
      </div>
      
      <div class="instructions">
        <h2>How to Fix This Issue</h2>
        <ol>
          <li>Make sure MongoDB is installed on your system
            <ul>
              <li>Download from: <a href="https://www.mongodb.com/try/download/community" target="_blank">MongoDB Community Edition</a></li>
            </ul>
          </li>
          <li>Ensure MongoDB service is running
            <ul>
              <li>Windows: Check Services (services.msc) for MongoDB</li>
              <li>Mac/Linux: Run <code>sudo systemctl status mongod</code></li>
            </ul>
          </li>
          <li>Verify MongoDB is listening on the default port (27017)
            <ul>
              <li>Run <code>netstat -an | findstr 27017</code> (Windows) or <code>netstat -an | grep 27017</code> (Mac/Linux)</li>
            </ul>
          </li>
          <li>Check if MongoDB requires authentication</li>
          <li>Restart the application after fixing the database connection</li>
        </ol>
      </div>
    </body>
    </html>
  `);
});

// Create a simple fallback for the list route when database is unavailable
router.get('/list-fallback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF Library - Database Unavailable</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
        h1 { color: #856404; }
      </style>
    </head>
    <body>
      <h1>PDF Document Library</h1>
      <div class="warning">
        <h2>Database Connection Unavailable</h2>
        <p>The application cannot connect to the database. PDF listing functionality is currently unavailable.</p>
        <p>Please ensure MongoDB is installed and running, then restart the application.</p>
        <p><a href="/api/pdf/database-error">View troubleshooting instructions</a></p>
      </div>
    </body>
    </html>
  `);
});

// Modify the list route to fall back to a simple page when database is unavailable
router.get('/list', async (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.redirect('/api/pdf/list-fallback');
  }
  next();
});

// Generate QR Codes for all PDFs
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

// Configure multer storage for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/pdfs');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, file.originalname.replace(fileExt, '') + '-' + uniqueSuffix + fileExt);
  }
});

// Filter for PDF files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Initialize upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload PDF endpoint
router.post('/upload', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded or file is not a PDF' });
    }

    // Create new PDF document in database
    const newPdf = new Pdf({
      fileName: req.file.filename,
      originalName: req.file.originalname
    });

    // Save to database
    await newPdf.save();
    
    // Generate QR code for the uploaded PDF
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/api/pdf/download/${newPdf._id}`;
    const qrCodeData = await QRCode.toDataURL(downloadUrl);
    
    // Update PDF with QR code data
    newPdf.qrCodeData = qrCodeData;
    await newPdf.save();

    // Redirect to the PDF list page
    res.redirect('/api/pdf/list');
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to upload PDF', error: error.message });
  }
});

// Render upload form
router.get('/upload-form', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload PDF Document</title>
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
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ddd;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }
    .file-input-wrapper {
      position: relative;
      border: 2px dashed #ccc;
      padding: 30px;
      text-align: center;
      border-radius: 4px;
      transition: all 0.3s;
      cursor: pointer;
    }
    .file-input-wrapper:hover {
      border-color: #3498db;
    }
    .file-input {
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .file-input-label {
      color: #666;
      font-size: 18px;
    }
    .selected-file {
      margin-top: 15px;
      color: #2c3e50;
      font-weight: bold;
    }
    .submit-btn {
      display: block;
      width: 100%;
      padding: 12px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    .submit-btn:hover {
      background-color: #2980b9;
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 20px;
      color: #3498db;
      text-decoration: none;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Upload PDF Document</h1>
    
    <div id="errorMessage" class="error-message"></div>
    
    <form action="/api/pdf/upload" method="POST" enctype="multipart/form-data" id="uploadForm">
      <div class="form-group">
        <div class="file-input-wrapper">
          <input type="file" name="pdfFile" id="pdfFile" class="file-input" accept=".pdf">
          <div class="file-input-label">
            <i class="fa fa-cloud-upload"></i>
            <p>Click or drag a PDF file here to upload</p>
          </div>
          <div id="selectedFile" class="selected-file"></div>
        </div>
      </div>
      
      <button type="submit" class="submit-btn">Upload PDF</button>
    </form>
    
    <a href="/api/pdf/list" class="back-link">← Back to PDF Library</a>
  </div>

  <script>
    document.getElementById('pdfFile').addEventListener('change', function(e) {
      const fileName = e.target.files[0]?.name || '';
      const selectedFileDiv = document.getElementById('selectedFile');
      const errorMessageDiv = document.getElementById('errorMessage');
      
      // Check if file is a PDF
      if (fileName && !fileName.toLowerCase().endsWith('.pdf')) {
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.textContent = 'Only PDF files are allowed!';
        e.target.value = ''; // Clear the file input
        selectedFileDiv.textContent = '';
        return;
      }
      
      // Clear any previous error
      errorMessageDiv.style.display = 'none';
      
      // Display selected filename
      if (fileName) {
        selectedFileDiv.textContent = 'Selected file: ' + fileName;
      } else {
        selectedFileDiv.textContent = '';
      }
    });
    
    document.getElementById('uploadForm').addEventListener('submit', function(e) {
      const fileInput = document.getElementById('pdfFile');
      const errorMessageDiv = document.getElementById('errorMessage');
      
      if (!fileInput.files[0]) {
        e.preventDefault();
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.textContent = 'Please select a PDF file to upload';
      }
    });
  </script>
</body>
</html>
  `);
});

// Add Upload button to the PDF list page
const originalRenderPdfListPage = renderPdfListPage;
function renderPdfListPage(pdfs, baseUrl) {
  const htmlContent = originalRenderPdfListPage(pdfs, baseUrl);
  
  // Add upload button before the closing body tag
  return htmlContent.replace('</body>', `
    <div style="position: fixed; bottom: 30px; right: 30px;">
      <a href="/api/pdf/upload-form" style="display: inline-block; background-color: #3498db; color: white; padding: 15px 25px; border-radius: 50px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.3s;">
        <span style="font-size: 20px;">+</span> Upload PDF
      </a>
    </div>
  </body>`);
}

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