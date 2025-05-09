const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// MongoDB connection string - HARDCODED for direct use
// Replace with your actual connection string if different
const MONGODB_URI = 'mongodb+srv://milanbhalodiya410:Milan123@cluster0.in0amvi.mongodb.net/pdfQrCode';

// Path to the PDFs directory
const PDF_DIRECTORY = path.join(__dirname, '../../public/pdfs');

// Set up base URL for QR codes
const BASE_URL = 'http://localhost:3000';

// Define PDF model directly to avoid module resolution issues
const pdfSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  qrCodeData: {
    type: String,
    default: null
  }
});

const Pdf = mongoose.model('Pdf', pdfSchema);

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string available:', !!MONGODB_URI);
    
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
