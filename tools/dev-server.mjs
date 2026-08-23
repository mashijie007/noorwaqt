/* dev-server.mjs — 本地预览用的静态服务器
 *
 *   node tools/dev-server.mjs [端口]
 *
 * 和 python -m http.server 的区别只有一点，但很关键：
 * 这里对每个响应都发 Cache-Control: no-store。
 * 不发缓存头时浏览器会按启发式规则缓存 CSS/JS，改了样式刷新却不生效，
 * 很容易误以为是代码没改对。开发期间宁可每次都重新拉。
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 默认伺服仓库根（index.html 直接就能开）；构建产物用 --root=dist 预览
const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith('--root='))?.slice(7);
const ROOT = resolve(fileURLToPath(import.meta.url), '../..', rootArg || '.');
const PORT = Number(args.find((a) => /^\d+$/.test(a))) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';

    // 目录穿越防护：解析后必须仍在站点根目录内
    const path = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!path.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

    const info = await stat(path);
    const file = info.isDirectory() ? join(path, 'index.html') : path;
    const body = await readFile(file);

    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`NoorWaqt dev server → http://localhost:${PORT}  伺服 ${ROOT}  (no-store，改完直接刷新即可)`);
});
