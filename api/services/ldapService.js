const ldap = require("ldapjs");

async function checkUserExists(username, { ldap_url, base_dn, bind_dn, password, ou }) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: ldap_url });

    client.bind(bind_dn, password, (err) => {
      if (err) {
        client.unbind();
        return reject("LDAP admin bind failed: " + err);
      }

      // 🔍 Search only within the specified OU
      const searchBase = ou
        ? `ou=${ou},${base_dn}`  // e.g., ou=audit,dc=mycompany,dc=com
        : base_dn;

      const searchOptions = {
        scope: "sub",
        filter: `(uid=${username})`,
        attributes: ["uid", "cn", "sn", "mobile", "title", "description"],
      };

      let userData = {
        userExists: false,
        mobilenumber: "",
        name: "",
        cn: "",
        sn: "",
        title: "",
        desc: "",
      };

      client.search(searchBase, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return reject("LDAP search error: " + err);
        }

        res.on("searchEntry", (entry) => {
          userData.userExists = true;
          const getAttr = (type) => {
            const attr = entry.attributes.find((a) => a.type === type);
            return attr ? String(attr.vals[0]) : "";
          };

          userData = {
            userExists: true,
            mobilenumber: getAttr("mobile"),
            name: getAttr("uid"),
            cn: getAttr("cn"),
            sn: getAttr("sn"),
            title: getAttr("title"),
            desc: getAttr("description"),
          };

          console.log(`[LDAP] Found user in ${ou}:`, username);
        });

        res.on("error", (err) => {
          client.unbind();
          reject("LDAP search error: " + err);
        });

        res.on("end", () => {
          client.unbind();
          resolve(userData);
        });
      });
    });
  });
}

module.exports = { checkUserExists };
