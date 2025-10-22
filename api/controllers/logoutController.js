const { LoginToken, LoginAuditLog } = require("../models");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { decryptToken } = require("../utils/Crypto"); // your decrypt function

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const encryptedToken = authHeader.split(" ")[1];
    if (!encryptedToken) return res.status(401).json({ error: "Token malformed" });

    // 🔹 Decrypt first
    let decrypted;
    try {
      decrypted = decryptToken(encryptedToken);
    } catch (err) {
      return res.status(400).json({ error: "Invalid encrypted token" });
    }

    // 🔹 Then verify JWT
    let decoded;
    try {
      decoded = jwt.verify(decrypted, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const loginEntry = await LoginToken.findOne({
      where: {
        username: decoded.sub,
        service_id: decoded.service_id,
        access_token: encryptedToken, // still match the encrypted token in DB
        status: "ACTIVE",
      },
    });

    if (!loginEntry) return res.status(404).json({ error: "Login session not found" });

    loginEntry.logout_time = new Date();
    loginEntry.status = "LOGOUT";
    await loginEntry.save();

    await LoginAuditLog.create({
      username: decoded.sub,
      service_id: decoded.service_id,
      token_id: loginEntry.id,
      action: "LOGOUT",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("🔥 /logout error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
