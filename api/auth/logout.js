/* Clears the session cookie. Deliberately does NOT drop the device from
   the member's set: the cap is about how many places a login is being
   used, and letting a sign-out reset it would make the cap trivially
   avoidable. Devices age out with the rolling window instead. */

const session = require('../../lib/session.js');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', session.clearCookie());
  if (req.method === 'POST') return res.status(200).json({ ok: true });
  res.writeHead(302, { Location: '/member/start/login' });
  res.end();
};
