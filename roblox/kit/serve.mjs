// serve.mjs: a tiny static file server rooted at the project (pages import three.js from node_modules via an import map).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".woff": "font/woff", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".glb": "model/gltf-binary", ".css": "text/css" };
export function serve(root, port = 0) {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}
