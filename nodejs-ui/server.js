const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const FLASK_BACKEND = process.env.FLASK_BACKEND || 'http://localhost:8080';

// --- Multer setup for image uploads ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Views ---
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// --- Upload proxy: forward image to Flask backend ---
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch(`${FLASK_BACKEND}/upload`, {
      method: 'POST',
      body: formData,
      redirect: 'follow',
    });

    if (response.ok || response.status === 302) {
      io.emit('status', { type: 'success', message: `Image "${req.file.originalname}" uploaded successfully` });
      return res.json({ success: true, filename: req.file.originalname });
    }
    const text = await response.text();
    return res.status(response.status).json({ error: text });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(502).json({ error: 'Failed to reach the Flask backend. Is it running?' });
  }
});

// --- Start / Stop / Clear controls proxy ---
app.post('/control', async (req, res) => {
  try {
    const { action } = req.body; // 'start', 'stop', or 'clear'
    const formBody = new URLSearchParams();
    formBody.append(action, action.charAt(0).toUpperCase() + action.slice(1));

    const response = await fetch(`${FLASK_BACKEND}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      redirect: 'follow',
    });

    const statusMsg = {
      start: 'Lip-sync started – speak into your microphone',
      stop: 'Lip-sync stopped',
      clear: 'Session cleared',
    };

    io.emit('status', { type: action === 'start' ? 'success' : 'info', message: statusMsg[action] || 'Action sent' });
    return res.json({ success: true, action });
  } catch (err) {
    console.error('Control error:', err.message);
    return res.status(502).json({ error: 'Failed to reach the Flask backend. Is it running?' });
  }
});

// --- Proxy the video feed directly from Flask ---
app.use(
  '/video_feed',
  createProxyMiddleware({
    target: FLASK_BACKEND,
    changeOrigin: true,
  })
);

// --- Health check ---
app.get('/health', async (_req, res) => {
  try {
    const response = await fetch(`${FLASK_BACKEND}/`);
    return res.json({ node: 'ok', flask: response.ok ? 'ok' : 'error' });
  } catch {
    return res.json({ node: 'ok', flask: 'unreachable' });
  }
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit('status', { type: 'info', message: 'Connected to Node.js server' });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`\n  🚀  Node.js UI server running at  http://localhost:${PORT}`);
  console.log(`  🔗  Flask backend expected at     ${FLASK_BACKEND}\n`);
});

module.exports = server;
