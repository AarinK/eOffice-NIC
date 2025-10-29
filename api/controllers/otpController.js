const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ServiceLdapSetting, LoginToken, LoginAuditLog } = require("../models");
const SmsOtpLog = require("../models/smsOtpLog");
const { checkUserExists } = require("../services/ldapService");
const { encryptToken } = require("../utils/Crypto");

const { JWT_SECRET, FRONTEND_URL, BACKEND_URL } = process.env;

exports.verifyOtp = async (req, res) => {
  const { mobile_number, service_id, otp_code } = req.body;
  if (!mobile_number || !service_id || !otp_code) {
    return res.status(400).json({ error: "mobile_number, service_id, and otp_code are required" });
  }

  try {
    const otpEntry = await SmsOtpLog.findOne({
      where: {
        mobile_number,
        service_id,
        is_used: false,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpEntry) return res.status(404).json({ error: "OTP expired or invalid" });

    if (otpEntry.otp_code !== otp_code) {
      otpEntry.attempt_count += 1;
      if (otpEntry.attempt_count >= 5) {
        otpEntry.is_used = true;
        otpEntry.status = "blocked";
      }
      await otpEntry.save();
      return res.status(400).json({ error: "Invalid OTP", attempt_count: otpEntry.attempt_count });
    }

    otpEntry.is_used = true;
    otpEntry.status = "verified";
    await otpEntry.save();

    const settings = await ServiceLdapSetting.findOne({ where: { service_id } });
    const ldapResult = await checkUserExists(otpEntry.user_id, settings);

    const payload = {
      sub: otpEntry.user_id,
      mobile_number: otpEntry.mobile_number,
      service_id: otpEntry.service_id,
      name: ldapResult.name,
      cn: ldapResult.cn,
      sn: ldapResult.sn,
      title: ldapResult.title,
      desc: ldapResult.desc,
      provider: "ldap",
      iss: BACKEND_URL,
      aud: FRONTEND_URL,
      jti: crypto.randomUUID(),
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS512", expiresIn: "15m" });
    const encryptedToken = encryptToken(token);

    // ✅ Create login token entry
    const loginToken = await LoginToken.create({
      username: otpEntry.user_id,
      service_id,
      access_token: encryptedToken,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // ✅ Create audit log entry
    await LoginAuditLog.create({
      username: otpEntry.user_id,
      service_id,
      token_id: loginToken.id,
      action: "LOGIN",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const redirectBase = FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
    res.json({
      success: true,
      redirectUrl: `${redirectBase}/auth/callback?token=${encodeURIComponent(encryptedToken)}`,
      
    });

  } catch (err) {
    console.error("🔥 /verifyOtp error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
