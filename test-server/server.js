#!/usr/bin/env node

/**
 * Simple HTTP server for testing screenshot capture
 * Serves test.html on http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TEST_HTML = fs.readFileSync(path.join(__dirname, 'test.html'), 'utf-8');

const server = http.createServer((req, res) => {
  // Allow CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/test.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(TEST_HTML);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Test server running at http://127.0.0.1:${PORT}`);
  console.log(`📄 Test page: http://127.0.0.1:${PORT}/test.html\n`);
});

process.on('SIGINT', () => {
  console.log('\n\n📛 Server stopped');
  process.exit(0);
});
