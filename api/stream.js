// GET /api/stream?id=<soundcloud track id> — 302 to a fresh signed MP3.
// The <audio> element follows the redirect, so this can be set as src straight
// from a tap handler and iOS still counts it as user-initiated playback.
const { streamUrl } = require('../lib/sc');

module.exports = async (req, res) => {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const id = String(q.id || '').replace(/\D/g, '');
  if (!id) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'id required' }));
    return;
  }
  try {
    const { url } = await streamUrl(id);
    res.statusCode = 302;
    res.setHeader('location', url);
    res.setHeader('cache-control', 'private, no-store');
    res.end();
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
};
