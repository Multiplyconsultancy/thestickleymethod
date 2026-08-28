/* ══════════════════════════════════════════════════════════════════════════
   BASE44 LOOKSMAXXING · MAIN PIPELINE — keeps the board current.

   Every eligible looksmaxxing opt-in gets a card, and it sits at the
   furthest stage the evidence supports:

     Opt-in            opted in, never dialled
     Called            dialled, but no conversation yet
     Spoken to         a call of 30 seconds or more
     Purchased monthly base44-sale-monthly
     Purchased yearly  base44-sale-yearly

   DERIVED, NOT TRACKED. Placement is recomputed from live Close call data
   on every run rather than from transitions, so a missed run costs nothing
   and the next pass corrects it. Same principle as lib/placement.js.

   ONLY EVER MOVES FORWARD. If a setter drags a card ahead of what the call
   data shows, that is a human judgement and it stands. Demoting people
   would quietly undo their work, which is the rule lib/placement.js sets
   out for setter-owned columns and it applies here too.

   Dry run by default. Requires CRON_SECRET or CLOSE_SYNC_SECRET.
══════════════════════════════════════════════════════════════════════════ */

const CLOSE = 'https://api.close.com/api/v1';
const GHL = 'https://services.leadconnectorhq.com';

const PIPELINE = 'XwPyrhY1S7evBltxWEmf';
const STAGES = {
  'Opt-in': '19328f6c-13ef-418d-b806-66d4bec89b02',
  Called: '851b2f0f-5f06-40ac-a8ec-e3056d96e808',
  'Spoken to': 'd7214059-351f-41b4-8430-d56788ea890c',
  'Purchased monthly': '284ab2cd-e008-4357-964d-057d9da7201a',
  'Purchased yearly': '2290291a-a829-4cbf-9d93-5689c73061bb',
};
const ORDER = ['Opt-in', 'Called', 'Spoken to', 'Purchased monthly', 'Purchased yearly'];
const rank = (name) => ORDER.indexOf(name);

/* A call is a conversation at 30 seconds. Below that it is voicemail, a
   hang-up, or a dial that never connected. Measured against the real data:
   93 of 304 people dialled clear this bar. */
const SPOKEN_SECONDS = 30;

/* The 46 dialling codes of the 47 commissionable countries. US and Canada
   share +1. Kept in step with api/lead.js by hand. */
const ELIGIBLE_DIAL_CODES = [
  '+1', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40',
  '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+61',
  '+64', '+65', '+81', '+82', '+351', '+352', '+353', '+354', '+356',
  '+357', '+358', '+370', '+371', '+372', '+385', '+386', '+420', '+421',
  '+852', '+853', '+886', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
].sort((a, b) => b.length - a.length);

const TEST_ADDRESS = /testlead|selftest|@thestickleymethod\.com$|example\.com/i;

const ghlHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
  Accept: 'application/json',
  // GHL sits behind Cloudflare and 403s anything that looks like a bot.
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
});
const closeHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${process.env.CLOSE_API_KEY}:`).toString('base64')}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});
const jsonOrNull = async (res) => { try { return await res.json(); } catch (e) { return null; } };
const eligiblePhone = (phone) => {
  const e = String(phone || '').replace(/[^\d+]/g, '');
  return ELIGIBLE_DIAL_CODES.some((c) => e.startsWith(c));
};

/* Longest call per Close lead, and the emails on that lead. Two passes:
   the calls give the durations, then only the leads that actually have
   calls are resolved to contacts. Resolving every lead would be thousands
   of requests for nothing. */
async function callStateByEmail() {
  const longest = new Map();
  for (let skip = 0; skip <= 8000; skip += 100) {
    const res = await fetch(`${CLOSE}/activity/call/?_limit=100&_skip=${skip}`, { headers: closeHeaders() });
    const data = await jsonOrNull(res);
    const rows = (data && data.data) || [];
    for (const c of rows) {
      const id = c.lead_id;
      if (!id) continue;
      longest.set(id, Math.max(longest.get(id) || 0, c.duration || 0));
    }
    if (!data || !data.has_more || !rows.length) break;
  }
  const state = new Map();
  const ids = [...longest.keys()];
  for (let i = 0; i < ids.length; i += 8) {
    const batch = await Promise.all(ids.slice(i, i + 8).map(async (id) => {
      const res = await fetch(`${CLOSE}/lead/${id}/?_fields=contacts`, { headers: closeHeaders() });
      const l = await jsonOrNull(res);
      return [id, ((l && l.contacts) || []).flatMap((ct) => (ct.emails || []).map((e) => String(e.email).toLowerCase()))];
    }));
    for (const [id, emails] of batch) {
      const stage = (longest.get(id) || 0) >= SPOKEN_SECONDS ? 'Spoken to' : 'Called';
      for (const em of emails) {
        if (rank(stage) > rank(state.get(em) || 'Opt-in')) state.set(em, stage);
      }
    }
  }
  return state;
}

async function eligibleOptIns() {
  const out = new Map();
  for (let page = 1; page <= 12; page += 1) {
    const res = await fetch(`${GHL}/contacts/search`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        pageLimit: 100,
        page,
        filters: [{ field: 'tags', operator: 'eq', value: 'base44-optin' }],
      }),
    });
    const data = await jsonOrNull(res);
    const rows = (data && data.contacts) || [];
    for (const c of rows) {
      const email = String(c.email || '').toLowerCase();
      if (!email || TEST_ADDRESS.test(email) || out.has(email)) continue;
      if (!eligiblePhone(c.phone)) continue;
      out.set(email, c);
    }
    if (rows.length < 100) break;
  }
  return out;
}

module.exports = async (req, res) => {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '')
    || String(req.query.secret || '');
  const accepted = [process.env.CRON_SECRET, process.env.CLOSE_SYNC_SECRET].filter(Boolean);
  if (!supplied || !accepted.includes(supplied)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const commit = String(req.query.commit) === '1';

  const [people, calls] = await Promise.all([eligibleOptIns(), callStateByEmail()]);
  const summary = { created: 0, moved: 0, unchanged: 0, ahead: 0, failed: 0 };
  const moves = [];

  for (const [email, contact] of people) {
    const tags = contact.tags || [];
    let want = 'Opt-in';
    if (tags.includes('base44-sale-yearly')) want = 'Purchased yearly';
    else if (tags.includes('base44-sale-monthly')) want = 'Purchased monthly';
    else want = calls.get(email) || 'Opt-in';

    const q = await fetch(
      `${GHL}/opportunities/search?location_id=${process.env.GHL_LOCATION_ID}&contact_id=${contact.id}`,
      { headers: ghlHeaders() });
    const found = (((await jsonOrNull(q)) || {}).opportunities || [])
      .find((o) => o.pipelineId === PIPELINE);

    if (!found) {
      if (commit) {
        const r = await fetch(`${GHL}/opportunities/`, {
          method: 'POST',
          headers: ghlHeaders(),
          body: JSON.stringify({
            locationId: process.env.GHL_LOCATION_ID,
            pipelineId: PIPELINE,
            pipelineStageId: STAGES[want],
            contactId: contact.id,
            name: (`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || email).slice(0, 80),
            status: 'open',
          }),
        });
        r.ok ? summary.created += 1 : summary.failed += 1;
      } else summary.created += 1;
      moves.push({ email, to: want, action: 'create' });
      continue;
    }

    const current = Object.keys(STAGES).find((k) => STAGES[k] === found.pipelineStageId);
    if (current === want) { summary.unchanged += 1; continue; }
    /* Never demote. A card ahead of the call data was moved by a human. */
    if (rank(current) > rank(want)) { summary.ahead += 1; continue; }

    if (commit) {
      const r = await fetch(`${GHL}/opportunities/${found.id}`, {
        method: 'PUT',
        headers: ghlHeaders(),
        body: JSON.stringify({ pipelineId: PIPELINE, pipelineStageId: STAGES[want], status: 'open' }),
      });
      r.ok ? summary.moved += 1 : summary.failed += 1;
    } else summary.moved += 1;
    moves.push({ email, from: current, to: want, action: 'move' });
  }

  return res.status(200).json({
    ok: true,
    mode: commit ? 'live' : 'dry-run',
    eligibleOptIns: people.size,
    ...summary,
    moves: moves.slice(0, 60),
  });
};
