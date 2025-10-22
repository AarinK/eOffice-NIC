const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Service = require("../models/Service");
const { LoginToken, LoginAuditLog } = require("../models");
const { JWT_SECRET, FRONTEND_URL, BACKEND_URL } = process.env;
const { encryptToken } = require("../utils/Crypto");

async function completeLoginAndRedirect(req, res, userObj, serviceKey) {
  try {
    const service = await Service.findOne({ where: { service_key: serviceKey, is_active: true } });
    let redirectBase = service?.service_url || FRONTEND_URL;

    // ✅ Add service_id in JWT payload
    const payload = {
      sub: userObj.profile?.uid || userObj.profile?.id || userObj.profile?.email || "unknown",
      provider: userObj.provider || "unknown",
      name: userObj.profile?.displayName || userObj.profile?.cn || userObj.profile?.sAMAccountName || null,
      iss: BACKEND_URL,
      aud: FRONTEND_URL,
      jti: crypto.randomUUID(),
      service_id: service?.id || null, // ✅ Added here
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS512", expiresIn: "15m" });
    const encryptedToken = encryptToken(token);

    // ✅ Save login token
    const loginToken = await LoginToken.create({
      username: payload.sub,
      service_id: service?.id || null,
      access_token: encryptedToken,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // ✅ Save audit log
    await LoginAuditLog.create({
      username: payload.sub,
      service_id: service?.id || null,
      token_id: loginToken.id,
      action: "LOGIN",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const redirectUrl = `${redirectBase}/auth/callback?token=${encodeURIComponent(encryptedToken)}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error(err);
    return res.redirect(`${FRONTEND_URL}/auth/failure`);
  }
}

module.exports = { completeLoginAndRedirect };
