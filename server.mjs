// Azora Solutions — Local Development & Preview Server
// Serves static website files and live /api/lead endpoint
import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './netlify/functions/send-lead-email.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // 1. API Endpoints
  if (pathname === '/api/lead' || pathname === '/.netlify/functions/send-lead-email') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bodyBuffer = Buffer.concat(chunks);
      const bodyText = bodyBuffer.toString('utf-8');

      const webReq = new Request(`http://${req.headers.host || 'localhost'}${pathname}`, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' && bodyText ? bodyText : undefined
      });

      const webRes = await handler(webReq);
      res.statusCode = webRes.status;
      webRes.headers.forEach((val, key) => res.setHeader(key, val));
      const json = await webRes.json().catch(() => ({}));
      res.end(JSON.stringify(json));
      return;
    } catch (err) {
      console.error('API Error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  // 2. Static File Resolution
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 404 Handler
  const notFoundPath = path.join(__dirname, '404.html');
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (fs.existsSync(notFoundPath)) {
    fs.createReadStream(notFoundPath).pipe(res);
  } else {
    res.end('<h1>404 Not Found</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Azora Solutions Local Server is running!`);
  console.log(`  🔗 Website URL:   http://localhost:${PORT}`);
  console.log(`  📝 Quote Form:   http://localhost:${PORT}/quote`);
  console.log(`  📡 API Endpoint: http://localhost:${PORT}/api/lead`);
  console.log(`======================================================\n`);
});
