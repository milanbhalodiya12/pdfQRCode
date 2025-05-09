const express = require('express');
const path = require('path');
const pdfRoutes = require('./routes/pdfRoutes');
const { connectWithRetry } = require('./utils/dbConnection');
const { diagnoseMongoDBConnection } = require('./utils/mongodbDiagnostics');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/pdf', pdfRoutes);

// Redirect root to PDF list
app.get('/', (req, res) => {
  res.redirect('/api/pdf/list');
});

// Get MongoDB connection string from environment variables
// Try both MONGODB_URI and MONGO_URI to ensure we find the connection string
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pdfLibrary';

// Start server after connecting to database
async function startServer() {
  console.log('Starting server...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    // Check if MongoDB URI is valid
    if (!MONGODB_URI) {
      throw new Error('MongoDB URI is not defined. Please check your .env file.');
    }
    
    // Log whether we're using Atlas or local (for debugging)
    if (MONGODB_URI.includes('mongodb+srv')) {
      console.log('Using MongoDB Atlas cloud database');
      // Print a sanitized URI (hiding the password)
      const sanitizedUri = MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@.*)/, '$1*****$3');
      console.log(`Connection URI: ${sanitizedUri}`);
    } else {
      console.log('Using local MongoDB database');
      console.log(`Connection URI: ${MONGODB_URI}`);
    }
    
    console.log('Connecting to MongoDB...');
    await connectWithRetry(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`View the application at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Server will now exit');
    process.exit(1);
  }
}

// Execute the startServer function
startServer();

module.exports = app;
