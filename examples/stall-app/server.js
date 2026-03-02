const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 4173;
const base = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

http
  .createServer((req, res) => {
    const reqPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(base, reqPath);

    if (!filePath.startsWith(base)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, file) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }

      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain; charset=utf-8' });
      res.end(file);
    });
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`Stallarbeit App läuft auf http://localhost:${port}`);
  });
