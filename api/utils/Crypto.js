const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc"; 
const KEY = crypto.createHash("sha256").update(process.env.ENCRYPTION_SECRET).digest(); // 32-byte key
const IV = Buffer.alloc(16, 0); // fixed IV for deterministic encryption

function encryptToken(text) {
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function decryptToken(encrypted) {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encryptToken, decryptToken };

