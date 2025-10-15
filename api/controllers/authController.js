const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Service = require("../models/Service");
const { JWT_SECRET } = process.env;

async function completeLoginAndRedirect(req, res, userObj, serviceKey) {
  try {
    const service = await Service.findOne({ where: { service_key: serviceKey, is_active: true } });
    let redirectBase = process.env.FRONTEND_URL;
    if (service && service.service_url) redirectBase = service.service_url;

    // 1️⃣ Create JWT payload
    const payload = {
      sub:
        (userObj.profile &&
          (userObj.profile.uid ||
            userObj.profile.id ||
            userObj.profile.email)) ||
        "unknown",
      provider: userObj.provider || "unknown",
      name:
        (userObj.profile &&
          (userObj.profile.displayName ||
            userObj.profile.cn ||
            userObj.profile.sAMAccountName)) ||
        null,
     iss: "http://localhost:5000",      // your backend server (issuer)
     aud: "http://localhost:5174",                // audience
      jti: crypto.randomUUID(),            // unique token ID
    };

    // 2️⃣ Sign JWT with strong algorithm & shorter expiry
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS512",
      expiresIn: "15m", // shorter expiry reduces risk
    });
    // 3️⃣ Redirect to frontend
    const redirectUrl = `${redirectBase}/auth/callback?token=${(token)}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/auth/failure`);
  }
}

module.exports = { completeLoginAndRedirect };
