const mongoose = require('mongoose');
const Pdf = require('../src/models/Pdf');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB Connected');
}).catch(err => console.error('Database Connection Error:', err));

const uploadPdfs = async () => {
  const pdfFolder = path.join(__dirname, '../public/pdfs');
  const files = fs.readdirSync(pdfFolder);

  for (const file of files) {
    const pdf = new Pdf({ fileName: file });
    await pdf.save();
    console.log(`Uploaded: ${file}`);
  }

  mongoose.disconnect();
};

uploadPdfs();