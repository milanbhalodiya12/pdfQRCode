const dns = require('dns');
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);
const execPromise = promisify(exec);

/**
 * Perform connection diagnostics for MongoDB
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise<Object>} Diagnostic results
 */
async function diagnoseMongoDBConnection(uri) {
  console.log('Running MongoDB connection diagnostics...');
  const results = {
    uri: sanitizeUri(uri),
    hostname: null,
    port: null,
    dnsLookup: null,
    portOpen: null,
    pingResult: null,
    networkInterfaces: null,
    errors: []
  };
  
  try {
    // Parse the URI
    const parsedUri = parseMongoUri(uri);
    results.hostname = parsedUri.hostname;
    results.port = parsedUri.port;
    
    // Check DNS resolution
    try {
      const dnsResult = await dnsLookup(parsedUri.hostname);
      results.dnsLookup = dnsResult.address;
      console.log(`DNS lookup successful: ${parsedUri.hostname} -> ${dnsResult.address}`);
    } catch (err) {
      results.errors.push(`DNS lookup failed: ${err.message}`);
      console.error(`DNS lookup failed: ${err.message}`);
    }
    
    // Check if port is open
    if (results.dnsLookup) {
      try {
        results.portOpen = await isPortOpen(results.dnsLookup, parsedUri.port);
        console.log(`Port check: ${results.dnsLookup}:${parsedUri.port} is ${results.portOpen ? 'open' : 'closed'}`);
      } catch (err) {
        results.errors.push(`Port check failed: ${err.message}`);
        console.error(`Port check failed: ${err.message}`);
      }
    }
    
    // Ping the host
    try {
      results.pingResult = await pingHost(parsedUri.hostname);
      console.log(`Ping result: ${results.pingResult}`);
    } catch (err) {
      results.errors.push(`Ping failed: ${err.message}`);
      console.error(`Ping failed: ${err.message}`);
    }
    
    // Get network interfaces
    try {
      results.networkInterfaces = getNetworkInterfaces();
    } catch (err) {
      results.errors.push(`Failed to get network interfaces: ${err.message}`);
    }
    
  } catch (err) {
    results.errors.push(`Diagnostic error: ${err.message}`);
    console.error('Diagnostic error:', err);
  }
  
  return results;
}

/**
 * Parse MongoDB URI to extract hostname and port
 * @param {string} uri - MongoDB connection URI
 * @returns {Object} Parsed URI components
 */
function parseMongoUri(uri) {
  try {
    // Basic parsing for mongodb://host:port/db format
    const match = uri.match(/mongodb:\/\/([^:]+):?(\d+)?/);
    if (match) {
      return {
        hostname: match[1],
        port: match[2] ? parseInt(match[2], 10) : 27017
      };
    }
    
    // If simple parsing fails, try a more comprehensive approach
    const url = new URL(uri);
    return {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 27017
    };
  } catch (err) {
    throw new Error(`Invalid MongoDB URI: ${err.message}`);
  }
}

/**
 * Check if a port is open
 * @param {string} host - Hostname or IP
 * @param {number} port - Port number
 * @returns {Promise<boolean>} Whether port is open
 */
function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isOpen = false;
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      isOpen = true;
      socket.destroy();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
    });
    
    socket.on('error', () => {
      socket.destroy();
    });
    
    socket.on('close', () => {
      resolve(isOpen);
    });
    
    socket.connect(port, host);
  });
}

/**
 * Ping a hostname
 * @param {string} hostname - Hostname to ping
 * @returns {Promise<string>} Ping result
 */
async function pingHost(hostname) {
  try {
    const cmd = process.platform === 'win32' 
      ? `ping -n 3 ${hostname}` 
      : `ping -c 3 ${hostname}`;
      
    const { stdout } = await execPromise(cmd);
    return stdout;
  } catch (err) {
    throw new Error(`Ping failed: ${err.message}`);
  }
}

/**
 * Get network interfaces
 * @returns {Object} Network interfaces
 */
function getNetworkInterfaces() {
  const { networkInterfaces } = require('os');
  return networkInterfaces();
}

/**
 * Sanitize URI by removing credentials
 * @param {string} uri - MongoDB URI
 * @returns {string} Sanitized URI
 */
function sanitizeUri(uri) {
  return uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
}

module.exports = {
  diagnoseMongoDBConnection
};
