/* build-cities.mjs —— 城市礼拜时间页
 *
 * 「jakarta prayer times」「karachi namaz time」这类词每天都有稳定搜索量，
 * 而且搜完的人正好就想装一个礼拜应用 —— 站点手上已经有全部数据：
 * 152 座城市的坐标时区在 cities.js，推算逻辑在 prayer.js。
 * 这里把两者在构建期算成静态页，一个城市一页、一种语言一份。
 *
 * 内容不是模板套壳：每页都有当日六时、整月时刻表、朝向角、到麦加的距离，
 * 都是这座城市独有的真实数据。薄页面是会被判重的，这一点上不能省。
 *
 * 语言只出 tools/translations/seo/ 里有文案的那几种。没写文案就不生成，
 * 否则只会得到一批挂着乌尔都语路径、内容却是英文的页面。
 */
import { pathToFileURL } from 'node:url';

import {
  SITE, CITIES, LOCALES, dictFor, release, emit, seoLanguages,
  langPath, cityPath, cityIndexPath, abs, bcp47, dirOf, hreflang,
  cityName, countryName, intlLocale, slug, qiblaBearing, distanceToMakkah, nearbyCities,
} from './lib/site.mjs';
import { escapeText as esc, escapeAttr as escA, fill } from './lib/prerender.mjs';
import { hreflangBlock, cityJsonLd, langHrefScript, cityCloud, ogImageTags } from './lib/blocks.mjs';
import { SITE_CARD } from './build-og.mjs';
import { prayerTimes, localClock, SLOTS, METHOD_LABEL } from '../assets/js/prayer.js';
import { hijri } from '../assets/js/hijri.js';

/** 六个时刻对应的文案键 */
const SLOT_KEY = {
  fajr: 'prayer_fajr', sunrise: 'prayer_sunrise', dhuhr: 'prayer_dhuhr',
  asr: 'prayer_asr', maghrib: 'prayer_maghrib', isha: 'prayer_isha',
};

/** 计算方法的名字只备了中英阿三种写法，别的语言退回英文 */
const methodLabel = (key, code) => {
  const row = METHOD_LABEL[key];
  if (!row) return key;
  return row[code] || row.en || key;
};

/** 城市当地的今天，拆成年月日 */
function localYMD(tz, at = Date.now()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = f.format(new Date(at)).split('-').map(Number);
  return { y, m, d };
}

const pad2 = (n) => String(n).padStart(2, '0');

// ── 页面骨架 ────────────────────────────────────────────

/**
 * codes 是"确实存在这种语言页面"的清单，只有它们能进 hreflang —— 指向 404 的
 * 标注会让整组作废。但语言下拉里是全部 44 种，所以地址表得单独按全集来生成：
 * 没有城市页的语言，hrefFor 会把它落到该语言的首页。
 */
function head({ code, title, desc, url, codes, hrefFor, ogName = SITE_CARD, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="${escA(bcp47(code))}" dir="${dirOf(code)}" data-locale="${escA(code)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#04100e">
<title>${esc(title)}</title>
<meta name="description" content="${escA(desc)}">
<link rel="canonical" href="${escA(url)}">
<link rel="icon" href="/noorwaqt.png">
<link rel="apple-touch-icon" href="/noorwaqt.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escA(SITE.name)}">
<meta property="og:url" content="${escA(url)}">
<meta property="og:title" content="${escA(title)}">
<meta property="og:description" content="${escA(desc)}">
${ogImageTags(ogName)}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/pages.css">
${hreflangBlock(codes, hrefFor, hrefFor(SITE.rootLang))}
${extra}
${langHrefScript(LOCALES.map((l) => l.code), hrefFor)}
</head>
<body>`;
}

const nav = (code, dict) => `
<nav class="nav" id="nav">
  <a class="brand" href="${escA(langPath(code))}"><img src="/noorwaqt.png" alt=""> NoorWaqt</a>
  <div class="nav-right">
    <select class="lang" id="lang" aria-label="Language"></select>
    <a class="btn btn-primary btn-sm" href="${escA(langPath(code))}#download">${esc(dict.navDownload)}</a>
  </div>
</nav>`;

const foot = (dict, code, cities) => `
<footer class="footer">
  <div class="wrap footer-inner">
    <div>
      <div class="footer-tag">${esc(dict.footerTag)}</div>
      <small>${esc(dict.footerCalc)}</small>
    </div>
    <small>&copy; 2026 NoorWaqt</small>
  </div>
${cityCloud(dict, code, cities)}
</footer>
<script type="module" src="/assets/js/city-page.js"></script>
</body>
</html>`;

// ── 单个城市页 ──────────────────────────────────────────

function cityPageHtml(code, city, codes) {
  const dict = dictFor(code);
  const loc = intlLocale(code);
  const s = slug(city.en);
  const label = cityName(city, code);
  const country = countryName(city.cc, code);
  const url = abs(cityPath(code, s));

  // 语言切换：有城市页的语言换到同一座城市，没有的退回该语言首页
  const hrefFor = (c) => (codes.includes(c) ? abs(cityPath(c, s)) : abs(langPath(c)));

  const { y, m, d } = localYMD(city.tz);
  const today = prayerTimes(y, m, d, city.lat, city.lon, city.method, 1);
  const clock = (ts) => localClock(ts, city.tz, loc);

  const vars = {
    city: label,
    country,
    method: methodLabel(city.method, code),
    year: hijri(Date.UTC(y, m - 1, d)).y,
    month: new Intl.DateTimeFormat(loc, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1)),
    d: new Intl.NumberFormat(loc).format(d),
    deg: qiblaBearing(city.lat, city.lon).toFixed(1),
    km: new Intl.NumberFormat(loc).format(Math.round(distanceToMakkah(city.lat, city.lon))),
  };
  for (const [slot, key] of Object.entries(SLOT_KEY)) {
    vars[slot] = clock(today[slot]);
    vars['p' + slot[0].toUpperCase() + slot.slice(1)] = dict[key];
  }

  const title = fill(dict.ptDocTitle, vars);
  const desc = fill(dict.ptDocDesc, vars);

  // 日期抬头：公历 + 伊历，两套都写上
  const h = hijri(Date.UTC(y, m - 1, d));
  const greg = new Intl.DateTimeFormat(loc, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(Date.UTC(y, m - 1, d));
  const hij = fill(dict.hijriDate, { y: h.y, m: (dict.months || [])[h.m - 1] ?? h.m, d: h.d });

  const times = SLOTS.map((slot) => `
    <div class="pt-time" data-slot="${slot}">
      <span class="name">${esc(dict[SLOT_KEY[slot]])}</span>
      <span class="clock" data-time="${slot}">${esc(clock(today[slot]))}</span>
    </div>`).join('');

  const fastMin = Math.round((today.maghrib - today.fajr) / 60000);
  const km = distanceToMakkah(city.lat, city.lon);
  const facts = [
    // 麦加自己那一页没有"朝向"可言，硬写会得到 0.0° / 0 公里
    ...(km < 5 ? [] : [[dict.ptQibla, fill(dict.ptQiblaVal, vars) + ' · ' + fill(dict.ptDistance, vars)]]),
    [dict.cityMethod, vars.method],
    [dict.ptCoords, city.lat.toFixed(4) + ', ' + city.lon.toFixed(4)],
    [dict.ptTimezone, city.tz],
    [dict.ptSuhoorEnds, vars.fajr],
    [dict.ptFastLength, Math.floor(fastMin / 60) + ':' + pad2(fastMin % 60)],
  ].map(([k, v]) => `<div class="pt-fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

  // 整月时刻表 —— 这一段才是这页真正独有、别处抄不走的内容
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const wd = new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' });
  const dayNum = new Intl.NumberFormat(loc);
  let rows = '';
  for (let i = 1; i <= days; i++) {
    const t = prayerTimes(y, m, i, city.lat, city.lon, city.method, 1);
    const cells = SLOTS.map((slot) => `<td>${esc(clock(t[slot]))}</td>`).join('');
    rows += `<tr${i === d ? ' class="is-today"' : ''} data-day="${i}">`
      + `<td>${esc(dayNum.format(i))} ${esc(wd.format(Date.UTC(y, m - 1, i)))}</td>${cells}</tr>`;
  }
  const headCells = SLOTS.map((slot) => `<th scope="col">${esc(dict[SLOT_KEY[slot]])}</th>`).join('');

  const near = nearbyCities(city, 8).map(({ city: c }) =>
    `<a href="${escA(cityPath(code, slug(c.en)))}">${esc(cityName(c, code))}</a>`).join('');

  const apk = release().apk['arm64-v8a'];

  return head({
    code, title, desc, url, codes: [...codes], hrefFor,
    // 这一页的预览图就是这座城市那张 —— 同一座城的 9 种语言共用一张，
    // 图上是英文与阿文名、地球和朝向，本来就不随界面语言变
    ogName: s,
    extra: cityJsonLd(dict, code, city, label, country),
  }) + nav(code, dict) + `
<main class="wrap city-page">
  <nav class="crumb" aria-label="Breadcrumb"><ol>
    <li><a href="${escA(langPath(code))}">${esc(SITE.name)}</a></li>
    <li><a href="${escA(cityIndexPath(code))}">${esc(dict.ptCrumb)}</a></li>
    <li>${esc(label)}</li>
  </ol></nav>

  <header class="pt-head">
    <h1>${esc(fill(dict.ptH1, vars))}</h1>
    ${label === city.en ? '' : `<p class="pt-alt">${esc(city.en)}</p>`}
    <p class="lead">${esc(fill(dict.ptIntro, vars))}</p>
    <p class="pt-date" id="pt-date">${esc(greg)} · ${esc(hij)}</p>
  </header>

  <section aria-label="${escA(dict.ptToday)}">
    <div class="pt-times">${times}</div>
  </section>

  <dl class="pt-facts">${facts}</dl>

  <section class="pt-section">
    <h2>${esc(fill(dict.ptMonthTable, vars))}</h2>
    <div class="pt-table-wrap">
      <table class="pt-table">
        <thead><tr><th scope="col">${esc(dict.ptColDate)}</th>${headCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>

  <section class="pt-cta">
    <h2>${esc(fill(dict.ptCta, vars))}</h2>
    <p>${esc(dict.ptCtaLead)}</p>
    <a class="btn btn-primary" href="${escA(apk.url)}" download="NoorWaqt.apk">${esc(dict.dlBtn)}</a>
  </section>

  <section class="pt-section">
    <h2>${esc(dict.ptNearby)}</h2>
    <nav class="link-cloud">${near}</nav>
  </section>
</main>
<script type="application/json" id="pt-data">${JSON.stringify({
    lat: city.lat, lon: city.lon, tz: city.tz, method: city.method,
    // 静态内容停在构建那天。city-page.js 拿这个日期跟当地今天比，
    // 对不上就用同一个 prayer.js 就地重算 —— 跨月时整张表都会重画。
    builtFor: `${y}-${pad2(m)}-${pad2(d)}`,
  })}</script>` + foot(dict, code, CITIES.slice(0, 24));
}

// ── 城市索引页 ──────────────────────────────────────────

function cityIndexHtml(code, codes) {
  const dict = dictFor(code);
  const url = abs(cityIndexPath(code));
  const hrefFor = (c) => (codes.includes(c) ? abs(cityIndexPath(c)) : abs(langPath(c)));
  const title = dict.ptCrumb + ' · ' + SITE.name;
  const desc = fill(dict.ptOtherCities, {}) + ' — ' + CITIES.length + ' / ' + dict.docTitle;

  // 按国家分组，纯字母长列表没人看得下去
  const byCountry = new Map();
  for (const c of CITIES) {
    const k = countryName(c.cc, code);
    if (!byCountry.has(k)) byCountry.set(k, []);
    byCountry.get(k).push(c);
  }
  const coll = new Intl.Collator(intlLocale(code));
  const groups = [...byCountry.entries()].sort((a, b) => coll.compare(a[0], b[0])).map(([country, list]) => `
    <section class="pt-section">
      <h2>${esc(country)}</h2>
      <nav class="link-cloud">${list.map((c) =>
        `<a href="${escA(cityPath(code, slug(c.en)))}">${esc(cityName(c, code))}</a>`).join('')}</nav>
    </section>`).join('');

  return head({ code, title, desc, url, codes: [...codes], hrefFor }) + nav(code, dict) + `
<main class="wrap city-page">
  <nav class="crumb" aria-label="Breadcrumb"><ol>
    <li><a href="${escA(langPath(code))}">${esc(SITE.name)}</a></li>
    <li>${esc(dict.ptCrumb)}</li>
  </ol></nav>
  <header class="pt-head">
    <h1>${esc(dict.ptOtherCities)}</h1>
    <p class="lead">${esc(dict.cityLead)}</p>
  </header>
  ${groups}
</main>` + foot(dict, code, CITIES.slice(0, 24));
}

// ── 入口 ────────────────────────────────────────────────

export function buildCities() {
  const codes = seoLanguages();
  let n = 0;
  for (const code of codes) {
    emit(cityIndexPath(code) + 'index.html', cityIndexHtml(code, codes));
    n++;
    for (const city of CITIES) {
      emit(cityPath(code, slug(city.en)) + 'index.html', cityPageHtml(code, city, codes));
      n++;
    }
  }
  return { pages: n, langs: codes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = buildCities();
  console.log('城市页 ' + r.pages + ' 个（' + r.langs.join(' ') + '）');
}
