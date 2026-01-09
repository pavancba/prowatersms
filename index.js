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

/**
 * ✅ CORS settings (browser clients)
 * IMPORTANT:
 * - Preflight (OPTIONS) must succeed
 * - Whitelist your web origins
 */
const ALLOWED_ORIGINS = [
  "https://ff-debug-service-frontend-free-ygxkweukma-uc.a.run.app",
  // Add your production web domain here later (example):
  // "https://your-production-domain.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (curl/postman/server-to-server)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS BEFORE routes
app.use(cors(corsOptions));

// ✅ VERY IMPORTANT: handle preflight for ALL routes
app.options("*", cors(corsOptions));

app.use(express.json());

// ✅ Session secret must come from env in production
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Render free tier uses HTTPS at the edge; app sees HTTP
      httpOnly: true,
      sameSite: "lax",
      // maxAge: 1000 * 60 * 60 * 24, // optional
    },
  })
);

// ✅ Health check (root)
app.get("/", (req, res) => {
  res.send("✅ ProWater Service is Running");
});

// ✅ Detailed health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "prowater",
    message: "Service is running fine 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Mount routes AFTER session middleware
app.use("/prowater", prowaterRoutes);

// ✅ Socket.IO with CORS (use same cors options)
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

// ✅ Socket events
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });

  // Example: ping/pong test
  socket.on("ping", () => {
    socket.emit("pong", { ts: Date.now() });
  });
});

// ✅ Render requires binding to 0.0.0.0 (or omit host)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Good practice: handle unexpected errors
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});