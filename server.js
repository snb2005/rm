const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CSV file path
const CSV_FILE = path.join(__dirname, 'requests.csv');
const PIXEL_FILE = path.join(__dirname, 'pixel.png');

// CSV header
const CSV_HEADER = 'timestamp,participant_id,remote_addr,x_forwarded_for,ip_used,user_agent,accept_language,referer\n';

// Load pixel.png at startup
let pixelBuffer;
try {
  pixelBuffer = fs.readFileSync(PIXEL_FILE);
  console.log('Pixel image loaded successfully');
} catch (error) {
  console.error('Error loading pixel.png:', error.message);
  console.log('Creating a 1x1 transparent PNG...');
  
  // Create a minimal 1x1 transparent PNG if file doesn't exist
  // This is a base64 encoded 1x1 transparent PNG
  const transparentPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  
  try {
    fs.writeFileSync(PIXEL_FILE, transparentPNG);
    pixelBuffer = transparentPNG;
    console.log('Created pixel.png successfully');
  } catch (writeError) {
    console.error('Failed to create pixel.png:', writeError.message);
    process.exit(1);
  }
}

// Initialize CSV file with header if it doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  try {
    fs.writeFileSync(CSV_FILE, CSV_HEADER);
    console.log('Created requests.csv with header');
  } catch (error) {
    console.error('Error creating CSV file:', error.message);
    process.exit(1);
  }
}

// Function to extract IP address
function extractIP(req) {
  const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  const xForwardedFor = req.headers['x-forwarded-for'];
  
  let ipUsed = remoteAddr;
  if (xForwardedFor) {
    // Use first IP from x-forwarded-for if present
    const firstForwardedIP = xForwardedFor.split(',')[0].trim();
    if (firstForwardedIP) {
      ipUsed = firstForwardedIP;
    }
  }
  
  return {
    remoteAddr,
    xForwardedFor: xForwardedFor || '',
    ipUsed
  };
}

// Function to escape CSV fields
function escapeCSV(field) {
  if (field == null || field === undefined) {
    return '';
  }
  
  const str = String(field);
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Function to log request to CSV
function logRequest(participantId, req) {
  const timestamp = new Date().toISOString();
  const { remoteAddr, xForwardedFor, ipUsed } = extractIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const referer = req.headers.referer || req.headers.referrer || '';
  
  const csvRow = [
    escapeCSV(timestamp),
    escapeCSV(participantId),
    escapeCSV(remoteAddr),
    escapeCSV(xForwardedFor),
    escapeCSV(ipUsed),
    escapeCSV(userAgent),
    escapeCSV(acceptLanguage),
    escapeCSV(referer)
  ].join(',') + '\n';
  
  try {
    fs.appendFileSync(CSV_FILE, csvRow);
    console.log(`Logged request for participant: ${participantId}`);
  } catch (error) {
    console.error('Error writing to CSV:', error.message);
  }
}

// Root route
app.get('/', (req, res) => {
  res.type('text/plain');
  res.send('Tracking server running.');
});

// Tracking pixel route
app.get('/track/:id.png', (req, res) => {
  const participantId = req.params.id;
  
  // Log the request
  logRequest(participantId, req);
  
  // Set headers to disable caching
  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Send the pixel
  res.send(pixelBuffer);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).send('Internal Server Error');
});

// Start server
app.listen(PORT, () => {
  console.log(`Tracking server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CSV logging to: ${CSV_FILE}`);
  console.log(`Pixel file: ${PIXEL_FILE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
