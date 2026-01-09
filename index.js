/**
 * index.js (Render-ready)
 * - Express + CORS + JSON + OPTIONS preflight support
 * - express-session (uses env secret)
 * - Health endpoints: / and /health
 * - Routes mounted at /prowater
 * - Socket.IO with CORS
 * - Binds to process.env.PORT and 0.0.0.0
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");

const prowaterRoutes = require("./prowater");

const app = express();
const server = http.createServer(app);

// ✅ Render uses dynamic PORT
const PORT = Number(process.env.PORT) || 10000;

/* =========================================================
   ✅ CORS CONFIGURATION (EXPRESS v5 SAFE)
   ========================================================= */
const ALLOWED_ORIGINS = [
  "https://ff-debug-service-frontend-free-ygxkweukma-uc.a.run.app",
  // Add production web domain later if needed
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / curl / postman
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS BEFORE anything else
app.use(cors(corsOptions));

// ✅ Preflight handler (NO "*" crash)
app.options(/.*/, cors(corsOptions));

app.use(express.json());

/* =========================================================
   ✅ SESSION CONFIG
   ========================================================= */
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // HTTPS terminated at Render edge
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

/* =========================================================
   ✅ HEALTH ENDPOINTS
   ========================================================= */
app.get("/", (req, res) => {
  res.send("✅ ProWater Service is Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "prowater",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   ✅ API ROUTES
   ========================================================= */
app.use("/prowater", prowaterRoutes);

/* =========================================================
   ✅ SOCKET.IO WITH SAME CORS POLICY
   ========================================================= */
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("ping", () => {
    socket.emit("pong", { ts: Date.now() });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* =========================================================
   ✅ START SERVER
   ========================================================= */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

/* =========================================================
   ✅ SAFETY NETS
   ========================================================= */
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});