const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cors = require('cors');
const session = require('express-session');

const prowaterRoutes = require('./prowater');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 8090;

/* 1️⃣ Core middleware FIRST */
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

/* 2️⃣ Session middleware SECOND */
app.use(session({
    secret: '123456789',
    resave: false,
    saveUninitialized: true,   // IMPORTANT
    cookie: {
        secure: false          // must be false for http
    }
}));

/* 3️⃣ Health check */
app.get('/', (req, res) => {
    res.send('✅ ProWater Service is Running');
});

/* 4️⃣ Routes AFTER session */
app.use('/prowater', prowaterRoutes);

/* 5️⃣ Socket.IO */
io.on('connection', (socket) => {
    console.log('a user connected');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: 'prowater',
        message: 'Service is running fine 🚀',
        timestamp: new Date().toISOString()
    });
});

server.listen(port, '192.168.1.46', () => {
    console.log(`Server running at http://192.168.1.46:${port}`);
});
