/* build-og.mjs —— 152 张城市链接预览图
 *
 *   node tools/build-og.mjs
 *
 * 分享一条城市页链接时，聊天软件抓 og:image 展开成预览卡。在这之前
 * 1591 个页面共用同一张方形 logo：发雅加达的链接和发喀拉蚩的，
 * 群里看到的预览一模一样。
 *
 * 图由真浏览器渲染 —— globe.js 要 ResizeObserver / devicePixelRatio /
 * getBoundingClientRect，在 Node 里拿 canvas 库跑得逐个打桩，
 * 而打歪不会报错，只会让 152 张图悄悄画错。用 Playwright 走的是和用户
 * 屏幕上完全同一条渲染路径，代价只是 CI 里多花两三分钟。
 *
 * 没装 Playwright 就跳过，不让整个构建挂掉：build-cities.mjs 会检查
 * 图在不在，不在就把 og:image 退回站点 logo。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, DIST, CITIES, slug, countryName } from './lib/site.mjs';

export const OG_DIR = 'og';
/** 站点级那一张的文件名。城市 slug 全是小写字母数字，不会撞上 */
export const SITE_CARD = '_site';
export const ogPath = (name) => '/' + OG_DIR + '/' + name + '.jpg';

const QUALITY = 0.9;   // 1200×630 上约 60–90KB，抓取端拉得快

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

/** 渲染台要从 /assets/js/ 引模块，file:// 下 ESM 会被 CORS 挡掉，所以起个临时服务 */
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

async function loadPlaywright() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    return null;
  }
}

export async function buildOg({ quiet = false } = {}) {
  const chromium = await loadPlaywright();
  if (!chromium) {
    console.warn('  OG 图        跳过（未安装 playwright，og:image 将退回站点 logo）');
    return { made: 0, skipped: true };
  }

  const { server, port } = await serveRepo();
  const browser = await chromium.launch();
  let made = 0;

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://127.0.0.1:${port}/tools/og/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.OG_READY);

    mkdirSync(resolve(DIST, OG_DIR), { recursive: true });

    // 站点级的那一张：44 个语言首页用，也是没有城市页那些语言的兜底
    const countries = new Set(CITIES.map((c) => c.cc)).size;
    const siteB64 = await page.evaluate(
      ([n, k, q]) => window.renderOgSite(n, k, q),
      [CITIES.length, countries, QUALITY]
    );
    writeFileSync(resolve(DIST, OG_DIR, SITE_CARD + '.jpg'), Buffer.from(siteB64, 'base64'));
    made++;

    for (const city of CITIES) {
      const s = slug(city.en);
      // 国家名固定用英文：一城一张图，不随界面语言变（见 og-card.js 顶部）
      const b64 = await page.evaluate(
        ([sl, cc, q]) => window.renderOg(sl, cc, q),
        [s, countryName(city.cc, 'en'), QUALITY]
      );
      writeFileSync(resolve(DIST, OG_DIR, s + '.jpg'), Buffer.from(b64, 'base64'));
      made++;
      if (!quiet && made % 40 === 0) console.log('    …' + made + '/' + CITIES.length);
    }
  } finally {
    await browser.close();
    server.close();
  }

  return { made, skipped: false };
}

/** 这张图在不在？build-cities 靠它决定 og:image 指哪儿 */
export const hasOg = (citySlug) => existsSync(resolve(DIST, OG_DIR, citySlug + '.jpg'));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await buildOg();
  console.log(r.skipped ? '未生成' : 'OG 图 ' + r.made + ' 张');
}
