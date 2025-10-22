const { SmsOtpLog, ServiceLdapSetting } = require("../models");
const { checkUserExists } = require("../services/ldapService");
const crypto = require("crypto");

exports.resendOtp = async (req, res) => {
  const { mobile_number, service_id } = req.body;

  if (!mobile_number || !service_id) {
    console.log("❌ Missing mobile_number or service_id");
    return res.status(400).json({ error: "mobile_number and service_id are required" });
  }

  try {
    // 1️⃣ Find the last unused OTP
    const lastOtp = await SmsOtpLog.findOne({
      where: { mobile_number, service_id, is_used: false },
      order: [["created_at", "DESC"]],
    });

    if (!lastOtp) {
      return res.status(404).json({ error: "No previous OTP found. Try normal login flow." });
    }

    // 2️⃣ Mark all previous unused OTPs as used/blocked
    await SmsOtpLog.update(
      { is_used: true, status: "blocked" },
      { where: { mobile_number, service_id, is_used: false } }
    );

    // 3️⃣ Generate new OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    // 4️⃣ Get LDAP user details
    const settings = await ServiceLdapSetting.findOne({ where: { service_id } });
    if (!settings) return res.status(404).json({ error: "LDAP settings not found" });

    const ldapResult = await checkUserExists(lastOtp.user_id, settings);
    if (!ldapResult.userExists) return res.status(404).json({ error: "User not found in LDAP" });

    // 5️⃣ Create new OTP log
    const newOtp = await SmsOtpLog.create({
      user_id: ldapResult.name,
      service_id,
      mobile_number: ldapResult.mobilenumber,
      otp_code: otpCode,
      provider: "MSG91",
      status: "pending",
      attempt_count: 0,
      is_used: false,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    console.log("✅ Resent OTP for", mobile_number);

    res.json({
      success: true,
      otp_id: newOtp.id,
      otp_code: otpCode, // in real system, send via SMS
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("🔥 /resendOtp error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
