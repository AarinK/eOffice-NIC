const { Client } = require("ldapts");

const ldapClient = new Client({
  url: process.env.LDAP_URL || "ldap://localhost:389",
  timeout: 5000,
  connectTimeout: 5000,
});

module.exports = ldapClient;
