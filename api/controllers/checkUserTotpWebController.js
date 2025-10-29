// controllers/totpController.js
const { Service, ServiceLdapSetting } = require("../models");
const { checkUserExists } = require("../services/ldapService");

exports.checkUserTotpWeb = async (req, res) => {
  const { username, service_key } = req.body;

  console.log("[TOTP] Request received:", req.body);

  if (!username || !service_key) {
    console.log("[TOTP] Missing username or service_key");
    return res.status(400).json({ error: "Username and service_key are required" });
  }

  try {
    console.log(`[TOTP] Fetching service and LDAP settings for service_key: ${service_key}`);
    const service = await Service.findOne({
      where: { service_key },
      include: [
        { model: ServiceLdapSetting, as: "ldapSetting" }
      ],
    });

    if (!service || !service.ldapSetting) {
      console.log("[TOTP] Service or LDAP settings not found");
      return res.status(404).json({ error: "Service or LDAP settings not found" });
    }

    const ldapConfig = {
      ldap_url: service.ldapSetting.ldap_url,
      base_dn: service.ldapSetting.base_dn,
      bind_dn: service.ldapSetting.bind_dn,
      password: service.ldapSetting.password,
      ou: service.ldapSetting.ou,
    };

    console.log("[TOTP] LDAP settings retrieved:", ldapConfig);
    console.log("[TOTP] Checking user in LDAP:", username);

    // Call the reusable LDAP function
    const ldapData = await checkUserExists(username, ldapConfig);

    console.log("[TOTP] LDAP search result:", ldapData);

    // Ensure we always send a response
    return res.status(200).json(ldapData);

  } catch (err) {
    console.error("[TOTP] Error checking TOTP user:", err);
    return res.status(500).json({ error: "Server error while checking username" });
  }
};
  