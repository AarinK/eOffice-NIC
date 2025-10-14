// authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("./passportConfig"); // initialize strategies
const Service = require("./models/Service"); // add model

require("dotenv").config();

const router = express.Router();
const { JWT_SECRET, FRONTEND_URL } = process.env;

// Helper to create JWT and redirect (or respond)
function completeLoginAndRedirectold(req, res, userObj) {
  const payload = {
  sub: userObj.profile && (userObj.profile.uid || userObj.profile.id || userObj.profile.email) || "unknown",
  provider: userObj.provider || "unknown",
  name: userObj.profile && (userObj.profile.displayName || userObj.profile.cn || userObj.profile.sAMAccountName) || null,
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

  // Option A: set cookie (recommended for security when using same top-level domain)
  // res.cookie("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  // return res.redirect(FRONTEND_URL + "/auth/success");

  // Option B: redirect to frontend with token in query (simple for dev)
  // WARNING: token in URL is visible in browser history — use only for dev/testing
  const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${token}`;
  return res.redirect(redirectUrl);
}



async function completeLoginAndRedirect(req, res, userObj, serviceKey) {
  try {
    // 1️⃣ Find service in DB by service_key
    const service = await Service.findOne({ where: { service_key: serviceKey, is_active: true } });

    // 2️⃣ Default URL fallback
    let redirectBase = process.env.FRONTEND_URL;
    if (service && service.service_url) {
      redirectBase = service.service_url;
    }

    // 3️⃣ Create JWT payload
    const payload = {
      sub:
        (userObj.profile &&
          (userObj.profile.uid ||
            userObj.profile.id ||
            userObj.profile.email)) ||
        "unknown",
      provider: userObj.provider || "unknown",
      name:
        (userObj.profile &&
          (userObj.profile.displayName ||
            userObj.profile.cn ||
            userObj.profile.sAMAccountName)) ||
        null,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // 4️⃣ Redirect with token
    const redirectPath = "/auth/callback"; // common callback path
    const redirectUrl = `${redirectBase}${redirectPath}?token=${token}`;
    console.log("🔗 Redirecting to:", redirectUrl);

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in completeLoginAndRedirect:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/auth/failure`);
  }
}




/* ---------- OAuth flows ---------- */

// Normal logout (app session only)
router.get("/logout", (req, res) => {
  res.clearCookie("auth_token");
  return res.redirect(`${FRONTEND_URL}/login`);
});

// Google login
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//     prompt: "select_account" // forces Google account chooser
//   })
// );


router.get("/google", (req, res, next) => {
  const serviceKey = req.query.service || "default";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state: serviceKey, // pass service key
  })(req, res, next);
});



// Google callback
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/auth/failure` }),
//   (req, res) => completeLoginAndRedirect(req, res, req.user)
// );


// Google callback

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/auth/failure` }),
  (req, res) => {
    const serviceKey = req.query.state || "default"; // Google returns state
    return completeLoginAndRedirect(req, res, req.user, serviceKey);
  }
);




// Force Google logout (global Google account logout)
// router.get("/logout/googleold", (req, res) => {
//   res.clearCookie("auth_token");
//   const googleLogout = "https://accounts.google.com/Logout";
//   const redirectUrl = `${googleLogout}?continue=${FRONTEND_URL}/login`;
//   return res.redirect(redirectUrl);

//   const redirectUrl = "https://myapp.com/landing";
//   res.redirect(
//   "https://accounts.google.com/Logout?continue=" +
//   encodeURIComponent(redirectUrl)
// );


// });


router.get("/logout/google", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.clearCookie("auth_token");

      // ✅ React landing page URL
      const redirectUrl = `${FRONTEND_URL}`;
      //const redirectUrl = "http://localhost:5000/";

      //Google logout + redirect
      res.redirect(
        "https://accounts.google.com/Logout?continue=" +
        encodeURIComponent(redirectUrl)
      );

      // res.redirect(
      //   "https://accounts.google.com/Logout");
    });
  });
});


// Google
// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// router.get("/google/callback",
//   passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/auth/failure` }),
//   (req, res) => completeLoginAndRedirect(req, res, req.user)
// );

// Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: `${FRONTEND_URL}/auth/failure` }),
  (req, res) => completeLoginAndRedirect(req, res, req.user)
);

// Twitter
router.get("/twitter", passport.authenticate("twitter"));
router.get("/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: `${FRONTEND_URL}/auth/failure` }),
  (req, res) => completeLoginAndRedirect(req, res, req.user)
);

/* ---------- LDAP (username/password) ---------- */
// For ldap we accept POST with body {username, password}
router.post("/ldap",
  (req, res, next) => {
    // passport-ldapauth expects username/password fields by default
    passport.authenticate("ldapauth", { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      // user authenticated
      req.user = user;
      return completeLoginAndRedirect(req, res, { provider: "ldap", profile: user });
    })(req, res, next);
  }
);

module.exports = router;
