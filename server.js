// server.js — Railway-compatible entry point
// Delegates to Next.js production server for proper SSR/routing support.
//
// Railway's Nixpacks builder ensures node_modules are installed,
// then runs: npm start → next start
//
// This file exists as a fallback: if run directly, it boots Next.js.
const { createServer } = require('http');

const PORT = process.env.PORT || 3000;

try {
  // Attempt to boot Next.js programmatically
  const next = require('next');
  const app = next({ dev: false, port: PORT });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    createServer((req, res) => handle(req, res)).listen(PORT, () => {
      console.log(`Concilium running on port ${PORT} (Next.js via server.js)`);
    });
  }).catch((err) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });
} catch (e) {
  // Next.js not built yet — show fallback page
  console.warn('Next.js not available. Did you run `npm run build`?');
  createServer((req, res) => {
    const isRoot = req.url === '/';
    res.writeHead(isRoot ? 200 : 503, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Concilium</title></head>
<body style="margin:0;background:#030712;color:#f3f4f6;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
  <div style="text-align:center;max-width:400px;padding:2rem">
    <h1 style="font-size:1.5rem;font-weight:600;margin-bottom:0.5rem">⚖️ Concilium</h1>
    <p style="color:#9ca3af;font-size:0.875rem;line-height:1.5">
      The Next.js build is not available.<br/>
      Run <code style="background:#1f2937;padding:2px 6px;border-radius:4px;font-size:0.8rem">npm run build && npm start</code>
      to launch the full application.
    </p>
  </div>
</body>
</html>`);
  }).listen(PORT, () => {
    console.log(`Concilium fallback running on port ${PORT}`);
  });
}
