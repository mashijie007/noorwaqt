/* verify-dist.mjs —— 部署前的产物体检
 *
 *   node tools/verify-dist.mjs
 *
 * 这批页面的问题有个共同点：都不会让构建报错。路径规则改了忘了同步，
 * 得到的是一堆 200 的页面配一批 404 的链接；某个键漏了译文，得到的是
 * 标题里露出一个生的 {city}。这些只有专门查才查得出来。
 *
 * 所以在部署前跑一遍：站内链接是否都能落到真实文件、hreflang 是否指向存在的页面、
 * canonical 是否齐全、有没有没填上的占位符。任何一项不过就让流水线停下。
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, DIST, SITE, LOCALES, PENDING_PREFIXES } from './lib/site.mjs';
import { bootKeys } from './lib/boot-i18n.mjs';

const problems = [];
const warnings = [];
const note = (kind, where, detail) => problems.push({ kind, where, detail });

/** 指向"还没生成但计划中"的页面，只记一笔，不拦构建 */
const isPending = (p) => PENDING_PREFIXES.some((prefix) => p.startsWith(prefix));

function allHtml(dir = DIST, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) allHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** 站点路径 → dist 里的实际文件。目录形式的地址落到它的 index.html */
function resolveSitePath(p) {
  const clean = p.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return null;          // 锚点、外链，不归这里管
  const base = resolve(DIST, decodeURIComponent(clean).replace(/^\/+/, ''));
  if (existsSync(base) && statSync(base).isFile()) return base;
  const idx = resolve(base, 'index.html');
  return existsSync(idx) ? idx : null;
}

const rel = (abs) => abs.slice(DIST.length).replace(/\\/g, '/') || '/';

function main() {
  const files = allHtml();
  if (!files.length) { console.error('dist/ 里没有 HTML —— 先跑 node tools/build.mjs'); process.exit(1); }

  let links = 0, checkedHreflang = 0;

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const where = rel(file);

    // 1. 没填上的占位符。露在标题和描述里最要命，正文里也不该有
    for (const m of html.matchAll(/\{(city|country|method|month|year|deg|km|n|total|countries|v|size|abi|fajr|dhuhr|asr|maghrib|isha|sunrise)\}/g)) {
      note('占位符未填', where, m[0]);
      break;
    }

    // 2. canonical
    const canon = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html);
    if (!canon) note('缺 canonical', where, '');
    else if (!canon[1].startsWith(SITE.origin)) note('canonical 不是本站地址', where, canon[1]);

    // 3. og:image 必须真的存在。抓不到预览图的链接在聊天里只剩一行光秃秃的地址，
    //    而这条不会以任何形式报错 —— 只有专门查才查得出来
    const og = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i.exec(html);
    if (!og) note('缺 og:image', where, '');
    else if (!og[1].startsWith(SITE.origin)) note('og:image 不是本站地址', where, og[1]);
    else if (!resolveSitePath(og[1].slice(SITE.origin.length))) note('og:image 指向不存在的文件', where, og[1]);

    // 4. 站内链接必须落到真实文件
    for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
      links++;
      if (resolveSitePath(m[1])) continue;
      if (isPending(m[1])) warnings.push(m[1]);
      else note('站内链接 404', where, m[1]);
    }

    // 5. hreflang 指向的页面必须存在。指向 404 会让整组标注作废
    for (const m of html.matchAll(/hreflang="[^"]+"\s+href="([^"]+)"/g)) {
      const p = m[1].startsWith(SITE.origin) ? m[1].slice(SITE.origin.length) : null;
      if (!p) { note('hreflang 不是本站地址', where, m[1]); continue; }
      checkedHreflang++;
      if (!resolveSitePath(p)) note('hreflang 指向不存在的页面', where, m[1]);
    }
  }

  // 6. 域名根的首屏载荷。这一项失效的方式很安静：页面照常出，
  //    只是首屏那几处又开始先英文后母语 —— 没有任何东西会报错。
  const rootFile = resolve(DIST, 'index.html');
  if (!existsSync(rootFile)) {
    note('根页面不存在', 'index.html', '');
  } else {
    const rootHtml = readFileSync(rootFile, 'utf8');
    const m = /window\.NW_I18N_BOOT=(.+?);<\/script>/.exec(rootHtml);
    if (!m) {
      note('根页面缺首屏文案载荷', 'index.html', 'window.NW_I18N_BOOT');
    } else {
      let boot = null;
      try { boot = JSON.parse(m[1]); } catch { note('首屏载荷不是合法 JSON', 'index.html', ''); }
      if (boot) {
        const want = bootKeys(readFileSync(resolve(ROOT, 'index.html'), 'utf8'));
        const langs = Object.keys(boot.d || {});
        if (langs.length !== LOCALES.length) {
          note('首屏载荷语言数对不上', 'index.html', langs.length + ' / 应为 ' + LOCALES.length);
        }
        for (const code of langs) {
          const missing = want.filter((k) => boot.d[code][k] == null);
          if (missing.length) {
            note('首屏载荷缺键', 'index.html', code + ' 缺 ' + missing.join(' '));
            break;
          }
        }
        if (!boot.dir || Object.keys(boot.dir).length !== langs.length) {
          note('首屏载荷缺书写方向表', 'index.html', '');
        }
      }
      // 载荷在、B 段不在，等于白做：首屏文案不会被填上
      if (!rootHtml.includes('[data-boot]')) {
        note('根页面缺首屏填充脚本', 'index.html', 'B 段没有注入到 </header> 后');
      }
    }
  }

  // 7. 两段脚本只该出现在根页面上。跟上一项检查是两件独立的事——
  //    根页面在不在，不影响载荷有没有漏到别的页面上，所以不挂在上面那个 if/else 里。
  for (const file of files) {
    if (rel(file) === '/index.html') continue;
    if (readFileSync(file, 'utf8').includes('NW_I18N_BOOT')) {
      note('首屏载荷漏进了非根页面', rel(file), '');
      break;
    }
  }

  // 8. 站点地图里的地址必须都能打开
  const smDir = resolve(DIST, 'sitemaps');
  let smUrls = 0;
  if (existsSync(smDir)) {
    for (const f of readdirSync(smDir)) {
      if (!f.endsWith('.xml')) continue;
      for (const m of readFileSync(resolve(smDir, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
        smUrls++;
        const p = m[1].slice(SITE.origin.length);
        if (!resolveSitePath(p)) note('站点地图收录了不存在的页面', 'sitemaps/' + f, m[1]);
      }
    }
  }

  // 9. 几个必须存在的文件
  for (const must of ['/index.html', '/robots.txt', '/sitemap.xml', '/CNAME', '/assets/css/pages.css']) {
    if (!resolveSitePath(must)) note('缺少必需文件', must, '');
  }

  console.log('体检：' + files.length + ' 个页面，' + links + ' 条站内链接，'
    + checkedHreflang + ' 条 hreflang，' + smUrls + ' 条站点地图收录');

  if (warnings.length) {
    const targets = [...new Set(warnings)];
    console.log('待建页面：' + targets.length + ' 个地址暂时还是 404（共被链 ' + warnings.length + ' 次）');
    for (const t of targets) console.log('  ' + t);
    console.log('  这些前缀登记在 site.mjs 的 PENDING_PREFIXES，页面就位后把它删掉即可恢复严格检查');
  }

  if (!problems.length) { console.log('全部通过'); return; }

  // 同类问题只列前几条，否则一个路径改错会刷出上万行
  const byKind = new Map();
  for (const p of problems) {
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind).push(p);
  }
  console.error('\n发现 ' + problems.length + ' 个问题：');
  for (const [kind, list] of byKind) {
    console.error('\n  ' + kind + '（' + list.length + '）');
    for (const p of list.slice(0, 5)) console.error('    ' + p.where + '  ' + p.detail);
    if (list.length > 5) console.error('    …… 其余 ' + (list.length - 5) + ' 条同类');
  }
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
