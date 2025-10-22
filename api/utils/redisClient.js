// config/redisClient.js
const redis = require("redis");

const redisClient = redis.createClient({
  url: "redis://127.0.0.1:6379", // updated port
});

redisClient.on("error", (err) => console.error("❌ Redis error:", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;
