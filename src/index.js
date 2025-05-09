require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const pdfRoutes = require('./routes/pdfRoutes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('Database Connection Error:', err));

// Routes
app.use('/api/pdf', pdfRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});