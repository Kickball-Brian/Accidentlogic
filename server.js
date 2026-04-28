const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3500;
const ROOT = path.join(__dirname, 'dist');

const mime = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  if (!path.extname(filePath)) {
    const dirIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(dirIndex)) filePath = dirIndex;
    else filePath = filePath + '.html';
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'text/plain',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
