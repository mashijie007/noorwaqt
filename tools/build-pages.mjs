/* build-pages.mjs —— 44 个语言版本的落地页
 *
 * 输入是仓库根上的 index.html：那份文件继续当模板用，中文是它的兜底文案，
 * 开发时直接打开也照样能看。这里做的是把运行时的 i18n 注入提前到构建期，
 * 让每一种语言都有一份自己的、爬虫能读到的 HTML。
 *
 * 路径规则见 site.mjs：根语言（英文）就落在 /，其余落在 /<code>/。
 * 之所以不给英文单开 /en/，是为了不让 / 和 /en/ 变成两份一样的内容互相抢排名。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ROOT, SITE, LOCALES, CITIES, dictFor, release, emit,
  langPath, cityIndexPath, abs, bcp47, dirOf, seoLanguages,
} from './lib/site.mjs';
import {
  renderI18n, setTitle, setMeta, setCanonical, setHtmlAttrs,
  injectHead, rootAbsolute, fill, escapeAttr, escapeText,
} from './lib/prerender.mjs';
import { hreflangBlock, appJsonLd, siteJsonLd, langHrefScript, languageCloud, cityCloud } from './lib/blocks.mjs';
import { hijri } from '../assets/js/hijri.js';

const COUNTRIES = new Set(CITIES.map((c) => c.cc)).size;

/** 页面上那些 {占位符} 的取值。留着不填会让搜索结果里露出生的 {n} */
function pageVars(dict) {
  const rel = release();
  const arm = rel.apk['arm64-v8a'];
  return {
    n: CITIES.length,
    total: CITIES.length,
    countries: COUNTRIES,
    year: hijri(Date.now()).y,
    v: rel.version,
    size: (arm.size / 1048576).toFixed(1) + ' MB',
    abi: 'arm64-v8a',
    // 首屏那句实时统计要等 JS 算，模板里本来就是一个破折号，保持一致
    d: '—',
    t: '—',
  };
}

/**
 * 教法问答的链接。模板里写死的是 /zh/guide/，运行时由 main.js 按语言改写；
 * 静态 HTML 里也得改对，否则 44 个语言页在爬虫眼里全都指向同一批中文页面。
 * 语言的取法与 main.js 里那段保持一致：只有中文用 zh，其余一律 en。
 */
function rewriteGuideLinks(html, code) {
  const guideLang = code.startsWith('zh') ? 'zh' : 'en';
  return html.replace(
    /href="\/(?:zh|en)\/guide\/([^"]*)"(\s[^>]*?data-guide=)/g,
    (_, rest, tail) => 'href="/' + guideLang + '/guide/' + rest + '"' + tail
  );
}

/** 城市页只在有 SEO 文案的语言里存在，别的语言页脚就不挂城市链接 */
const CITY_LANGS = new Set(seoLanguages());

/** 页脚挂 24 座城市：够爬虫顺着爬进城市页，又不至于把页脚堆成链接墙 */
const FEATURED = CITIES.slice(0, 24);

export function buildPages() {
  const template = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const codes = LOCALES.map((l) => l.code);
  const hrefFor = (c) => abs(langPath(c));
  let rootHtml = null;

  for (const { code } of LOCALES) {
    const dict = dictFor(code);
    const vars = pageVars(dict);
    const url = hrefFor(code);

    let html = rootAbsolute(template);
    html = renderI18n(html, dict, vars);
    html = rewriteGuideLinks(html, code);

    html = setHtmlAttrs(html, {
      lang: bcp47(code),
      dir: dirOf(code),
      'data-locale': code,
    });

    const title = fill(dict.docTitle, vars);
    const desc = fill(dict.docDesc, vars);
    html = setTitle(html, title);
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'og:site_name', SITE.name);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setCanonical(html, url);

    // 版本行平时是 main.js 拉 latest.json 才填的，构建期先写死一份：
    // 没跑 JS 的抓取拿到的就不再是一个孤零零的破折号
    html = html.replace('id="dl-meta">—<',
      'id="dl-meta">' + escapeText(fill(dict.dlVersion, vars)) + '<');

    html = injectHead(html, [
      '<link rel="stylesheet" href="/assets/css/pages.css">',
      hreflangBlock(codes, hrefFor, abs('/')),
      appJsonLd(dict),
      siteJsonLd(dict, code),
      langHrefScript(codes, hrefFor),
    ].join('\n'));

    // 页脚互链：hreflang 只是提示，能点的链接才是爬虫真正走的路
    const clouds = [languageCloud(code, hrefFor)];
    if (CITY_LANGS.has(code)) {
      clouds.push(cityCloud(dict, code, FEATURED));
      clouds.push('<div class="wrap seo-links"><nav class="link-cloud"><a href="'
        + escapeAttr(cityIndexPath(code)) + '">'
        + escapeText(dict.ptCrumb + ' · ' + CITIES.length) + '</a></nav></div>');
    }
    html = html.replace('</footer>', clouds.join('\n') + '\n</footer>');

    emit(langPath(code) + 'index.html', html);
    if (code === SITE.rootLang) rootHtml = html;
  }

  // 域名根：内容用英文那一份，但去掉 data-locale —— 根地址是语言协商页，
  // 得让 main.js 照旧按浏览器偏好自动切，而不是被钉死在英文。
  // canonical 保持指向 /en/，所以 / 和 /en/ 不会当成两份内容互相抢排名。
  emit('/index.html', rootHtml.replace(/\sdata-locale="[^"]*"/, ''));

  return LOCALES.length;
}

// Windows 上 file:/// 是三道斜杠，手拼字符串比不出来，交给 pathToFileURL
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('语言页 ' + buildPages() + ' 个');
}
