const Service = require("./Service");
const ServiceLdapSetting = require("./ServiceLdapSetting");
const SmsOtpLog = require("./smsOtpLog");
const LoginToken = require("./loginToken"); // no destructuring!
const LoginAuditLog = require("./loginAuditLog");


// Define associations here
Service.hasOne(ServiceLdapSetting, { foreignKey: "service_id", as: "ldapSetting" });
ServiceLdapSetting.belongsTo(Service, { foreignKey: "service_id", as: "service" });


module.exports = {
  Service,
  ServiceLdapSetting,
  SmsOtpLog,
  LoginToken,
  LoginAuditLog,
};