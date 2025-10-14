
const ldap = require("ldapjs");

async function checkUserExists(username, { ldap_url, base_dn, bind_dn, password }) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: ldap_url });

    client.bind(bind_dn, password, (err) => {
      if (err) {
        client.unbind();
        return reject("LDAP admin bind failed: " + err);
      }

      const searchOptions = {
        scope: "sub",
        filter: `(uid=${username})`,
        attributes: ['uid', 'cn', 'sn', 'mobile', 'title', 'description']
      };

      let userExists = false;
      let mobileNumber = "";
      let name="";
      let desc="";
      let title="";
      let cn="";
      let sn="";



      client.search(base_dn, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return reject("LDAP search error: " + err);
        }

        res.on("searchEntry", (entry) => {
          userExists = true;
          const mobileAttr = entry.attributes.find(attr => attr.type === "mobile");
          const nameAttr= entry.attributes.find(attr => attr.type === "uid");
          const cnAttr= entry.attributes.find(attr => attr.type === "cn");
          const snAttr= entry.attributes.find(attr => attr.type === "sn");
          const titleAttr= entry.attributes.find(attr => attr.type === "title");
          const descAttr= entry.attributes.find(attr => attr.type === "description");


          mobileNumber = mobileAttr ? String(mobileAttr.vals[0]) : "";
          name=nameAttr ? String(nameAttr.vals[0]) : "";
          cn=cnAttr ? String(cnAttr.vals[0]) : "";
          sn=snAttr ? String(snAttr.vals[0]) : "";
          title=titleAttr ? String(titleAttr.vals[0]) : "";
          desc=descAttr ? String(descAttr.vals[0]) : "";


          console.log("[LDAP] Found user:", username, "mobile:", mobileNumber);
        });

        res.on("error", (err) => {
          client.unbind();
          return reject("LDAP search error: " + err);
        });

        res.on("end", () => {
          client.unbind();
          resolve({ userExists, mobilenumber: mobileNumber, name:name, cn:cn,sn:sn,title:title,desc:desc });
        });
      });
    });
  });
}

module.exports = { checkUserExists };
