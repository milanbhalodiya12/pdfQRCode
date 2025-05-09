const fs = require('fs');
const path = require('path');

const createDirectories = () => {
  const publicDir = path.join(__dirname, '../public');
  const pdfsDir = path.join(publicDir, 'pdfs');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('Created public directory');
  }
  
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
    console.log('Created pdfs directory');
  }
  
  console.log('Directory structure is ready!');
};

createDirectories();
