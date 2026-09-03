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
   *  域名根 / 是语言协商页：预渲染的是这个语言，canonical 指向 /en/。
   *  x-default 也指 /en/ 而不是 / —— hreflang 只有指向 canonical 才作数，
   *  指一个自己就被 canonical 掉的地址，Google 会直接丢掉这条标注。 */
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

/**
 * 城市页的语言 × 国家矩阵。
 *
 * 从前是笛卡尔积：每种有 SEO 文案的语言都出全部 152 城，1520 张页面。
 * 但抓取预算是固定的，「俄语版雅加达」这种没人搜的组合，是在跟真正有
 * 需求的页面抢同一份预算 —— Google 的反应就是把大半页面挂在
 * 「已发现-尚未编入索引」上不动。
 *
 * 所以按「母语国 + 该语言人群真实聚居/务工/侨居国」收缩。值是国家码清单，
 * '*' 表示不裁（英文是全球回退语，任何地区的搜索都可能落到英文页）。
 *
 * 要调整某个语言的覆盖面，改这张表就够了 —— 页面、hreflang、站点地图、
 * 页脚互链、语言切换表全部由它推出，不必再逐处同步。
 */
export const CITY_MATRIX = {
  en: '*',
  ar: ['AE','BH','DJ','DZ','EG','IQ','JO','KW','LB','LY','MA','MR','OM','PS','QA','SA','SD','SO','SY','TD','TN','YE',
       'FR','DE','GB','US','CA','SE','NL','BE','ES','IT','TR','AU'],
  fr: ['FR','BE','CA','DZ','MA','TN','ML','SN','NE','BF','TD','DJ','MR','LB'],
  tr: ['TR','DE','NL','BE','AT','FR','GB','XK','MK','BA','AZ'],
  id: ['ID','MY','SG','BN','SA','NL','AU','HK'],
  ms: ['MY','SG','BN','ID','TH','PH','SA'],
  bn: ['BD','IN','GB','SA','AE','QA','KW','OM','BH','US','IT','MY','MV'],
  ur: ['PK','IN','GB','SA','AE','QA','KW','OM','BH','US','CA','NO','DK','ES','IT','AU'],
  ru: ['RU','KZ','KG','UZ','TJ','TM','AZ','DE','TR','AE','EG'],
  zh: ['CN','HK','SG','MY','ID','TH','AU','US','CA','JP','KR'],
};

/** 朝觐目的地与古都斯：不管什么语言都保留，这三座是全体穆斯林都会搜的 */
export const CORE_CITIES = new Set(['Makkah', 'Madinah', 'Jerusalem']);

/** 这座城市在这种语言下出不出页面 */
const inMatrix = (lang, city) => {
  if (CORE_CITIES.has(city.en)) return true;
  const rule = CITY_MATRIX[lang];
  return rule === '*' || (Array.isArray(rule) && rule.includes(city.cc));
};

/** 某语言下要生成的城市。语言本身没有 SEO 文案时一座都不出 */
export function citiesFor(lang) {
  if (!seoLanguages().includes(lang)) return [];
  return CITIES.filter((c) => inMatrix(lang, c));
}

/** 某座城市存在于哪几种语言 —— hreflang 互指和站点地图都按它来，
 *  指向没生成的页面会让整组标注作废 */
export function cityLangs(city) {
  return seoLanguages().filter((l) => inMatrix(l, city));
}

/** 交给浏览器的同一份矩阵：分享链接要知道这座城市在当前语言下有没有页面 */
export const cityMatrixForClient = () => ({
  core: [...CORE_CITIES],
  cc: Object.fromEntries(seoLanguages().map((l) => [l, CITY_MATRIX[l] === '*' ? '*' : (CITY_MATRIX[l] || [])])),
});

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

const R = Math.PI / 180, EARTH_KM = 6371;

/** 朝向与到麦加的距离都定义在 cities.js 里 —— 城市页、OG 图和浏览器
 *  用的必须是同一套数字：这两个数是会被人拿去礼拜的，不能有两份实现 */
export { qiblaBearing, distanceToMakkah } from '../../assets/js/cities.js';

/** 最近的 n 座城市，用于页面之间互相打通（光靠 sitemap 的页面等于孤岛）。
 *  pool 限定在"这种语言下确实存在的城市"里挑 —— 越过它就会链到 404，
 *  而死链会把整页的抓取价值一起拖下去 */
export function nearbyCities(city, n = 8, pool = CITIES) {
  return pool
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
