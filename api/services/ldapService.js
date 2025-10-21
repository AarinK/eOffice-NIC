const ldap = require("ldapjs");

async function checkUserExists(username, { ldap_url, base_dn, bind_dn, password, ou }) {
  return new Promise((resolve, reject) => {
    console.log(`[LDAP] Creating client for URL: ${ldap_url}`);
    const client = ldap.createClient({ url: ldap_url });

    client.bind(bind_dn, password, (err) => {
      if (err) {
        console.error("[LDAP] Admin bind failed:", err);
        client.unbind();
        return reject("LDAP admin bind failed: " + err);
      }

      console.log("[LDAP] Successfully bound to server as", bind_dn);
      console.log("[LDAP] Initiating search for user:", username);

      const searchOptions = {
        scope: "sub",
        filter: `(uid=${username})`,
        attributes: ["uid", "cn", "sn", "mobile", "title", "description"],
      };

      // Utility: perform actual search
      const performSearch = (searchBase, ouLabel) => {
        return new Promise((resolveSearch) => {
          let userData = {
            userExists: false,
            mobilenumber: "",
            name: "",
            cn: "",
            sn: "",
            title: "",
            desc: "",
            message: "",
          };

          client.search(searchBase, searchOptions, (err, res) => {
            if (err) {
              console.error("[LDAP] Search error:", err);
              return resolveSearch({ ...userData, message: "LDAP search error: " + err });
            }

            res.on("searchEntry", (entry) => {
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
                message: `[LDAP] Found user in ${ouLabel || "base DN"}`,
              };
            });

            res.on("error", (err) => {
              console.error("[LDAP] Search stream error:", err);
              resolveSearch({ ...userData, message: "LDAP search error: " + err });
            });

            res.on("end", () => {
              resolveSearch(userData);
            });
          });
        });
      };

      // 🧠 Main logic
      (async () => {
        let searchBase;

        if (ou) {
          // If OU is specified in DB, search within that OU
          searchBase = `ou=${ou},${base_dn}`;
          console.log(`[LDAP] Searching under specified OU: ${ou}`);
        } else {
          // If OU column is NULL → search directly under base DN
          searchBase = base_dn;
          console.log("[LDAP] No OU specified in DB. Searching directly under base_dn...");
        }

        const data = await performSearch(searchBase, ou || "base_dn");
        client.unbind();
        console.log("[LDAP] Connection unbound successfully");
        resolve(data);
      })().catch((err) => {
        console.error("[LDAP] Unexpected search error:", err);
        client.unbind();
        reject("LDAP search error: " + err);
      });
    });
  });
}

module.exports = { checkUserExists };
