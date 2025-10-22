const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const redisClient = require("../utils/redisClient");
const { decryptToken } = require("../utils/Crypto");
const { completeLoginAndRedirect } = require("./authController");
const QRCode = require("qrcode");

const qrLoginRequests = new Map();

exports.initQr = async (req, res) => {
  const loginId = uuidv4();
  const serviceKey = req.body.serviceKey || "portalA";
  qrLoginRequests.set(loginId, { status: "pending", userObj: null, serviceKey });
  setTimeout(() => qrLoginRequests.delete(loginId), 60 * 1000);
  const qrUrl = await QRCode.toDataURL(loginId);
  res.json({ loginId, qrUrl });
};

exports.approveQr = async (req, res) => {
  const { loginId, userObj } = req.body;
  if (!qrLoginRequests.has(loginId))
    return res.status(400).json({ error: "Invalid or expired QR session" });

  const qrData = qrLoginRequests.get(loginId);
  qrData.status = "approved";
  qrData.userObj = userObj;
  qrLoginRequests.set(loginId, qrData);
  res.json({ message: "QR login approved" });
};

exports.pollQr = async (req, res) => {
  const { loginId } = req.params;
  if (!qrLoginRequests.has(loginId)) return res.status(404).json({ status: "expired" });

  const qrData = qrLoginRequests.get(loginId);
  if (qrData.status === "approved" && qrData.userObj) {
    await completeLoginAndRedirect(req, res, qrData.userObj, qrData.serviceKey);
    qrLoginRequests.delete(loginId);
  } else {
    res.json({ status: "pending" });
  }
};
