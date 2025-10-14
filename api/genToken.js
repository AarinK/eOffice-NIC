const jwt = require("jsonwebtoken");

const payload = {
  sub: "testuser",
  provider: "google",
  name: "Aarin Kachroo",
};

const token = jwt.sign(
  payload,
  "5109a89e8b67ed549e15f798f06d1b4075a8b1dad09f3f9902e2f4125c30cd4c",
  { expiresIn: "1h" }
);

console.log(token);

