// api/novels.js - Vercel serverless proxy for novel list with pagination

const API_BASE = 'https://novelarchive.cc/api';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { page = 1, limit = 50, sort = 'recent', search = '', status = '' } = req.query;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(Math.min(Number(limit), 100)),
    sort
  });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const response = await fetch(`${API_BASE}/novels?${params}`, {
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

    // Normalize: map API novels to our format
    const novels = (data.novels || []).map(n => ({
      id: n.id,
      apiId: n.id,
      title: n.title,
      author: n.author,
      cover: n.cover_url || n.image_url || n.novel_image,
      description: (n.description || '').slice(0, 500),
      chapterCount: parseInt(n.total_chapters) || 0,
      tags: n.genres ? n.genres.split(',').map(g => g.trim()).filter(Boolean) : [],
      status: n.release_status || n.ongoing || 'unknown',
      views: n.views_number || 0
    }));

    return res.status(200).json({
      novels,
      pagination: data.pagination || { page: 1, total: 0, total_pages: 0, has_next: false }
    });
  } catch (err) {
    console.error(`Proxy error for novels list:`, err.message);
    return res.status(502).json({ error: 'Failed to fetch from upstream', detail: err.message });
  }
};
