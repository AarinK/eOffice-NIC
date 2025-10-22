const express = require("express");
const { verifyToken, validateServiceKey } = require("../middlewares/auth");
const router = express.Router();

router.get("/:serviceKey/data", verifyToken, validateServiceKey, async (req, res) => {
  const service = req.service;
  const user = req.user;

  res.json({
    status: "success",
    tokenValid: true, // token is valid if middleware passed
    message: `Access granted to service ${service.service_name}`,
  //   user,
  //  service,
    timestamp: new Date(),
  });
});

// Optional: catch invalid token globally (if middleware throws)
router.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ status: "failure", tokenValid: false });
  }
  next(err);
});

module.exports = router;

