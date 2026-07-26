// api/proxy/novel/[id]/index.js - Vercel serverless proxy for chapter list
// Proxies requests to novelarchive.cc API with CORS headers

const API_BASE = 'https://novelarchive.cc/api';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing novel ID' });
  }

  try {
    const response = await fetch(`${API_BASE}/novels/${id}`, {
      headers: {
        'User-Agent': 'LuminaScript/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(`Proxy error for novel ${id}:`, err.message);
    return res.status(502).json({ error: 'Failed to fetch from upstream', detail: err.message });
  }
};
