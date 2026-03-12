# Node.js UI – Realtime Wav2Lip Avatar

A modern, responsive Node.js (Express) web interface for the **Realtime Wav2Lip** lip-sync avatar solution.  
The Node.js server acts as a front-end layer that proxies requests to the existing Flask/Python backend where the ML inference runs.

![Node.js UI Screenshot](https://github.com/user-attachments/assets/c5867507-8a7c-4c37-bc2b-93e8607d77a9)

## Features

- **Drag-and-drop image upload** – upload an avatar face image (JPG, PNG, GIF)
- **Start / Stop controls** – begin and end the realtime lip-sync session
- **Live video feed** – streams the Wav2Lip output directly in the browser
- **Real-time status updates** – Socket.IO powered toast notifications and connection indicator
- **Backend health check** – automatic polling shows whether the Flask backend is online
- **Responsive design** – works on desktop and mobile with a collapsible sidebar
- **Dark theme** – modern dark UI built with plain CSS (no heavy frameworks)

## Architecture

```
Browser  ←→  Node.js (Express + Socket.IO)  ←→  Flask Backend (Wav2Lip ML)
  :3000              proxy                          :8080
```

| Layer | Role |
|-------|------|
| **Node.js server** (`server.js`) | Serves the UI, handles uploads via Multer, proxies `/video_feed` and control actions to Flask |
| **Flask backend** (`app.py`) | Runs the Wav2Lip inference pipeline, captures audio, generates lip-synced frames |

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- The **Flask backend** running on port 8080 (see the root [README](../README.md))

### 1. Install dependencies

```bash
cd nodejs-ui
npm install
```

### 2. Start the Flask backend (in a separate terminal)

```bash
# From the project root
python app.py          # starts on http://localhost:8080
```

### 3. Start the Node.js UI

```bash
npm start              # starts on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port for the Node.js UI server |
| `FLASK_BACKEND` | `http://localhost:8080` | URL of the Flask backend |

Example:

```bash
PORT=4000 FLASK_BACKEND=http://192.168.1.10:8080 npm start
```

## How to Use

1. **Upload** an avatar image (face photo) using the drag-and-drop area or file picker
2. Click **Start** – the backend begins capturing microphone audio and generating lip-synced video frames
3. The **Realtime Avatar Feed** panel streams the output in real time
4. Click **Stop** to end the session

## Running Tests

```bash
npm test
```

Tests use the built-in Node.js test runner (`node:test`) and verify that all routes respond correctly (with the Flask backend offline, proxy errors are handled gracefully).

## Project Structure

```
nodejs-ui/
├── server.js              # Express server with Socket.IO and Flask proxy
├── package.json           # Dependencies and scripts
├── public/
│   ├── css/style.css      # Dark-themed responsive stylesheet
│   ├── js/app.js          # Client-side logic (uploads, controls, Socket.IO)
│   └── images/            # Static images (if any)
├── views/
│   └── index.html         # Main UI page
└── test/
    └── server.test.js     # Automated tests
```
