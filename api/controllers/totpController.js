const speakeasy = require("speakeasy");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { TotpSecret, Service, ServiceLdapSetting, LoginToken, LoginAuditLog } = require("../models");
const { checkUserExists } = require("../services/ldapService");
const { encryptToken } = require("../utils/Crypto");
const { JWT_SECRET, FRONTEND_URL, BACKEND_URL } = process.env;
const { TOTP , Secret} = require("otpauth");

// Mobile: Check user and get secret key
exports.checkAndGenerateTotp = async (req, res) => {
  const { username, service_id } = req.body;

  try {
    // 1️⃣ Get LDAP settings
    const settings = await ServiceLdapSetting.findOne({ where: { service_id } });
    if (!settings) return res.status(404).json({ error: "LDAP settings not found" });

    // 2️⃣ Check user in LDAP
    const ldapResult = await checkUserExists(username, settings);
    if (!ldapResult.userExists)
      return res.status(404).json({ error: "User not found in LDAP" });

    // 3️⃣ Check if secret already exists
    let record = await TotpSecret.findOne({ where: { user_id: username, service_id } });

    // 4️⃣ Generate if not exists
    if (!record) {
      const secret = speakeasy.generateSecret({ name: `MyApp (${username})` });
      record = await TotpSecret.create({
        user_id: username,
        service_id,
        secret_key: secret.base32,
      });
    }

    // 5️⃣ Return secret + user info
    res.json({
      success: true,
      user: ldapResult.name,
      secret_key: record.secret_key,
      otherDetails: {
        cn: ldapResult.cn,
        sn: ldapResult.sn,
        mail: ldapResult.mail,
        mobile: ldapResult.mobilenumber,
      },
    });
  } catch (err) {
    console.error("🔥 checkAndGenerateTotp:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



exports.verifyTotp = async (req, res) => {
  try {
    const { username, service_key, token } = req.body;

    if (!username || !service_key || !token) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Get service ID from service_key
    const service = await Service.findOne({ where: { service_key } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    const service_id = service.id;

    // 2️⃣ Fetch the TOTP record using user_id + service_id
    const totpRecord = await TotpSecret.findOne({
      where: { user_id: username, service_id },
    });
    if (!totpRecord) return res.status(404).json({ error: "TOTP record not found" });

    // 3️⃣ Verify token using otpauth TOTP (with time drift tolerance)
    const totp = new TOTP({
      secret: totpRecord.secret_key,
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    });

    const cleanToken = String(token).trim();

    const delta = totp.validate({ token: cleanToken, window: 1 }); // allow ±30s drift
    console.log("🕒 TOTP Validation Delta:", delta);

    if (delta === null) {
      return res.status(401).json({ error: "Invalid or expired TOTP code" });
    }

    // 4️⃣ Get LDAP info
    const settings = await ServiceLdapSetting.findOne({ where: { service_id } });
    const ldapResult = await checkUserExists(username, settings);

    // 5️⃣ Prepare JWT payload
    const payload = {
      sub: username,
      service_id,
      name: ldapResult.name,
      cn: ldapResult.cn,
      sn: ldapResult.sn,
      title: ldapResult.title,
      desc: ldapResult.desc,
      mail: ldapResult.mail,
      mobile_number: ldapResult.mobilenumber,
      provider: "ldap-totp",
      iss: BACKEND_URL,
      aud: FRONTEND_URL,
      jti: crypto.randomUUID(),
    };

    const signedToken = jwt.sign(payload, JWT_SECRET, { algorithm: "HS512", expiresIn: "15m" });
    const encryptedToken = encryptToken(signedToken);

    // 6️⃣ Create login token entry
    const loginToken = await LoginToken.create({
      username,
      service_id,
      access_token: encryptedToken,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // 7️⃣ Create audit log
    await LoginAuditLog.create({
      username,
      service_id,
      token_id: loginToken.id,
      action: "LOGIN_TOTP",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // 8️⃣ Redirect URL
    const redirectBase = FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
    res.json({
      success: true,
      redirectUrl: `${redirectBase}/auth/callback?token=${encodeURIComponent(encryptedToken)}`,
    });

  } catch (err) {
    console.error("verifyTotp error:", err);
    res.status(500).json({ error: "Server error" });
  }
};