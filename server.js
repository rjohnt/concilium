const { createServer } = require('http');
const { readFile, stat } = require('fs/promises');
const { join, extname } = require('path');
const { createReadStream } = require('fs');

const PORT = process.env.PORT || 3000;
const ROOT = join(__dirname, 'public');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let path = req.url.split('?')[0];
    if (path === '/') path = '/index.html';
    const file = join(ROOT, path);
    
    // Security: prevent directory traversal
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const st = await stat(file);
    if (st.isDirectory()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Concilium running on port ${PORT}`);
});
