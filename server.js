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

// Download CSV data (add basic auth for security)
app.get('/download-data/:password', (req, res) => {
  const password = req.params.password;
  
  // Simple password protection - change this to something secure
  if (password !== 'lab-data-2025-secure') {
    return res.status(401).send('Unauthorized');
  }
  
  try {
    if (!fs.existsSync(CSV_FILE)) {
      return res.status(404).send('No data file found');
    }
    
    const csvData = fs.readFileSync(CSV_FILE, 'utf8');
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="tracking-data.csv"'
    });
    
    res.send(csvData);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    res.status(500).send('Error reading data file');
  }
});

// View CSV data in browser (for quick checks)
app.get('/view-data/:password', (req, res) => {
  const password = req.params.password;
  
  // Same password protection
  if (password !== 'lab-data-2025-secure') {
    return res.status(401).send('Unauthorized');
  }
  
  try {
    if (!fs.existsSync(CSV_FILE)) {
      return res.status(404).send('No data file found');
    }
    
    const csvData = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvData.trim().split('\n');
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Tracking Data</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .timestamp { white-space: nowrap; }
    .participant { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Tracking Data (${lines.length - 1} entries)</h1>
  <p><a href="/download-data/lab-data-2025-secure">Download CSV</a></p>
  <table>
`;

    lines.forEach((line, index) => {
      if (line.trim()) {
        const cols = line.split(',');
        html += '<tr>';
        cols.forEach((col, colIndex) => {
          const cleanCol = col.replace(/^"|"$/g, ''); // Remove quotes
          const cellClass = colIndex === 0 ? 'timestamp' : colIndex === 1 ? 'participant' : '';
          const tag = index === 0 ? 'th' : 'td';
          html += `<${tag} class="${cellClass}">${cleanCol}</${tag}>`;
        });
        html += '</tr>';
      }
    });

    html += `
  </table>
  <p>Last updated: ${new Date().toISOString()}</p>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    res.status(500).send('Error reading data file');
  }
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
