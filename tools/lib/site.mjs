/* site.mjs —— 生成器共用的站点常量、路径规则与地理计算
 *
 * 语言与城市两份数据都不在这里定义：语言来自 assets/js/locale-data.js，
 * 城市来自 assets/js/cities.js —— 和站点运行时读的是同一份，
 * 不另起一套，免得哪天两边对不上。
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES, EN } from '../../assets/js/locale-data.js';
import { CITIES } from '../../assets/js/cities.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = resolve(ROOT, 'dist');

export const SITE = {
  origin: 'https://www.noorwaqt.com',
  name: 'NoorWaqt',
  /** 每种语言都在自己的 /<code>/ 下，英文也不例外 —— 和站点其余部分
   *  （/en/guide/、/zh/guide/）保持同一套结构。
   *  域名根 / 是语言协商页：预渲染的是这个语言，canonical 指向 /en/，
   *  hreflang 的 x-default 指向 / 本身。 */
  rootLang: 'en',
  repo: 'https://github.com/mashijie007/noorwaqt',
};

export { LOCALES, EN, CITIES };

/**
 * 还没生成、但模板里已经在链的路径前缀。
 * verify-dist 对这些前缀只警告不拦构建。空着说明目前没有这种情况 ——
 * 教法问答页已经就位，检查因此是严格的。
 */
export const PENDING_PREFIXES = [];

/**
 * 教法问答：手写的静态页，不由生成器产出，只是原样搬进 dist。
 * 它们自带 canonical 与 hreflang，这里只负责把它们收进站点地图 ——
 * 新域名没有外链，sitemap 往往是搜索引擎发现内页的唯一入口。
 */
export const GUIDE_LANGS = ['en', 'zh'];

/** 扫出已经落到 dist 里的问答页。按目录发现，作者加一篇不用回来改这里 */
export function discoverGuidePages() {
  const out = [];
  for (const lang of GUIDE_LANGS) {
    const base = resolve(DIST, lang, 'guide');
    if (!existsSync(base)) continue;
    if (existsSync(resolve(base, 'index.html'))) out.push({ lang, slug: '', path: '/' + lang + '/guide/' });
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (!e.isDirectory() || !existsSync(resolve(base, e.name, 'index.html'))) continue;
      out.push({ lang, slug: e.name, path: '/' + lang + '/guide/' + e.name + '/' });
    }
  }
  return out;
}

export const localeMeta = (code) => LOCALES.find((l) => l.code === code) || null;
export const dirOf = (code) => localeMeta(code)?.dir || 'ltr';
export const bcp47 = (code) => code.replace('_', '-');

/**
 * hreflang 用的语言标签。
 * 中文必须分出 Hans / Hant，只写 zh 会让繁简两份页面在 Google 眼里指向同一个受众。
 */
export const hreflang = (code) =>
  code === 'zh' ? 'zh-Hans' : code === 'zh_Hant' ? 'zh-Hant' : bcp47(code);

// ── 词典 ────────────────────────────────────────────────

const SEO_DIR = resolve(ROOT, 'tools/translations/seo');
const LOC_DIR = resolve(ROOT, 'assets/locales');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** 出城市页的语言 = 有 SEO 文案的语言。没写文案就不生成，
 *  否则只会得到一批挂着别国语言路径、内容却是英文的薄页面。 */
export const seoLanguages = () =>
  readdirSync(SEO_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .filter((c) => localeMeta(c))
    .sort();

/** 某语言的完整词典：英文基线 ← 该语言译文 ← 城市页专用文案 */
export function dictFor(code) {
  const site = existsSync(resolve(LOC_DIR, code + '.json')) ? readJson(resolve(LOC_DIR, code + '.json')) : {};
  const seoEn = readJson(resolve(SEO_DIR, 'en.json'));
  const seo = existsSync(resolve(SEO_DIR, code + '.json')) ? readJson(resolve(SEO_DIR, code + '.json')) : {};
  return { ...EN, ...seoEn, ...site, ...seo };
}

export const release = () => readJson(resolve(ROOT, 'release/latest.json'));

// ── 路径 ────────────────────────────────────────────────

/** 城市 URL 片段。定义在 cities.js 里 —— 浏览器拼分享链接用的是同一个函数，
 *  两边各写一份迟早会漂移，而漂移的后果是分享出去的链接指向 404 */
export { citySlug as slug } from '../../assets/js/cities.js';

/**
 * 按站点路径往 dist 里写文件。
 * 站点路径一律以 / 开头，直接交给 resolve() 会被当成绝对路径、把 DIST 丢掉，
 * 所以这里先削掉开头的斜杠 —— 这个坑踩一次就够了，两个生成器共用这一个出口。
 */
export function emit(sitePath, content) {
  const out = resolve(DIST, sitePath.replace(/^\/+/, ''));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content, 'utf8');
  return out;
}

export const langPath = (code) => '/' + code + '/';
export const cityIndexPath = (code) => langPath(code) + 'prayer-times/';
export const cityPath = (code, citySlug) => cityIndexPath(code) + citySlug + '/';
export const abs = (path) => SITE.origin + path;

// ── 地理 ────────────────────────────────────────────────

const KAABA = { lat: 21.4225, lon: 39.8262 };
const R = Math.PI / 180, EARTH_KM = 6371;

/** 朝向：大圆航线在出发点的初始方位角，正北为 0，顺时针 */
export function qiblaBearing(lat, lon) {
  const dLon = (KAABA.lon - lon) * R;
  const y = Math.sin(dLon);
  const x = Math.cos(lat * R) * Math.tan(KAABA.lat * R) - Math.sin(lat * R) * Math.cos(dLon);
  return (Math.atan2(y, x) / R + 360) % 360;
}

/** 到麦加的大圆距离（公里） */
export function distanceToMakkah(lat, lon) {
  const dLat = (KAABA.lat - lat) * R, dLon = (KAABA.lon - lon) * R;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat * R) * Math.cos(KAABA.lat * R) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 最近的 n 座城市，用于页面之间互相打通（光靠 sitemap 的页面等于孤岛） */
export function nearbyCities(city, n = 8) {
  return CITIES
    .filter((c) => c !== city)
    .map((c) => ({ city: c, km: haversine(city, c) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

function haversine(a, b) {
  const dLat = (b.lat - a.lat) * R, dLon = (b.lon - a.lon) * R;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── 本地化的取名 ────────────────────────────────────────

/** 城市名。城市表只备了中 / 英 / 阿三种写法，其余语言按书写系统就近取用
 *  —— 与 i18n.js 的 cityName() 保持同一套规则 */
export function cityName(c, code) {
  if (c[code]) return c[code];
  if (code === 'zh_Hant') return c.zh || c.en;
  if (dirOf(code) === 'rtl') return c.ar || c.en;
  return c.en;
}

const regionCache = new Map();
/** 国家名。Intl 认得的语言直接用它的，认不得就退回英文 */
export function countryName(cc, code) {
  const key = code + '|' + cc;
  if (regionCache.has(key)) return regionCache.get(key);
  let out = cc;
  for (const loc of [bcp47(code), 'en']) {
    try {
      const got = new Intl.DisplayNames([loc], { type: 'region' }).of(cc);
      if (got && got !== cc) { out = got; break; }
    } catch { /* 这个语言 Intl 不认识，继续退 */ }
  }
  regionCache.set(key, out);
  return out;
}

/** Intl 并不认识全部 44 种语言，传个不认识的进去它会静静回落到运行环境的语言。
 *  构建机器的语言是什么谁也说不准，所以不认识就明确用英文。 */
export function intlLocale(code) {
  const b = bcp47(code);
  try { return Intl.NumberFormat.supportedLocalesOf(b).length ? b : 'en'; } catch { return 'en'; }
}
