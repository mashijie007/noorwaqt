/* build-globe-variants.mjs —— 并排渲染地球的候选方案
 *
 *   node tools/build-globe-variants.mjs
 *
 * 每个方案都用站上真正的 globe.js 渲染（见 tools/globe-lab/），不是效果图。
 * 产物落在 ~/.gstack/projects/<slug>/designs/globe-<日期>/：
 * 每个方案一张大图，外加一张并排对比板。
 *
 * 同一时刻、同一视角渲染所有方案 —— 否则比的是"哪一刻好看"，不是"哪套参数好"。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { ROOT } from './lib/site.mjs';
import { THEMES } from './globe-lab/themes.mjs';

const SIZE = 720;
const QUALITY = 0.92;

/** 固定的取景。选亚欧非那一面：陆地最密，晨昏线扫过的人口也最多 */
const VIEW = { lon0: 45, lat0: 18 };

/**
 * 取景时刻：让晨昏线落在可见面里。
 *
 * 用"此刻"渲染会碰运气 —— 正面整个在夜里的时候，陆地全是最暗那一档，
 * 而这几套方案的差别恰恰在昼夜对比和晨昏线上，等于比了个寂寞。
 * 把直射点放在视线中心以西 55°，那道分界就横在画面右侧偏中的位置，
 * 一张图里昼、夜、晨昏三样都有。
 */
function terminatorTime(lon0) {
  const subsolar = lon0 - 55;
  const d = new Date();
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return day + (12 - subsolar / 15) * 3600e3;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveRepo() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      try {
        let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (rel.endsWith('/')) rel += 'index.html';
        const path = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
        if (!path.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        const body = await readFile(path);
        res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port }));
  });
}

const board = (items, stamp) => `<!DOCTYPE html>
<html lang="zh"><head><meta charset="UTF-8">
<title>NoorWaqt 地球方案 · ${stamp}</title>
<style>
  :root { --bg:#04100e; --bg2:#071a17; --ink:#e8f5f0; --ink2:#a8c5bb; --ink3:#6e8f85;
          --line:rgba(126,231,190,.14); --brand:#34d399; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); padding:2.5rem 2rem 4rem;
         font:400 15px/1.6 'Noto Sans SC',system-ui,-apple-system,'Segoe UI',sans-serif; }
  h1 { font-size:1.6rem; margin:0 0 .4rem; }
  .sub { color:var(--ink3); font-size:.9rem; margin:0 0 2.5rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:1.5rem; }
  figure { margin:0; background:var(--bg2); border:1px solid var(--line); border-radius:16px;
           overflow:hidden; display:flex; flex-direction:column; }
  figure img { width:100%; display:block; background:var(--bg); }
  figcaption { padding:1.1rem 1.2rem 1.3rem; display:grid; gap:.45rem; }
  .id { font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--brand); }
  .name { font-size:1.15rem; font-weight:600; }
  .note { font-size:.85rem; color:var(--ink2); }
</style></head>
<body>
<h1>地球视觉方案</h1>
<p class="sub">同一时刻、同一视角，用站上真正的 globe.js 渲染 · ${stamp} · 选中的方案直接搬进 THEME 默认值</p>
<div class="grid">
${items.map((it) => `  <figure>
    <img src="${it.file}" alt="${it.name}" width="${SIZE}" height="${SIZE}" loading="lazy">
    <figcaption>
      <span class="id">${it.id}</span>
      <span class="name">${it.name}</span>
      <span class="note">${it.note}</span>
    </figcaption>
  </figure>`).join('\n')}
</div>
</body></html>
`;

export async function buildVariants() {
  let chromium;
  try { chromium = (await import('playwright')).chromium; }
  catch { console.error('需要 playwright：npm i -D playwright && npx playwright install chromium'); process.exit(1); }

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = 'mashijie007-noorwaqt';
  const outDir = resolve(homedir(), '.gstack/projects', slug, 'designs', 'globe-' + stamp.replace(/-/g, ''));
  mkdirSync(outDir, { recursive: true });

  const { server, port } = await serveRepo();
  const browser = await chromium.launch();
  const items = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', (e) => console.error('页面报错:', e.message));
    await page.goto(`http://127.0.0.1:${port}/tools/globe-lab/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.LAB_READY);

    // 所有方案共用同一个时刻，比的才是参数而不是运气
    const ts = terminatorTime(VIEW.lon0);

    for (const t of THEMES) {
      const b64 = await page.evaluate(
        ([id, size, lon0, lat0, at, q]) => window.renderTheme(id, size, lon0, lat0, at, q),
        [t.id, SIZE, VIEW.lon0, VIEW.lat0, ts, QUALITY]
      );
      const file = t.id + '.jpg';
      writeFileSync(resolve(outDir, file), Buffer.from(b64, 'base64'));
      items.push({ id: t.id, name: t.name, note: t.note, file });
      console.log('  ' + t.name.padEnd(6) + ' → ' + file);
    }

    writeFileSync(resolve(outDir, 'board.html'), board(items, stamp), 'utf8');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n对比板: ' + resolve(outDir, 'board.html'));
  return { outDir, count: items.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildVariants();
