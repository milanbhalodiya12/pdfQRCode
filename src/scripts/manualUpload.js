const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const QRCode = require('qrcode');
const Pdf = require('../models/Pdf');

// MongoDB connection string with fallback
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://milanbhalodiya410:Milan123@cluster0.in0amvi.mongodb.net/pdfQrCode';

// Debug connection string (remove sensitive info before logging)
console.log('MongoDB URI:', MONGODB_URI ? 
  MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@.*)/, '$1*****$3') : 
  'undefined');

// Path to the PDFs directory
const PDF_DIRECTORY = path.join(__dirname, '../../public/pdfs');

// Set up base URL for QR codes
const BASE_URL = 'http://localhost:3000';

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Create database entries for PDF files in the directory
 */
async function processPdfFiles() {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(PDF_DIRECTORY)) {
      fs.mkdirSync(PDF_DIRECTORY, { recursive: true });
      console.log(`Created directory: ${PDF_DIRECTORY}`);
    }

    // Read all files in the directory
    const files = fs.readdirSync(PDF_DIRECTORY);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('No PDF files found in the directory.');
      console.log(`Please copy your PDF files to: ${PDF_DIRECTORY}`);
      return;
    }

    console.log(`Found ${pdfFiles.length} PDF files`);

    // Process each PDF file
    for (const pdfFile of pdfFiles) {
      // Check if the PDF is already in the database
      const existingPdf = await Pdf.findOne({ fileName: pdfFile });
      
      if (existingPdf) {
        console.log(`Skipping ${pdfFile} - already in database`);
        continue;
      }

      // Create new PDF document
      const newPdf = new Pdf({
        fileName: pdfFile,
        originalName: pdfFile
      });

      // Generate QR code
      const downloadUrl = `${BASE_URL}/api/pdf/download/${newPdf._id}`;
      console.log(`Generating QR code for: ${pdfFile} with URL: ${downloadUrl}`);
      
      const qrCodeData = await QRCode.toDataURL(downloadUrl);
      newPdf.qrCodeData = qrCodeData;
      
      // Save to database
      await newPdf.save();
      console.log(`Added ${pdfFile} to database with QR code`);
    }

    console.log('All PDF files processed successfully');
  } catch (error) {
    console.error('Error processing PDF files:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectToMongoDB();
    await processPdfFiles();
    console.log('Manual upload complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
  }
}

// Run the script
main();
