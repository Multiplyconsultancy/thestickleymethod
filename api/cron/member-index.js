/* ══════════════════════════════════════════════════════════════════════
   MEMBER EMAIL INDEX.

   Login has to answer one question in well under a second: is this email
   a paying member? Whop can answer it, but only by paging the whole
   membership list fifty at a time, which is far too slow to sit in front
   of a login form and would hammer their API once per attempt.

   So this rebuilds a set of email HASHES in the KV store on a schedule,
   and api/auth/login.js reads that set. Hashes, not addresses: an index
   of every customer email is exactly the file you do not want leaked,
   and login only ever needs to compare, never to read back.

   Writes to a NEW key and renames it over the live one at the end, so a
   failed or partial run never leaves the index half empty and locks
   everybody out.

   CommonJS on purpose: this project has no package.json.
══════════════════════════════════════════════════════════════════════ */

const kv = require('../../lib/kv.js');
const session = require('../../lib/session.js');
const whop = require('../../lib/whopMembers.js');

const LIVE = 'members:emails';
const BUILD = 'members:emails:building';
const TTL = 7 * 86400;          // a week: far longer than the 1h refresh,
                                // so a few failed runs cannot expire it

/* Anybody who found this URL could trigger a full Whop rebuild. It
   leaks nothing, but it hammers their API, so it takes a secret.

   DELIBERATELY FAILS OPEN WHILE CRON_SECRET IS UNSET, so the first
   manual run during setup works from a browser with no extra step. Set
   CRON_SECRET in Vercel afterwards and it locks: Vercel's scheduler
   sends it as a bearer token, and you can still call it by hand with
   ?key= on the end. */
function authorised(req) {
  const want = process.env.CRON_SECRET;
  if (!want) return true;
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let key = '';
  try { key = new URL(req.url, 'https://x').searchParams.get('key') || ''; } catch (e) {}
  return bearer === want || key === want;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorised(req)) return res.status(401).json({ ok: false, error: 'unauthorised' });

  if (!kv.configured())     return res.status(500).json({ ok: false, error: 'KV not configured' });
  if (!session.configured()) return res.status(500).json({ ok: false, error: 'SESSION_SECRET not set' });
  if (!whop.configured())   return res.status(500).json({ ok: false, error: 'Whop not configured' });

  try {
    const memberships = await whop.fetchAllMemberships();

    /* retainsAccess covers members who have cancelled but are still
       inside a paid period. Cutting them off the day they cancel, rather
       than the day their access ends, is a support ticket every time. */
    const hashes = [];
    const seen = new Set();
    for (const m of memberships) {
      if (!whop.retainsAccess(m) && !whop.isComped(m)) continue;
      const email = whop.emailOf(m);
      if (!email) continue;
      const h = session.hashEmail(email);
      if (seen.has(h)) continue;
      seen.add(h);
      hashes.push(h);
    }

    if (!hashes.length) {
      return res.status(500).json({ ok: false, error: 'refusing to publish an empty index' });
    }

    await kv.cmd('DEL', BUILD);
    for (let i = 0; i < hashes.length; i += 500) {
      await kv.cmd('SADD', BUILD, ...hashes.slice(i, i + 500));
    }
    await kv.cmd('EXPIRE', BUILD, String(TTL));
    await kv.cmd('RENAME', BUILD, LIVE);          // atomic swap

    return res.status(200).json({ ok: true, members: hashes.length, of: memberships.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e).slice(0, 200) });
  }
};
