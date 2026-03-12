const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Dynamically pick a free port for tests
function getPort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function httpPost(url, jsonBody) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(jsonBody);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('Node.js UI Server', () => {
  let server;
  let baseUrl;

  before(async () => {
    const port = await getPort();
    process.env.PORT = String(port);
    // Flask backend will be unreachable in tests – that's fine; we test node routes
    process.env.FLASK_BACKEND = 'http://127.0.0.1:19999';
    // Clear require cache so server picks up env
    delete require.cache[require.resolve('../server')];
    server = require('../server');
    baseUrl = `http://127.0.0.1:${port}`;
    // Give server time to bind
    await new Promise((r) => setTimeout(r, 500));
  });

  after(() => {
    if (server && typeof server.close === 'function') {
      server.close();
    }
  });

  it('GET / returns 200 and HTML', async () => {
    const res = await httpGet(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Wav2Lip Realtime Avatar'));
    assert.ok(res.headers['content-type'].includes('text/html'));
  });

  it('GET /health returns JSON with node ok', async () => {
    const res = await httpGet(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.node, 'ok');
    // Flask is unreachable in tests
    assert.strictEqual(data.flask, 'unreachable');
  });

  it('GET /css/style.css returns stylesheet', async () => {
    const res = await httpGet(`${baseUrl}/css/style.css`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes(':root'));
  });

  it('GET /js/app.js returns client JS', async () => {
    const res = await httpGet(`${baseUrl}/js/app.js`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('socket'));
  });

  it('POST /upload without file returns 400', async () => {
    const res = await httpPost(`${baseUrl}/upload`, {});
    assert.strictEqual(res.status, 400);
  });

  it('POST /control with action returns 502 when flask is unreachable', async () => {
    const res = await httpPost(`${baseUrl}/control`, { action: 'start' });
    assert.strictEqual(res.status, 502);
    const data = JSON.parse(res.body);
    assert.ok(data.error);
  });
});
