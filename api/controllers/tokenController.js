const jwt = require("jsonwebtoken");
const redisClient = require("../utils/redisClient");
const { encryptToken, decryptToken } = require("../utils/Crypto");

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
      issuer: "http://localhost:5000",
      audience: "http://localhost:5174",
    });
    res.json({ valid: true, jwt: decrypted, payload });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
};
