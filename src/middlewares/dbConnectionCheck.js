const { isConnected } = require('../utils/dbConnection');

/**
 * Middleware to check if MongoDB is connected before proceeding with request
 */
function checkDbConnection(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({ 
      error: 'Database connection unavailable',
      message: 'The server is temporarily unable to connect to the database. Please try again later.'
    });
  }
  next();
}

module.exports = checkDbConnection;
