// Vercel / Standard Node Serverless Handler for /api/lead
import handler from '../netlify/functions/send-lead-email.mjs';

export default async function vercelHandler(req, res) {
  // If invoked with Node req/res (e.g. Vercel)
  if (res && typeof res.status === 'function') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      return res.status(204).end();
    }

    try {
      const url = `https://${req.headers.host || 'localhost'}${req.url || '/api/lead'}`;
      const webReq = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
      });
      const webRes = await handler(webReq);
      res.status(webRes.status);
      webRes.headers.forEach((val, key) => res.setHeader(key, val));
      const json = await webRes.json();
      return res.json(json);
    } catch (err) {
      console.error('Vercel API lead handler error:', err);
      return res.status(500).json({ ok: false, error: 'Internal server error.' });
    }
  }

  // Standard Web Request
  return handler(req);
}
