/* blocks.mjs —— 语言页和城市页共用的那几段 HTML
 *
 * hreflang、结构化数据、页脚互链：三样都是"两边必须一致"的东西，
 * 各写一遍迟早会漂移，所以统一放这里。
 */
import { SITE, LOCALES, hreflang, abs, langPath, cityPath, cityIndexPath, cityName, slug, release } from './site.mjs';
import { escapeAttr, escapeText } from './prerender.mjs';
import { hasOg, ogPath } from '../build-og.mjs';
import { OG_W, OG_H } from '../../assets/js/og-card.js';

/**
 * 全部语言版本的互指。
 * codes 只列真正存在该语言页面的语言 —— 指向 404 的 hreflang 会让整组标注作废。
 */
export function hreflangBlock(codes, hrefFor, xDefaultHref) {
  const rows = codes.map(
    (c) => '<link rel="alternate" hreflang="' + hreflang(c) + '" href="' + escapeAttr(hrefFor(c)) + '">'
  );
  rows.push('<link rel="alternate" hreflang="x-default" href="' + escapeAttr(xDefaultHref) + '">');
  return rows.join('\n');
}

/**
 * og:image 指哪张。
 *
 * 图由 build-og.mjs 在构建最开始生成。没装 playwright 时它一张都不出 ——
 * 那就退回站点 logo，而不是给 1591 个页面留下指向 404 的预览图。
 * 尺寸标注只在真有图时才写：告诉抓取端这是 1.91:1 的横图，
 * 它才会展开成大卡，而不是缩成一个角落里的小方块。
 */
export function ogImage(name) {
  const ok = hasOg(name);
  return { href: abs(ok ? ogPath(name) : '/noorwaqt.png'), sized: ok };
}

export function ogImageTags(name) {
  const { href, sized } = ogImage(name);
  const rows = ['<meta property="og:image" content="' + escapeAttr(href) + '">'];
  if (sized) {
    rows.push('<meta property="og:image:width" content="' + OG_W + '">');
    rows.push('<meta property="og:image:height" content="' + OG_H + '">');
    rows.push('<meta property="og:image:type" content="image/jpeg">');
  }
  rows.push('<meta name="twitter:image" content="' + escapeAttr(href) + '">');
  return rows.join('\n');
}

const ld = (obj) => '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';

/** 应用本身。评分之类没有真实数据的字段一律不写 —— 编出来的结构化数据是会挨处罚的 */
export function appJsonLd(dict) {
  const rel = release();
  const arm = rel.apk['arm64-v8a'];
  return ld({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Android',
    softwareVersion: rel.version,
    datePublished: rel.releaseDate,
    fileSize: Math.round(arm.size / 1048576) + ' MB',
    downloadUrl: arm.url,
    installUrl: abs('/#download'),
    url: SITE.origin + '/',
    image: abs('/noorwaqt.png'),
    description: dict.docDesc,
    inLanguage: LOCALES.map((l) => hreflang(l.code)),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: SITE.name, url: SITE.origin + '/' },
  });
}

export function siteJsonLd(dict, code) {
  return ld({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: abs(langPath(code)),
    description: dict.docDesc,
    inLanguage: hreflang(code),
  });
}

/** 城市页：面包屑 + 这座城市本身。Place 只写真有的字段（名字、坐标、国家） */
export function cityJsonLd(dict, code, city, cityLabel, countryLabel) {
  const crumb = ld({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: abs(langPath(code)) },
      { '@type': 'ListItem', position: 2, name: dict.ptCrumb, item: abs(cityIndexPath(code)) },
      { '@type': 'ListItem', position: 3, name: cityLabel, item: abs(cityPath(code, slug(city.en))) },
    ],
  });
  const place = ld({
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: cityLabel,
    // 城市表只备了中/英/阿三种写法，乌尔都语、孟加拉语这些拿到的是就近的一种。
    // 英文名一律作为别名写进去，拉丁字母的搜法才对得上这一页。
    alternateName: [...new Set([city.en, city.ar, city.zh].filter((n) => n && n !== cityLabel))],
    address: {
      '@type': 'PostalAddress',
      addressLocality: cityLabel,
      addressCountry: city.cc,
      addressRegion: countryLabel,
    },
    geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lon },
  });
  return crumb + '\n' + place;
}

/**
 * 语言切换的地址表。
 * 预渲染页面换语言就是换地址，光在原地替换文案会让内容和 canonical 各说各话。
 */
export const langHrefScript = (codes, hrefFor) =>
  '<script>window.NW_LANG_HREF=' + JSON.stringify(Object.fromEntries(codes.map((c) => [c, hrefFor(c)]))) + ';</script>';

/**
 * 城市页的语言 × 国家矩阵，以及站点的根地址。
 *
 * 分享卡要带一条能点的链接回来，最合适的落点就是那座城市自己的页面。
 * 但城市页不是每种语言都出全部城市（见 site.mjs 的 CITY_MATRIX），
 * 浏览器无从知道哪一格有页面 —— 由构建期把矩阵交给它。
 * 判断要按"这座城市 + 当前语言"两个维度，只看语言会指向 404。
 * 缺这份数据时 main.js 退回该语言的首页。
 */
export const cityLangsScript = (matrix) =>
  '<script>window.NW_SITE=' + JSON.stringify({ origin: SITE.origin, cityMatrix: matrix }) + ';</script>';

const cloud = (title, items) =>
  '<div class="wrap seo-links"><h2>' + escapeText(title) + '</h2><nav class="link-cloud">'
  + items.map(([href, label]) => '<a href="' + escapeAttr(href) + '">' + escapeText(label) + '</a>').join('')
  + '</nav></div>';

/** 44 个语言版本的真链接。hreflang 是给爬虫的提示，能被点的链接才是抓取路径 */
export const languageCloud = (code, hrefFor) =>
  cloud('Languages · اللغات · 语言',
    LOCALES.slice().sort((a, b) => a.name.localeCompare(b.name))
      .filter((l) => l.code !== code)
      .map((l) => [hrefFor(l.code), l.name]));

/** 城市互链。没有这一块，上千个城市页就只能靠 sitemap 被发现 */
export const cityCloud = (dict, code, cities) =>
  cloud(dict.ptOtherCities, cities.map((c) => [cityPath(code, slug(c.en)), cityName(c, code)]));
