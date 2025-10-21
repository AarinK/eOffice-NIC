const express = require("express");
const passport = require("passport");
const {
  checkUser,
} = require("../controllers/ldapController");
const { verifyOtp } = require("../controllers/otpController");
const { encrypt, decrypt } = require("../controllers/tokenController");
const {
  googleCallback,
  facebookCallback,
  linkedinCallback,
} = require("../controllers/oAuthController");
const { resendOtp } = require("../controllers/resendOtpController");

const { initQr, approveQr, pollQr } = require("../controllers/qrController");

const router = express.Router();

// LDAP + OTP
router.post("/checkUser", checkUser);
router.post("/verifyOtp", verifyOtp);
router.post("/resendOtp", resendOtp);

// Token encryption
router.post("/encrypt", encrypt);
router.post("/decrypt", decrypt);

// Google
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "login select_account",
}));
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/auth/failure" }), googleCallback);

// Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), facebookCallback);

// LinkedIn
router.get("/linkedin", linkedinCallback);

// QR Login
router.post("/qr/init", initQr);
router.post("/qr/approve", approveQr);
router.get("/qr/status/:loginId", pollQr);

module.exports = router;
