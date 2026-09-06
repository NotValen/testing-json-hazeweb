// Spotify artist top tracks without OAuth: the public embed page ships the
// list (title, duration, 30s preview) inside its __NEXT_DATA__ blob.
// Play counts are not exposed anywhere public, so they come back null.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

async function artistTopTracks(artistId) {
  const r = await fetch(`https://open.spotify.com/embed/artist/${artistId}`, { headers: { 'user-agent': UA, 'accept-language': 'en' } });
  if (!r.ok) throw new Error(`spotify embed ${r.status}`);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('spotify embed: __NEXT_DATA__ missing');
  const entity = (((JSON.parse(m[1]).props || {}).pageProps || {}).state || {}).data;
  const ent = entity && entity.entity;
  const cover = ent && ent.visualIdentity && ent.visualIdentity.image && ent.visualIdentity.image[0] ? ent.visualIdentity.image[0].url : null;
  return ((ent && ent.trackList) || []).map(t => {
    const id = String(t.uri || '').split(':').pop();
    return {
      id,
      title: t.title,
      dur: Math.round((t.duration || 0) / 1000),
      preview: (t.audioPreview && t.audioPreview.url) || null,
      url: `https://open.spotify.com/track/${id}`,
      art: cover,
    };
  });
}

module.exports = { artistTopTracks };
