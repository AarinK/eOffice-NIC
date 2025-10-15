const jwt = require("jsonwebtoken");
const Service = require("../models/Service");
const { JWT_SECRET } = process.env;
const redisClient = require("../utils/redisClient");

// Optional: if you implement blacklist for jti
const tokenBlacklist = new Set(); // replace with Redis or DB in production

async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1] || req.query.token;

  if (!token)
    return res.status(401).json({ status: "failure", tokenValid: false, message: "Token missing" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS512"],
      issuer: "http://localhost:5000",
      audience: "http://localhost:5174",
    });

    const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted)
      return res.status(401).json({ status: "failure", tokenValid: false, message: "Token revoked" });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: "failure", tokenValid: false, message: err.message });
  }
}

async function validateServiceKey(req, res, next) {
  const serviceKey = req.params.serviceKey || req.query.serviceKey;
  if (!serviceKey)
    return res.status(400).json({ status: "failure", tokenValid: false, message: "Service key missing" });

  const service = await Service.findOne({ where: { service_key: serviceKey, is_active: true } });
  if (!service)
    return res.status(404).json({ status: "failure", tokenValid: false, message: "Service not found" });

  req.service = service;
  next();
}

module.exports = { verifyToken, validateServiceKey };
