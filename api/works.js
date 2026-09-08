// GET /api/works — every upload from the roster, SoundCloud + Spotify, one list.
// SoundCloud is the source of truth (it has play counts). Spotify top tracks
// are matched onto SC uploads by title to add the SP badge; the ones that only
// exist on Spotify are appended after, with plays unknown.
const { userTracks, artwork, progressive } = require('../lib/sc');
const { artistTopTracks } = require('../lib/sp');

const ARTISTS = [
  { id: 'skesh', sc: 'https://soundcloud.com/skeshbtw', sp: '42ZKXyAY5TLpkLY2lncU9y' },
  { id: 'nuzzi', sc: 'https://soundcloud.com/1nuji', sp: '0Lsj6iyj2QAJA6X2rOCLy7' },
  { id: 'shinru', sc: 'https://soundcloud.com/shinru2006', sp: null },
  { id: 'valenlmao', sc: 'https://soundcloud.com/valenferbyan', sp:'0oowY63X7mj7aiwhtAFSKx' } // producer, SoundCloud only
];

// "Everything feat. NUZZi (prod. skesh)" and "Everything" should meet.
const norm = s => String(s || '')
  .toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, ' ')
  .replace(/\b(feat|ft|prod|w\/|remix|sped up|instrumental|vip mix)\b.*$/, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const same = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
};

module.exports = async (req, res) => {
  const errors = [];
  const tracks = [];
  const spOnly = [];

  const results = await Promise.all(ARTISTS.map(async a => {
    const [sc, sp] = await Promise.all([
      userTracks(a.sc).catch(e => { errors.push(`sc:${a.id}: ${e.message}`); return null; }),
      a.sp ? artistTopTracks(a.sp).catch(e => { errors.push(`sp:${a.id}: ${e.message}`); return []; }) : Promise.resolve([]),
    ]);
    return { a, sc, sp };
  }));

  for (const { a, sc } of results) {
    for (const t of (sc ? sc.tracks : [])) {
      if (t.streamable === false || (t.policy && t.policy !== 'ALLOW' && t.policy !== 'MONETIZE')) continue;
      tracks.push({
        title: t.title, artist: a.id, platforms: ['SC'],
        plays: t.playback_count || 0, dur: Math.round((t.duration || 0) / 1000),
        year: new Date(t.created_at || t.display_date || Date.now()).getFullYear(),
        preview: progressive(t), art: artwork(t),
        sc: { id: t.id, url: t.permalink_url },
        sp: null, _n: norm(t.title),
      });
    }
  }

  for (const { a, sp } of results) {
    for (const s of sp) {
      const n = norm(s.title);
      const hit = tracks.find(t => t.artist === a.id && same(t._n, n)) || tracks.find(t => same(t._n, n));
      if (hit) {
        if (!hit.platforms.includes('SP')) hit.platforms.push('SP');
        hit.sp = hit.sp || { id: s.id, url: s.url, preview: s.preview };
        if (!hit.art && s.art) hit.art = s.art;
      } else {
        spOnly.push({
          title: s.title, artist: a.id, platforms: ['SP'],
          plays: null, dur: s.dur, year: null,
          preview: !!s.preview, art: s.art,
          sc: null, sp: { id: s.id, url: s.url, preview: s.preview }, _n: n,
        });
      }
    }
  }

  tracks.sort((x, y) => (y.plays - x.plays) || (y.year - x.year));
  spOnly.sort((x, y) => x.title.localeCompare(y.title));
  const all = tracks.concat(spOnly).map((t, i) => { const { _n, ...rest } = t; return { code: 'HZ-W' + String(i + 1).padStart(2, '0'), ...rest }; });

  if (all.length === 0) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify({ error: 'no tracks', errors }));
    return;
  }
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', errors.length ? 'public, s-maxage=120, stale-while-revalidate=600' : 'public, s-maxage=900, stale-while-revalidate=86400');
  res.end(JSON.stringify({ updatedAt: new Date().toISOString(), count: all.length, tracks: all, errors }));
};
