// SoundCloud api-v2 client. There is no public API key for SC any more, so we
// do what the web player does: pull the client_id out of its own JS bundle.
// It rotates every few weeks; on a 401/403 we re-scrape once and retry.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const API = 'https://api-v2.soundcloud.com';

let cache = { cid: process.env.SC_CLIENT_ID || null, at: 0 };

async function text(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.text();
}

async function scrapeClientId() {
  const home = await text('https://soundcloud.com/');
  const bundles = [...home.matchAll(/<script[^>]+src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(m => m[1]).reverse();
  for (const src of bundles) {
    const m = (await text(src)).match(/client_id\s*[:=]\s*"([A-Za-z0-9]{32})"/);
    if (m) return m[1];
  }
  throw new Error('soundcloud client_id not found in bundles');
}

async function clientId(force) {
  if (!force && cache.cid) return cache.cid;
  cache = { cid: await scrapeClientId(), at: Date.now() };
  return cache.cid;
}

async function api(path, params = {}, retry = true) {
  const cid = await clientId();
  const u = new URL(path.startsWith('http') ? path : API + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('client_id', cid);
  const r = await fetch(u, { headers: { 'user-agent': UA } });
  if ((r.status === 401 || r.status === 403) && retry) {
    await clientId(true);
    return api(path, params, false);
  }
  if (!r.ok) throw new Error(`soundcloud ${r.status} ${u.pathname}`);
  return r.json();
}

// All public uploads of a profile, newest first, following next_href pages.
async function userTracks(permalink, max = 200) {
  const user = await api('/resolve', { url: permalink });
  if (user.kind !== 'user') throw new Error(`${permalink} is not a user`);
  let page = await api(`/users/${user.id}/tracks`, { limit: 50, linked_partitioning: 1 });
  const out = [...(page.collection || [])];
  while (page.next_href && out.length < max) {
    page = await api(page.next_href);
    out.push(...(page.collection || []));
  }
  return { user, tracks: out.slice(0, max) };
}

function artwork(t) {
  const a = t.artwork_url || (t.user && t.user.avatar_url) || null;
  return a ? a.replace('-large.', '-t500x500.') : null;
}

function progressive(t) {
  return ((t.media && t.media.transcodings) || []).some(x => x.format && x.format.protocol === 'progressive');
}

// Signed CDN URL for a track. Expires after a few hours, so resolve per play.
async function streamUrl(trackId) {
  const t = await api(`/tracks/${trackId}`);
  const tcs = (t.media && t.media.transcodings) || [];
  const pick = tcs.find(x => x.format && x.format.protocol === 'progressive') || tcs.find(x => x.format && x.format.protocol === 'hls');
  if (!pick) throw new Error('track has no transcodings');
  const r = await api(pick.url, t.track_authorization ? { track_authorization: t.track_authorization } : {});
  if (!r.url) throw new Error('no stream url returned');
  return { url: r.url, protocol: pick.format.protocol };
}

module.exports = { userTracks, streamUrl, clientId, artwork, progressive };
