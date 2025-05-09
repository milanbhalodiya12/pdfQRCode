const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
console.log('Testing connection to:', uri.replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@.*)/, '$1*****$3'));

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('Connection error:', err));