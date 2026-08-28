/* build.mjs —— 生成整个站点到 dist/
 *
 *   node tools/build.mjs
 *
 * dist/ 不进版本库。城市页每天重算一遍，1300 多个文件天天变，
 * 提交进仓库只会让 git 历史迅速膨胀成一团 —— 交给 Actions 构建后
 * 直接部署产物，仓库里只留源码。
 *
 * 仓库根上的 index.html 仍然是可以直接打开的：它既是模板，也是开发时的预览页。
 */
import { cpSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, DIST } from './lib/site.mjs';
import { buildPages } from './build-pages.mjs';
import { buildCities } from './build-cities.mjs';
import { buildSitemap } from './build-sitemap.mjs';
import { buildOg } from './build-og.mjs';
import { writeKeyFile } from './indexnow.mjs';

/** 原样搬过去的静态资源。APK 不在其列 —— 安装包走 GitHub Releases，
 *  没必要让每次部署都扛着 37MB 走一遍 */
const STATIC = [
  'assets',
  'release',
  'live',
  // 手写的教法问答页。它们自带 canonical 与 hreflang，这里只负责原样搬过去。
  // 写成 en/guide 而不是 en —— 后者会盖掉生成器刚写好的 dist/en/index.html
  'en/guide',
  'zh/guide',
  'CNAME',
  'noorwaqt.png',
  'cn.jpeg',
  'en.jpeg',
  'ar.jpeg',
];

function copyStatic() {
  let n = 0;
  for (const item of STATIC) {
    const from = resolve(ROOT, item);
    if (!existsSync(from)) { console.warn('  跳过（不存在）: ' + item); continue; }
    cpSync(from, resolve(DIST, item), { recursive: true });
    n++;
  }
  return n;
}

function countFiles(dir) {
  let n = 0, bytes = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const r = countFiles(p); n += r.n; bytes += r.bytes; }
    else { n++; bytes += statSync(p).size; }
  }
  return { n, bytes };
}

export async function build() {
  const t0 = Date.now();
  rmSync(DIST, { recursive: true, force: true });

  // OG 图必须最先出：两个页面生成器都要检查图在不在，
  // 在就把 og:image 指过去，不在（比如没装 playwright）就退回站点 logo
  const og = await buildOg();
  if (!og.skipped) console.log('  OG 预览图    ' + og.made + ' 张（1200×630）');

  const langs = buildPages();
  console.log('  语言页      ' + langs + ' 种语言 + 域名根');

  const cities = buildCities();
  console.log('  城市页      ' + cities.pages + ' 个（' + cities.langs.join(' ') + '）');

  // 站点地图要把问答页也收进去，所以得先让它们落到 dist 里
  console.log('  静态资源    ' + copyStatic() + ' 项');

  const sm = buildSitemap();
  console.log('  站点地图    ' + sm.sitemaps + ' 份 / ' + sm.urls + ' 条 URL + robots.txt');

  // IndexNow 的域名归属校验文件。没配 key 就没有这一步，也不影响其余部分
  const key = writeKeyFile();
  if (key) console.log('  IndexNow    已写入 /' + key + '.txt');

  const { n, bytes } = countFiles(DIST);
  console.log('\ndist/ 共 ' + n + ' 个文件，' + (bytes / 1048576).toFixed(1) + ' MB，'
    + ((Date.now() - t0) / 1000).toFixed(1) + ' 秒');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await build();
