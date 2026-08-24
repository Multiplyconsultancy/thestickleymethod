/* Returns the visitor's country from Vercel's edge geo header, so the
   opt-in form can preselect their dialling code. First-party, no lookup
   service, no IP stored. CommonJS on purpose (no package.json). */
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ country: req.headers['x-vercel-ip-country'] || null });
};
