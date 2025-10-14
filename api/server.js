// server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("./passportConfig"); // must import so strategies register
//const authRoutes = require("./authRoutes");
const Service =require("./routes/serviceRoutes");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const WebSocket = require("ws");
const { activeSessions } = require("./routes/authRoutes");
const http = require("http");

// Protected API


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // in prod set secure:true and serve over https
}));
app.use(passport.initialize());
app.use(passport.session());

//app.use("/auth", authRoutes);
// API Routes
//app.use("/api/services", Service);
app.use("/auth", authRoutes);
app.use("/service", serviceRoutes);
app.use("/dashboard", dashboardRoutes);
app.get("/", (req, res) => res.json({ message: "Auth backend running" }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  const params = new URL(req.url, "http://localhost").searchParams;
  const sessionKey = params.get("sessionKey");
  if (sessionKey) {
    activeSessions[sessionKey] = { ...activeSessions[sessionKey], ws };
  }
});

app.listen(PORT, () => console.log(`Auth server running on ${PORT}`));


