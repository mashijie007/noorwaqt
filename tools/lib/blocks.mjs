/* blocks.mjs —— 语言页和城市页共用的那几段 HTML
 *
 * hreflang、结构化数据、页脚互链：三样都是"两边必须一致"的东西，
 * 各写一遍迟早会漂移，所以统一放这里。
 */
import { SITE, LOCALES, hreflang, abs, langPath, cityPath, cityIndexPath, cityName, slug, release } from './site.mjs';
import { escapeAttr, escapeText } from './prerender.mjs';

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
