// controllers/authController.js
const { ldapAuthenticate } = require('../services/ldapService');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('[Auth] Missing credentials.');
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    console.log(`[Auth] Login attempt for: ${username}`);
    const userDetails = await ldapAuthenticate(username, password);
    res.json({ user: userDetails });
  } catch (err) {
    console.log('[Auth] Authentication error:', err);
    res.status(401).json({ error: err });
  }
};
