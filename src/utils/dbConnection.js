const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic
 * @param {string} uri - MongoDB connection string
 * @param {Object} options - Connection options
 * @returns {Promise} Mongoose connection
 */
const connectWithRetry = async (uri, options = {}) => {
  console.log('Attempting to connect to MongoDB...');
  
  // Check if it's MongoDB Atlas
  const isAtlas = uri.includes('mongodb+srv');
  
  if (isAtlas) {
    console.log('Detected MongoDB Atlas connection string');
  }
  
  const defaultOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    maxRetries: 5,
    retryDelay: 5000
  };
  
  const connectOptions = { ...defaultOptions, ...options };
  const { maxRetries, retryDelay, ...mongooseOptions } = connectOptions;
  
  let lastError;
  
  // Disconnect if already connected (to ensure clean connection)
  if (mongoose.connection.readyState !== 0) {
    console.log('Disconnecting from existing MongoDB connection...');
    await mongoose.disconnect();
  }
  
  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      if (retries > 0) {
        console.log(`Retry attempt ${retries}/${maxRetries-1}...`);
      }
      
      // For MongoDB Atlas, log special message
      if (isAtlas) {
        console.log(`Connecting to MongoDB Atlas (attempt ${retries + 1})...`);
      }
      
      await mongoose.connect(uri, mongooseOptions);
      
      if (isAtlas) {
        console.log('Successfully connected to MongoDB Atlas!');
        console.log(`Connected to database: ${mongoose.connection.name}`);
      } else {
        console.log('MongoDB connected successfully!');
      }
      
      // Set up connection error handler for future connection issues
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });
      
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      
      // Atlas-specific error handling
      if (isAtlas) {
        if (err.name === 'MongoServerSelectionError') {
          console.error('MongoDB Atlas server selection error:');
          console.error('- Check your network connectivity');
          console.error('- Verify IP address is whitelisted in Atlas');
          console.error('- Confirm username and password are correct');
        } else if (err.name === 'MongoNetworkError') {
          console.error('MongoDB Atlas network error. Check your internet connection.');
        }
      }
      
      console.error(`MongoDB connection attempt ${retries + 1} failed:`, err.message);
      
      if (retries < maxRetries - 1) {
        console.log(`Waiting ${retryDelay/1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.error(`MongoDB connection failed after ${maxRetries} attempts`);
  throw lastError;
};

/**
 * Check if MongoDB connection is active
 * @returns {boolean} Connection status
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectWithRetry,
  isConnected
};
