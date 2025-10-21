const { SmsOtpLog, ServiceLdapSetting } = require("../models");
const { checkUserExists } = require("../services/ldapService");
const crypto = require("crypto");


exports.checkUser = async (req, res) => {
  const { username, service_key } = req.body;
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
      return res.json({ service_id: service.id, userExists: false });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpLog = await SmsOtpLog.create({
      user_id: ldapResult.name,
      service_id: service.id,
      mobile_number: ldapResult.mobilenumber,
      otp_code: otpCode,
      provider: "MSG91",
      status: "pending",
      attempt_count: 0,
      is_used: false,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    res.json({
      service_id: service.id,
      userExists: true,
      mobilenumber: ldapResult.mobilenumber,
      name: ldapResult.name,
      cn: ldapResult.cn,
      sn: ldapResult.sn,
      title: ldapResult.title,
      desc: ldapResult.desc,
      otp_code: otpCode,
      otp_id: otpLog.id,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("[LDAP] Error in /checkUser:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
