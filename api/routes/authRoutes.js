const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const redisClient = require("../utils/redisClient");
const { Service, ServiceLdapSetting } = require("../models");
const SmsOtpLog = require("../models/smsOtpLog");
const { JWT_SECRET } = process.env;
const { checkUserExists } = require("../services/ldapService");
const { completeLoginAndRedirect } = require("../controllers/authController");
const { Op } = require("sequelize");
const crypto = require("crypto");
const redirectBase = process.env.FRONTEND_URL?.replace(/\/$/, '') || "http://localhost:3000";
const { encryptToken,decryptToken } = require("../utils/Crypto");

const router = express.Router();

/* -------------------- LDAP Check User & Generate OTP -------------------- */
router.post("/checkUser", async (req, res) => {
  const { username, service_key } = req.body;
  console.log("[LDAP] /checkUser called with:", { username, service_key });

  if (!username || !service_key) {
    return res.status(400).json({ error: "username and service_key are required" });
  }

  try {
    const service = await Service.findOne({ where: { service_key } });
    if (!service) return res.status(404).json({ error: "Invalid service_key" });

    const settings = await ServiceLdapSetting.findOne({ where: { service_id: service.id } });
    if (!settings) return res.status(404).json({ error: "LDAP settings not found for this service" });

    const ldapResult = await checkUserExists(username, settings);

    if (!ldapResult.userExists) {
      return res.json({ service_id: service.id, userExists: false, mobilenumber: "" });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const otpLog = await SmsOtpLog.create({
      user_id: ldapResult.name,
      service_id: service.id,
      mobile_number: ldapResult.mobilenumber,
      otp_code: otpCode,
      provider: "MSG91",

      status: "pending",   // pending initially
      attempt_count: 0,
      is_used: false,
      created_at: now,
      expires_at: expiresAt,
      used_at: null,
    });

    res.json({
      service_id: service.id,
      userExists: true,
      mobilenumber: ldapResult.mobilenumber,
      name:ldapResult.name,
      cn:ldapResult.cn,
      sn:ldapResult.sn,
      title:ldapResult.title,
      desc:ldapResult.desc,

      otp_code: otpCode, // optional for testing
      otp_id: otpLog.id,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("[LDAP] Error in /checkUser:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* -------------------- OTP Verification -------------------- */
router.post("/verifyOtp", async (req, res) => {
  const { mobile_number, service_id, otp_code } = req.body;

  if (!mobile_number || !service_id || !otp_code) {
    return res.status(400).json({ error: "mobile_number, service_id, and otp_code are required" });
  }

  try {
    // 1️⃣ Find the latest OTP entry
    const otpEntry = await SmsOtpLog.findOne({
      where: {
        mobile_number,
        service_id,
        is_used: false,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpEntry) {
      // Mark expired OTPs as used
      await SmsOtpLog.update(
        { status: "expired", is_used: true },
        {
          where: {
            mobile_number,
            service_id,
            is_used: false,
            expires_at: { [Op.lte]: new Date() },
          },
        }
      );
      return res.status(404).json({ error: "OTP not found or already used/expired" });
    }

    // 2️⃣ Handle incorrect attempts
    if (otpEntry.attempt_count >= 5) {
      otpEntry.status = "blocked";
      await otpEntry.save();
      return res.status(403).json({ error: "OTP blocked due to too many incorrect attempts" });
    }

    if (otpEntry.otp_code !== otp_code) {
      otpEntry.attempt_count += 1;
      if (otpEntry.attempt_count >= 5) {
        otpEntry.is_used = true;
        otpEntry.status = "blocked";
      }
      await otpEntry.save();
      return res.status(400).json({ error: "Invalid OTP", attempt_count: otpEntry.attempt_count });
    }

    // ✅ Mark OTP as used
    otpEntry.is_used = true;
    otpEntry.used_at = new Date();
    otpEntry.status = "verified";
    await otpEntry.save();

    // 3️⃣ Get LDAP settings for this service
    const settings = await ServiceLdapSetting.findOne({ where: { service_id } });
    if (!settings) return res.status(404).json({ error: "LDAP settings not found" });

    // 4️⃣ Query LDAP for user info
    const ldapResult = await checkUserExists(otpEntry.user_id, settings);
    if (!ldapResult.userExists) return res.status(404).json({ error: "User not found in LDAP" });

    // 5️⃣ Build JWT payload with LDAP info
    const payload = {
      sub: otpEntry.user_id,
      mobile_number: otpEntry.mobile_number,
      service_id: otpEntry.service_id,
      otp_id: otpEntry.id,
      otp_expires_at: otpEntry.expires_at,
      name: ldapResult.name,
      cn: ldapResult.cn,
      sn: ldapResult.sn,
      title: ldapResult.title,
      desc: ldapResult.desc,
      provider: "otp",
      iss: "http://localhost:5000",
      aud: "http://localhost:5174",
      jti: crypto.randomUUID(),
    };

    // 6️⃣ Sign JWT
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS512", expiresIn: "15m" });


    // 7️⃣ Redirect to frontend callback
    const redirectBase = process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
const redirectUrl = `${redirectBase}/auth/callback?token=${token}`;
    console.log("Redirecting to:", redirectUrl);

    res.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("🔥 /verifyOtp error:", err);
    const redirectBase = process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return res.redirect(`${redirectBase}/auth/failure`);
  }
});
/* -------------------- Google OAuth -------------------- */
router.get("/google", (req, res, next) => {
  const serviceKey = req.query.service || "default";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "login select_account",
    state: serviceKey,
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/auth/failure` }),
  async (req, res) => {
    const serviceKey = req.query.state || "default";
    await completeLoginAndRedirect(req, res, req.user, serviceKey);
  }
);

/* -------------------- Session Timeout -------------------- */
router.get("/timeout", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1] || req.query.token;
    if (!token) {
      res.clearCookie("auth_token");
      return res.status(401).json({ message: "Session expired" });
    }

    const decoded = jwt.decode(token);
    if (!decoded) {
      res.clearCookie("auth_token");
      return res.status(401).json({ message: "Session expired" });
    }

    const jti = decoded.jti;
    if (jti) {
      const now = Math.floor(Date.now() / 1000);
      const expiry = decoded.exp - now;
      if (expiry > 0) {
        await redisClient.setEx(`blacklist:${jti}`, expiry, "true");
        console.log(`🚫 Token blacklisted due to timeout: ${jti}, expires in ${expiry}s`);
      }
    }

    res.clearCookie("auth_token");
    return res.status(401).json({ message: "Session timed out, logged out" });
  } catch (err) {
    console.error("🔥 Timeout logout error:", err);
    return res.status(500).json({ message: "Timeout logout failed", error: err.message });
  }
});

/* -------------------- Logout -------------------- */
router.get("/logout", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1] || req.query.token;
    if (!token) {
      res.clearCookie("auth_token");
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    const decoded = jwt.decode(token);
    if (!decoded) {
      res.clearCookie("auth_token");
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    const jti = decoded.jti;
    if (jti) {
      const now = Math.floor(Date.now() / 1000);
      const expiry = decoded.exp - now;
      if (expiry > 0) {
        await redisClient.setEx(`blacklist:${jti}`, expiry, "true");
        console.log(`🚫 Token blacklisted: ${jti}, expires in ${expiry}s`);
      }
    }

    res.clearCookie("auth_token");
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
  } catch (err) {
    console.error("🔥 Logout error:", err);
    return res.status(500).json({ message: "Logout failed", error: err.message });
  }
});

router.post("/decrypt", (req, res) => {
  try {
    const { token } = req.body;

    // Step 1: Decrypt the incoming token
    const decrypted = decryptToken(token);

    // Step 2: Verify the decrypted token
    const decoded = jwt.verify(decrypted, JWT_SECRET);

    // Step 3: Return both the decrypted JWT and payload
    res.json({
      valid: true,
      jwt: decrypted,   // this is now a usable JWT for Authorization header
      payload: decoded, // decoded payload for frontend use
    });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

router.post("/encrypt", (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required" });
    }

    const encrypted = encryptToken(text);
    res.json({ success: true, encrypted });
  } catch (err) {
    console.error("Encryption error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- QR LOGIN (Phone Linking) -------------------- */
const { v4: uuidv4 } = require("uuid");

router.get("/qr-session", async (req, res) => {
  const sessionId = uuidv4();
  await redisClient.setEx(`qr:${sessionId}`, 300, JSON.stringify({ status: "pending" })); // expires in 5 min
  res.json({ sessionId });
});

router.post("/link-qr", async (req, res) => {
  const { sessionId, token } = req.body;
  if (!sessionId || !token) return res.status(400).json({ error: "Missing sessionId or token" });

  try {
    const decrypted = decryptToken(token);
    const payload = jwt.verify(decrypted, JWT_SECRET);

    await redisClient.setEx(`qr:${sessionId}`, 300, JSON.stringify({
      status: "linked",
      user: payload,
      token,
    }));

    res.json({ success: true, message: "QR linked successfully" });
  } catch (err) {
    console.error("QR link error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get("/qr-status/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const data = await redisClient.get(`qr:${sessionId}`);

  if (!data) return res.json({ status: "expired" });
  const parsed = JSON.parse(data);

  if (parsed.status === "linked") {
    return res.json({ status: "linked", token: parsed.token });
  }

  res.json({ status: "pending" });
});

const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// Generate TOTP secret for user
router.post("/totp/setup", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  try {
    // 1️⃣ Generate secret
    const secret = speakeasy.generateSecret({
      name: `MyApp (${user_id})`,
      length: 20,
    });

    // 2️⃣ Save secret in DB for this user (replace with your DB logic)
    await User.update({ totp_secret: secret.base32 }, { where: { id: user_id } });

    // 3️⃣ Generate QR code for app scanning
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ secret: secret.base32, qrCode: qrCodeDataURL });
  } catch (err) {
    console.error("🔥 /totp/setup error:", err);
    res.status(500).json({ error: "Failed to setup TOTP" });
  }
});

// Verify TOTP code
router.post("/totp/verify", async (req, res) => {
  const { user_id, token } = req.body;
  if (!user_id || !token) return res.status(400).json({ error: "user_id and token are required" });

  try {
    // 1️⃣ Get user's TOTP secret from DB
    const user = await User.findByPk(user_id);
    if (!user || !user.totp_secret) return res.status(404).json({ error: "TOTP not setup for user" });

    // 2️⃣ Verify token
    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: "base32",
      token: token,
      window: 1, // ±30s for clock drift
    });

    if (!verified) return res.status(400).json({ error: "Invalid TOTP code" });

    // 3️⃣ Optionally issue JWT (similar to OTP login)
    const payload = { sub: user.id, method: "totp" };
    const tokenJwt = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

    res.json({ success: true, token: tokenJwt });
  } catch (err) {
    console.error("🔥 /totp/verify error:", err);
    res.status(500).json({ error: "Failed to verify TOTP" });
  }
});

router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    const profile = req.user.profile;

    const payload = {
      sub: profile.id || "unknown",      // unique identifier
      provider: "facebook",
      name: profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
      iss: "http://localhost:5000",      // must match middleware
      aud: "http://localhost:5174",      // must match middleware
      jti: crypto.randomUUID(),          // unique token ID
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: "HS512",
      expiresIn: "1h",
    });

    const redirectBase = process.env.FRONTEND_URL || "http://localhost:5174";
    res.redirect(`${redirectBase}/auth/callback?token=${token}`);
  }
);


module.exports = router;
