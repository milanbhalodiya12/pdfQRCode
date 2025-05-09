const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
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

module.exports = mongoose.model('Pdf', pdfSchema);