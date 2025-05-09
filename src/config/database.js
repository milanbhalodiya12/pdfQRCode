require('dotenv').config();

// MongoDB Atlas connection configuration
const MONGODB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000
};

// Get URI from environment variables or use a default for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdfLibrary';

module.exports = {
  MONGODB_URI,
  MONGODB_OPTIONS
};
