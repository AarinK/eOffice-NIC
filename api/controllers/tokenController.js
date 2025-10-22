const jwt = require("jsonwebtoken");
const { encryptToken, decryptToken } = require("../utils/Crypto");
const { BACKEND_URL, FRONTEND_URL } = process.env;

exports.encrypt = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Text is required" });
    const encrypted = encryptToken(text);
    res.json({ success: true, encrypted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.decrypt = (req, res) => {
  try {
    const { token } = req.body;
    const decrypted = decryptToken(token);
    const payload = jwt.verify(decrypted, process.env.JWT_SECRET, {
      algorithms: ["HS512"],
      issuer: BACKEND_URL,
      audience: FRONTEND_URL,
    });
    res.json({ valid: true, jwt: decrypted, payload });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
};
