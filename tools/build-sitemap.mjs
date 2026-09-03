/* build-sitemap.mjs —— robots.txt 与站点地图
 *
 * 页面多到一定数量，光靠首页往下爬是等不来收录的。这里按语言切分成多份地图，
 * 再用一份索引串起来：一是单份地图有 5 万条 / 50MB 的上限，二是分开之后
 * Search Console 能按语言分别看收录数 —— 哪一种语言没被收，一眼就知道。
 *
 * lastmod 用构建日期。城市页的内容确实每天都在变（时刻表逐日不同），
 * 这不是为了骗抓取而虚报的时间。
 */
import { pathToFileURL } from 'node:url';

import {
  SITE, LOCALES, emit, seoLanguages, discoverGuidePages,
  langPath, cityPath, cityIndexPath, abs, hreflang, slug, citiesFor, cityLangs,
} from './lib/site.mjs';
import { escapeAttr as escA } from './lib/prerender.mjs';

const today = () => new Date().toISOString().slice(0, 10);

const urlTag = (loc, { lastmod, changefreq, priority, alternates }) =>
  '  <url>\n'
  + '    <loc>' + escA(loc) + '</loc>\n'
  + (alternates || []).map((a) =>
      '    <xhtml:link rel="alternate" hreflang="' + a.lang + '" href="' + escA(a.href) + '"/>\n').join('')
  + (lastmod ? '    <lastmod>' + lastmod + '</lastmod>\n' : '')
  + (changefreq ? '    <changefreq>' + changefreq + '</changefreq>\n' : '')
  + (priority ? '    <priority>' + priority + '</priority>\n' : '')
  + '  </url>\n';

const urlset = (body) =>
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  + ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + body + '</urlset>\n';

export function buildSitemap() {
  const day = today();
  const codes = LOCALES.map((l) => l.code);
  const cityCodes = seoLanguages();
  const files = [];

  // ── 落地页：44 种语言 + 域名根 ──
  const langAlts = codes.map((c) => ({ lang: hreflang(c), href: abs(langPath(c)) }));
  langAlts.push({ lang: 'x-default', href: abs(langPath(SITE.rootLang)) });

  let body = urlTag(abs('/'), { lastmod: day, changefreq: 'daily', priority: '1.0', alternates: langAlts });
  for (const c of codes) {
    body += urlTag(abs(langPath(c)), {
      lastmod: day, changefreq: 'daily', priority: '0.9', alternates: langAlts,
    });
  }
  emit('/sitemaps/pages.xml', urlset(body));
  files.push('/sitemaps/pages.xml');

  // ── 教法问答：手写的页面，只负责把它们收进来 ──
  const guide = discoverGuidePages();
  if (guide.length) {
    // 同一篇的各语言版本互指。按 slug 归组，作者加一篇不用回来改这里
    const bySlug = new Map();
    for (const g of guide) {
      if (!bySlug.has(g.slug)) bySlug.set(g.slug, []);
      bySlug.get(g.slug).push(g);
    }
    let rows = '';
    for (const g of guide) {
      const sibs = bySlug.get(g.slug);
      const alts = sibs.map((s) => ({ lang: hreflang(s.lang), href: abs(s.path) }));
      alts.push({ lang: 'x-default', href: abs((sibs.find((s) => s.lang === 'en') || g).path) });
      rows += urlTag(abs(g.path), {
        lastmod: day, changefreq: 'monthly', priority: g.slug ? '0.7' : '0.8', alternates: alts,
      });
    }
    emit('/sitemaps/guide.xml', urlset(rows));
    files.push('/sitemaps/guide.xml');
  }

  // ── 城市页：一种语言一份 ──
  for (const code of cityCodes) {
    const idxAlts = cityCodes.map((c) => ({ lang: hreflang(c), href: abs(cityIndexPath(c)) }));
    idxAlts.push({ lang: 'x-default', href: abs(cityIndexPath(SITE.rootLang)) });

    let rows = urlTag(abs(cityIndexPath(code)), {
      lastmod: day, changefreq: 'weekly', priority: '0.7', alternates: idxAlts,
    });

    for (const city of citiesFor(code)) {
      const s = slug(city.en);
      // 这座城市的语言集合是现算的：语言 × 城市不是笛卡尔积，
      // 把没生成的语言写进 hreflang 会让整组标注作废
      const langs = cityLangs(city);
      const alts = langs.map((c) => ({ lang: hreflang(c), href: abs(cityPath(c, s)) }));
      alts.push({ lang: 'x-default', href: abs(cityPath(SITE.rootLang, s)) });
      rows += urlTag(abs(cityPath(code, s)), {
        lastmod: day, changefreq: 'daily', priority: '0.6', alternates: alts,
      });
    }
    const file = '/sitemaps/cities-' + code + '.xml';
    emit(file, urlset(rows));
    files.push(file);
  }

  // ── 索引 ──
  emit('/sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + files.map((f) =>
        '  <sitemap>\n    <loc>' + abs(f) + '</loc>\n    <lastmod>' + day + '</lastmod>\n  </sitemap>\n').join('')
    + '</sitemapindex>\n');

  // /assets/ 与 /release/latest.json 一概不挡：页面渲染时要拉它们，
  // 挡住只会让抓取端渲染出一个缺版本号、没样式的版本。
  emit('/robots.txt', [
    '# robots.txt —— 由 tools/build-sitemap.mjs 生成，改产物没用，要改改生成器',
    '#',
    '# 站点内容全部欢迎抓取。这个文件存在的唯一理由是指出 sitemap 的位置：',
    '# 新域名没有外链时，sitemap 往往是搜索引擎发现内页的唯一入口。',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# 安装包没有被索引的价值，抓一次还要拖 37MB',
    'Disallow: /NoorWaqt.apk',
    '',
    'Sitemap: ' + abs('/sitemap.xml'),
    '',
  ].join('\n'));

  return {
    sitemaps: files.length + 1,
    urls: 1 + codes.length + guide.length
      + cityCodes.reduce((n, c) => n + citiesFor(c).length + 1, 0),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = buildSitemap();
  console.log('站点地图 ' + r.sitemaps + ' 份，收录 ' + r.urls + ' 条 URL');
}
