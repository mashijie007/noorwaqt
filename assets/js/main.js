/* main.js — 页面装配
 *
 * 一个共享的「当前时刻」贯穿全站：实时走动，或者被时间轴接管。
 * 地球、统计条、城市卡、斋戒列表全部读同一个时刻，因此永远不会互相打架。
 */
import { CITIES, nearestCity, searchCities } from './cities.js';
import { Globe, PRAYER_COLOR } from './globe.js';
import { stateAt, todayFor, localClock, fastingAt, resolveMethod, METHOD_LABEL, PRAYERS, timeline } from './prayer.js';
import { LOCALES, t, cityName, loadLocale, dirOf, isSupported, bcp47, monthNames } from './i18n.js';
import { upcoming, todayEvent, isRamadan, hijri, KIND_ICON } from './hijri.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const DAY = 86400e3;

// ── 全局状态 ────────────────────────────────────────────
const app = {
  lang: 'zh',
  shadow: 1,               // 晡礼影长倍数：1 标准 / 2 哈乃斐
  scrub: null,             // 被时间轴接管时的时间戳，null 表示跟随真实时间
  playing: false,
  city: null,
  mode: 'prayer',          // 'prayer' | 'fasting'
};
const now = () => app.scrub ?? Date.now();

// ── 语言 ────────────────────────────────────────────────
function detectLang() {
  const saved = localStorage.getItem('nw-lang');
  if (saved && isSupported(saved)) return saved;

  const codes = LOCALES.map((l) => l.code);
  for (const raw of navigator.languages || [navigator.language || 'en']) {
    const l = raw.toLowerCase();
    // 中文要先分繁简：zh-TW / zh-HK / zh-MO / zh-Hant 都归繁体
    if (l.startsWith('zh')) return /hant|tw|hk|mo/.test(l) ? 'zh_Hant' : 'zh';
    const base = l.split('-')[0];
    const hit = codes.find((c) => c === base || c.split('_')[0] === base);
    if (hit) return hit;
  }
  return 'en';
}

/** 语言选择器：44 个语言的母语名，与 App 的语言列表一一对应 */
function buildLangPicker() {
  const sel = $('#lang');
  sel.innerHTML = LOCALES
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => `<option value="${l.code}">${l.name}</option>`)
    .join('');
}

async function applyLang(lang) {
  await loadLocale(lang);            // 词典没到位就渲染，会先闪一遍英文
  app.lang = lang;
  app.months = monthNames(lang);
  localStorage.setItem('nw-lang', lang);
  document.documentElement.lang = bcp47(lang);
  document.documentElement.dir = dirOf(lang);
  document.title = t(lang, 'docTitle');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t(lang, 'docDesc'));

  for (const el of $$('[data-i18n]')) {
    const key = el.dataset.i18n;
    const val = t(lang, key);
    if (el.hasAttribute('data-html')) el.innerHTML = val;
    else el.textContent = val;
  }
  for (const el of $$('[data-i18n-attr]')) {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    el.setAttribute(attr, t(lang, key));
  }
  $('#lang').value = lang;

  renderBars(); renderCity(); renderRamadan(); renderEid(); renderDownload();
}

const hijriDayOf = (ts) => hijri(ts).d;

/**
 * Intl 并不认识全部 44 种语言（豪萨语、普什图语、维吾尔语等都不在内）。
 * 传进去一个不认识的语言码，它会静静回落到运行环境的语言 —— 于是维吾尔语页面上
 * 会冒出「3小时 13分钟」。所以先问一句支不支持，不支持就老实用英文。
 */
const intlLocale = (code) => {
  const b = bcp47(code);
  try { return Intl.NumberFormat.supportedLocalesOf(b).length ? b : 'en'; } catch { return 'en'; }
};

/** 伊历日期：模板来自各语言文案，月名来自 App 的 hijriMonthNames */
const fmtHijri = (ts, short) => {
  const h = hijri(ts);
  const m = app.months?.[h.m - 1] ?? h.m;
  return t(app.lang, short ? 'hijriDateShort' : 'hijriDate', { y: h.y, m, d: h.d });
};
const fmtEventDate = (ev) => t(app.lang, 'hijriDateShort',
  { y: '', m: app.months?.[ev.m - 1] ?? ev.m, d: ev.d }).trim();

// ── 数值与时间的格式化 ──────────────────────────────────
const nf = () => new Intl.NumberFormat(intlLocale(app.lang));

/** 把毫秒差写成「2 小时 14 分」这样的可读文本 */
function humanDuration(ms) {
  const total = Math.max(0, Math.round(ms / 60e3));
  const h = Math.floor(total / 60), m = total % 60;
  // 用 Intl.RelativeTimeFormat 的单位词，44 种语言都不用自己维护
  try {
    const unit = (v, u) => new Intl.NumberFormat(intlLocale(app.lang),
      { style: 'unit', unit: u, unitDisplay: 'short' }).format(v);
    return h ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(m, 'minute');
  } catch {
    return h ? `${h}h ${m}m` : `${m} min`;
  }
}

// 时刻一律用 24 小时制的中性写法，各语言都易读，也不会因区域习惯变成 12 小时制
const clockLocale = () => 'en-GB';

// ── 地球 ────────────────────────────────────────────────
const globe = new Globe($('#globe'), {
  onSelect: (city) => { selectCity(city, { focus: false }); window.track?.('city_selected', { city: city.en }); },
  onInteract: () => window.track?.('globe_interact'),
});
globe.start();

// ── 统计条 ──────────────────────────────────────────────
const BAR_KEYS = [...PRAYERS, 'idle'];

function renderBars() {
  const host = $('#bars');
  globe.time = now();
  globe.refreshStates();
  if (!host.children.length) {
    host.innerHTML = BAR_KEYS.map((k) => `
      <div class="bar-row" data-p="${k}">
        <span class="bar-name" data-bar="${k}"></span>
        <span class="bar-track"><i class="bar-fill"></i></span>
        <span class="bar-count">0</span>
      </div>`).join('');
  }
  const counts = globe.counts || {};
  const total = CITIES.length;
  for (const k of BAR_KEYS) {
    const row = host.querySelector(`[data-p="${k}"]`);
    row.querySelector('[data-bar]').textContent = k === 'idle' ? t(app.lang, 'slotIdle') : t(app.lang, 'prayer_' + k);
    const n = counts[k] || 0;
    row.querySelector('.bar-fill').style.width = (100 * n / total).toFixed(1) + '%';
    row.querySelector('.bar-count').textContent = nf().format(n);
  }
  const active = BAR_KEYS.filter((k) => k !== 'idle').reduce((s, k) => s + (counts[k] || 0), 0);
  $('#live-count').innerHTML = t(app.lang, 'heroLive', { n: nf().format(active) });
  $('#bars-note').textContent = t(app.lang, 'barsNote', {
    total: nf().format(total), countries: nf().format(new Set(CITIES.map((c) => c.cc)).size),
  });
  $('#privacy-web').textContent = t(app.lang, 'privacyWeb', { n: nf().format(total) });
}

// ── 时间轴 ──────────────────────────────────────────────
const scrubEl = $('#scrub');

function utcMinutesOf(ts) {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function setScrub(minutes) {
  const base = Math.floor(Date.now() / DAY) * DAY;
  app.scrub = base + minutes * 60e3;
  syncTime();
  tick();          // 立即重绘：拖动时若要等下一次秒级刷新，滑块会有一秒的迟滞感
}

function backToNow() {
  app.scrub = null; app.playing = false;
  $('#play').textContent = t(app.lang, 'timePlay');
  syncTime();
  tick();
}

function syncTime() {
  const ts = now();
  globe.time = ts;
  scrubEl.value = utcMinutesOf(ts);
  $('#time-readout').textContent = t(app.lang, 'timeLabel', {
    t: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ts)),
  });
}

scrubEl.addEventListener('input', () => { app.playing = false; $('#play').textContent = t(app.lang, 'timePlay'); setScrub(+scrubEl.value); });
$('#now').addEventListener('click', backToNow);
$('#play').addEventListener('click', () => {
  app.playing = !app.playing;
  if (app.playing && app.scrub == null) app.scrub = Date.now();
  $('#play').textContent = t(app.lang, app.playing ? 'timePause' : 'timePlay');
  window.track?.('timeline_play');
});

// ── 城市 ────────────────────────────────────────────────
function selectCity(city, { focus = true } = {}) {
  app.city = city;
  globe.selected = city;
  if (focus) globe.focus(city);
  $('#suggest').innerHTML = '';
  $('#city-search').value = '';
  renderCity();
}

function renderCity() {
  const c = app.city;
  if (!c) return;
  const ts = now();
  const st = stateAt(c, ts, app.shadow);
  const times = todayFor(c, ts, app.shadow);

  $('#city-name').textContent = cityName(c, app.lang);
  $('#city-sub').textContent = `${c.en !== cityName(c, app.lang) ? c.en + ' · ' : ''}${fmtHijri(ts)}`;
  $('#city-near').textContent = c._nearNote || '';
  const label = METHOD_LABEL[c.method];
  $('#method-name').textContent = label ? (label[app.lang] || label.en) : c.method;

  // 当前 / 下一番
  const bits = [];
  if (st.current) {
    const rgb = PRAYER_COLOR[st.current];
    bits.push(`<span class="chip" style="color:rgb(${rgb})"><i class="swatch"></i>${t(app.lang, 'cityCurrent')} · ${t(app.lang, 'prayer_' + st.current)}</span>`);
  } else {
    bits.push(`<span class="chip" style="color:var(--idle)"><i class="swatch"></i>${t(app.lang, 'slotIdle')}</span>`);
  }
  if (st.next) {
    const nm = t(app.lang, 'prayer_' + st.next.name);
    bits.push(`<span>${t(app.lang, 'cityNext')} · <b>${nm}</b> ${t(app.lang, 'cityIn', { t: humanDuration(st.untilNext) })}</span>`);
  }
  $('#city-status').innerHTML = bits.join('');

  // 今日六个时刻
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  $('#city-times').innerHTML = order.map((k) => {
    const isNow = st.current === k;
    const rgb = PRAYER_COLOR[k] ? `rgb(${PRAYER_COLOR[k]})` : 'var(--idle)';
    return `<div class="time-row${isNow ? ' is-now' : ''}">
      <i class="marker" style="background:${rgb};opacity:${k === 'sunrise' ? 0.35 : 1}"></i>
      <span class="label">${t(app.lang, 'prayer_' + k)}</span>
      <span class="clock">${localClock(times[k], c.tz, clockLocale())}</span>
    </div>`;
  }).join('');
}

// 搜索
const searchEl = $('#city-search');
searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim();
  const box = $('#suggest');
  if (!q) { box.innerHTML = ''; return; }
  const hits = searchCities(q);
  if (!hits.length) { box.innerHTML = `<button disabled>${t(app.lang, 'cityNoResult')}</button>`; return; }
  box.innerHTML = hits.map((c, i) =>
    `<button data-i="${CITIES.indexOf(c)}" role="option">${cityName(c, app.lang)}<small>${c.en} · ${c.cc}</small></button>`
  ).join('');
});
$('#suggest').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (b) selectCity(CITIES[+b.dataset.i]);
});
searchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const b = $('#suggest button[data-i]'); if (b) selectCity(CITIES[+b.dataset.i]); }
  if (e.key === 'Escape') $('#suggest').innerHTML = '';
});

// 定位
$('#locate').addEventListener('click', () => {
  const msg = $('#city-msg');
  if (!navigator.geolocation) { msg.textContent = t(app.lang, 'cityUnsupported'); return; }
  msg.textContent = t(app.lang, 'cityLocating');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const near = nearestCity(lat, lon);
      // 用真实坐标和浏览器自己的时区来算，锚点城市只负责提供一个名字。
      // 直接套用几百公里外的锚点会让时刻差上十几分钟。
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || near.city.tz;
      const here = {
        ...near.city, lat, lon, tz, method: resolveMethod(lat, lon),
        vec: null, _nearNote: near.km > 40 ? t(app.lang, 'cityNear', { city: cityName(near.city, app.lang), km: near.km }) : '',
      };
      const D = Math.PI / 180, p = lat * D, l = lon * D, cp = Math.cos(p);
      here.vec = [cp * Math.sin(l), Math.sin(p), cp * Math.cos(l)];
      msg.textContent = '';
      app.city = here; globe.selected = null; globe.focus(here); renderCity();
      window.track?.('geolocated');
    },
    () => { msg.textContent = t(app.lang, 'cityDenied'); },
    { timeout: 10000, maximumAge: 600000 }
  );
});

// 晡礼学派
$('#asr-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-asr]');
  if (!b) return;
  app.shadow = +b.dataset.asr;
  for (const x of $$('#asr-seg button')) x.setAttribute('aria-pressed', String(x === b));
  globe.shadow = app.shadow; globe._statesAt = -1;
  renderCity(); renderRamadan();
  window.track?.('asr_changed', { madhab: app.shadow === 2 ? 'hanafi' : 'standard' });
});

// ── 斋月 ────────────────────────────────────────────────
const RAMADAN_CITIES = ['Jakarta', 'Dhaka', 'Karachi', 'Delhi', 'Makkah', 'Cairo', 'Istanbul', 'Lagos', 'London', 'New York']
  .map((n) => CITIES.find((c) => c.en === n)).filter(Boolean);

function renderRamadan() {
  const ts = now();
  const badge = $('#ramadan-badge');
  if (isRamadan(ts)) {
    badge.textContent = '🌙 ' + t(app.lang, 'ramadanActive', { d: hijriDayOf(ts) });
  } else {
    const start = upcoming(ts, 12).find((e) => e.id === 'ramadan_start');
    const days = start ? Math.max(0, Math.ceil((start.at - ts) / DAY)) : 0;
    badge.textContent = '🌙 ' + t(app.lang, 'ramadanCountdown', { d: days });
  }

  $('#fast-list').innerHTML = RAMADAN_CITIES.map((c) => {
    const f = fastingAt(c, ts, app.shadow);
    const state = f.fasting ? t(app.lang, 'ramadanFasting') : t(app.lang, 'ramadanOpen');
    const cd = f.fasting
      ? t(app.lang, 'ramadanIftar', { t: humanDuration(f.untilIftar) })
      : (f.untilSuhoorEnd != null ? t(app.lang, 'ramadanSuhoor', { t: humanDuration(f.untilSuhoorEnd) }) : '');
    const pct = f.fasting ? Math.round(f.progress * 100) : 0;
    return `<div class="fast-row${f.fasting ? ' fasting' : ''}">
      <span>${cityName(c, app.lang)}</span>
      <span class="state">${f.fasting ? '🌙' : '🍽'} ${state}</span>
      <span class="cd">${cd}</span>
      <span class="fast-bar"><i style="width:${pct}%"></i></span>
    </div>`;
  }).join('');
}

$('#ramadan-toggle').addEventListener('click', () => {
  app.mode = app.mode === 'fasting' ? 'prayer' : 'fasting';
  globe.mode = app.mode; globe._statesAt = -1;
  $('#ramadan-toggle').textContent = t(app.lang, app.mode === 'fasting' ? 'ramadanExit' : 'ramadanPreview');
  if (app.mode === 'fasting') $('#top').scrollIntoView({ behavior: 'smooth' });
  renderBars();
  window.track?.('ramadan_preview', { on: app.mode === 'fasting' });
});

// ── 节日 ────────────────────────────────────────────────
const SWEEP_CITIES = ['Auckland', 'Sydney', 'Tokyo', 'Jakarta', 'Dhaka', 'Karachi', 'Dubai', 'Makkah', 'Istanbul', 'Cairo', 'Lagos', 'London', 'New York', 'Los Angeles']
  .map((n) => CITIES.find((c) => c.en === n)).filter(Boolean);

/**
 * 节日的真实起点。
 * 贵夜（登霄夜、中夜、盖德尔夜）在伊历里从前一日昏礼开始 —— 伊历一日自昏礼始，
 * 按公历零时倒计时会晚上好几个小时。这里用当前城市的昏礼把起点提前，
 * 与 App 的 startsAtMaghribEve 语义保持一致。
 */
function eventStart(ev) {
  if (!ev.eve || !app.city) return ev.at;
  const tl = timeline(app.city, ev.at - DAY / 2, app.shadow);
  let best = null;
  for (const e of tl) if (e.name === 'maghrib' && e.at < ev.at) best = e.at;
  return best ?? ev.at;
}

function renderEid() {
  const ts = now();
  const list = upcoming(ts, 12);
  const today = todayEvent(ts);
  const next = list[0];
  if (!next) return;

  const name = (e) => t(app.lang, 'ev_' + e.id);
  $('#eid-label').textContent = today
    ? t(app.lang, 'eidToday', { name: name(today) })
    : t(app.lang, 'eidNext', { name: name(next) });

  const left = Math.max(0, eventStart(next) - ts);
  const d = Math.floor(left / DAY), h = Math.floor((left % DAY) / 3600e3), m = Math.floor((left % 3600e3) / 60e3);
  $('#eid-countdown').innerHTML = [[d, 'eidDays'], [h, 'eidHours'], [m, 'eidMins']]
    .map(([v, k]) => `<div class="cd-unit"><b>${nf().format(v)}</b><span>${t(app.lang, k)}</span></div>`).join('');

  // 未来一个伊历年的节日一览，日期与 App 的节日列表同源
  const gfmt = new Intl.DateTimeFormat(intlLocale(app.lang), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  $('#eid-list').innerHTML = list.map((e) => `
    <div class="ev-row${e.today ? ' is-today' : ''}">
      <span class="ev-ico">${KIND_ICON[e.kind] || '🌙'}</span>
      <span class="ev-name">${name(e)}${e.eve ? `<small>${t(app.lang, 'eidEve')}</small>` : ''}</span>
      <span class="ev-hijri">${fmtEventDate(e)}</span>
      <span class="ev-greg">${gfmt.format(new Date(e.at))}</span>
    </div>`).join('');
  $('#eid-list-title').textContent = t(app.lang, 'eidListTitle', { year: next.hijriYear });

  // 节日从东往西一座座到来：以各城当地是否已跨过午夜为准
  $('#sweep').innerHTML = SWEEP_CITIES.map((c) => {
    const localHour = +new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ts));
    const lit = today ? true : localHour >= 0 && localHour < 12;
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ts));
    return `<div class="sweep-row${lit ? ' lit' : ''}">
      <span class="spark">${lit ? '✨' : '·'}</span>
      <span class="line"></span>
      <span class="tz">${cityName(c, app.lang)} ${clock}</span>
    </div>`;
  }).join('');
}

// ── 下载清单 ────────────────────────────────────────────
// 从 release/latest.json 现读版本号，这样每次发版只要更新那个文件，
// 页面上的版本、体积、更新说明自动跟着走，不用再改 HTML。
let manifest = null, apkEntry = null, apkAbi = '';

async function loadManifest() {
  try {
    const r = await fetch('./release/latest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    manifest = await r.json();
    const abis = Object.keys(manifest.apk || {});
    apkAbi = abis.includes('arm64-v8a') ? 'arm64-v8a' : abis[0] || '';
    apkEntry = apkAbi ? manifest.apk[apkAbi] : null;
    if (apkEntry?.url) $('#dl-btn').href = apkEntry.url;
  } catch { /* 清单拿不到就沿用 HTML 里的兜底链接 */ }
  renderDownload();
}

function renderDownload() {
  const v = manifest?.version;
  if (!v) { $('#dl-meta').textContent = ''; return; }
  // 体积从清单里读，不写死在页面上：以前按钮上印着 34.8MB，
  // 而链接早就换成了体积不同的 arm64 单架构包，两边对不上。
  const mb = apkEntry?.size ? (apkEntry.size / 1048576).toFixed(1) + ' MB' : '';
  $('#dl-meta').textContent = t(app.lang, 'dlVersion', { v, size: mb, abi: apkAbi })
    .replace(/ · (?= ·|$)/g, '').replace(/ · $/, '');
  const list = manifest?.changelog || [];
  $('#changelog').hidden = !list.length;
  $('#changelog-list').innerHTML = list.map((x) => `<li>${x}</li>`).join('');
}

$('#dl-btn').addEventListener('click', () => window.track?.('download_click', { version: manifest?.version || 'unknown' }));

// ── 分享卡 ──────────────────────────────────────────────
$('#share').addEventListener('click', async () => {
  const c = app.city;
  if (!c) return;
  const btn = $('#share');
  btn.textContent = t(app.lang, 'cityShareSaving');
  try {
    const url = await drawShareCard(c);
    $('#share-img').src = url;
    $('#share-save').href = url;
    $('#share-dlg').showModal();
    window.track?.('share_card', { city: c.en });
  } finally {
    btn.textContent = t(app.lang, 'cityShare');
  }
});
$('#share-close').addEventListener('click', () => $('#share-dlg').close());

/** 离屏渲染一颗以某城为中心的地球，供分享卡使用 */
let shareGlobe = null, shareHost = null;
async function renderGlobeFor(city, ts, size) {
  try {
    if (!shareGlobe) {
      shareHost = document.createElement('div');
      shareHost.style.cssText = `position:fixed;left:-9999px;top:0;width:${size}px;height:${size}px;pointer-events:none`;
      const cv = document.createElement('canvas');
      shareHost.appendChild(cv);
      document.body.appendChild(shareHost);
      shareGlobe = new Globe(cv, { interactive: false, zoom: 0.94 });
    }
    shareGlobe.time = ts;
    shareGlobe.shadow = app.shadow;
    shareGlobe.mode = app.mode;
    shareGlobe.lon0 = city.lon;
    shareGlobe.lat0 = Math.max(-55, Math.min(55, city.lat));
    shareGlobe.selected = null;
    shareGlobe._statesAt = -1; shareGlobe._sunAt = -1;
    shareGlobe.draw();
    return shareGlobe.cv;
  } catch { return null; }
}

async function drawShareCard(c) {
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const ts = now();
  const times = todayFor(c, ts, app.shadow);
  const st = stateAt(c, ts, app.shadow);

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#062b23'); bg.addColorStop(0.55, '#04120f'); bg.addColorStop(1, '#071a17');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // 背景里的一轮光晕，呼应地球上的 Noor
  const halo = g.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, W * 0.62);
  halo.addColorStop(0, 'rgba(16,185,129,0.22)'); halo.addColorStop(1, 'rgba(16,185,129,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);

  const isAr = dirOf(app.lang) === 'rtl';

  // 一颗以这座城市为中心的地球。分享卡若只是一张时刻表，跟任何一个
  // 礼拜应用的截图没有区别；把地球放上去，它才带着 NoorWaqt 的样子传出去。
  // 位置跟着文字方向镜像：文字靠哪边，地球就放另一边的上角，
  // 否则阿语版里它会直接压在城市名上。
  const gl = await renderGlobeFor(c, ts, 520);
  if (gl) {
    g.save();
    g.globalAlpha = 0.62;
    const S = 470;
    g.drawImage(gl, isAr ? -70 : W - S + 70, -110, S, S);
    g.restore();
  }

  const fam = isAr ? "'Amiri', 'Noto Naskh Arabic', serif" : "'Noto Sans SC', system-ui, sans-serif";
  g.textAlign = isAr ? 'right' : 'left';
  const x = isAr ? W - 90 : 90;

  g.fillStyle = '#34d399'; g.font = `600 34px ${fam}`;
  g.fillText('NoorWaqt', x, 130);

  g.fillStyle = '#e8f5f0'; g.font = `700 92px ${fam}`;
  g.fillText(cityName(c, app.lang), x, 260);

  g.fillStyle = '#a8c5bb'; g.font = `400 34px ${fam}`;
  g.fillText(fmtHijri(ts), x, 320);
  g.fillText(t(app.lang, 'shareTitle'), x, 372);

  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let y = 500;
  for (const k of order) {
    const isNow = st.current === k;
    if (isNow) {
      g.fillStyle = 'rgba(16,185,129,0.16)';
      g.fillRect(60, y - 58, W - 120, 92);
    }
    const rgb = PRAYER_COLOR[k] || [74, 107, 99];
    g.fillStyle = `rgb(${rgb})`;
    g.beginPath(); g.arc(isAr ? W - 105 : 105, y - 12, k === 'sunrise' ? 7 : 11, 0, 7); g.fill();

    g.fillStyle = isNow ? '#ffffff' : '#c8ded6';
    g.font = `${isNow ? 600 : 400} 46px ${fam}`;
    g.fillText(t(app.lang, 'prayer_' + k), isAr ? W - 150 : 150, y);

    g.textAlign = isAr ? 'left' : 'right';
    g.fillStyle = isNow ? '#ffffff' : '#e8f5f0';
    g.font = `600 52px ${fam}`;
    g.fillText(localClock(times[k], c.tz, 'en-GB'), isAr ? 90 : W - 90, y);
    g.textAlign = isAr ? 'right' : 'left';
    y += 128;
  }

  g.strokeStyle = 'rgba(126,231,190,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(90, H - 170); g.lineTo(W - 90, H - 170); g.stroke();

  g.fillStyle = '#6e8f85'; g.font = `400 32px ${fam}`;
  g.fillText(t(app.lang, 'shareFooter'), x, H - 100);

  return cv.toDataURL('image/png');
}

// ── 驱动 ────────────────────────────────────────────────
// 播放动画跟着 rAF 走（要跟渲染同步），文字刷新走 setInterval
// （后台标签页 rAF 会被完全暂停，而 setInterval 只是降频）。
let lastPlay = performance.now();

function playFrame(tNow) {
  if (app.playing) {
    // 播放时把一天压缩到约 40 秒
    const dt = tNow - lastPlay;
    app.scrub = (app.scrub ?? Date.now()) + dt * (DAY / 40000);
    const base = Math.floor(Date.now() / DAY) * DAY;
    if (app.scrub > base + DAY) app.scrub -= DAY;
    syncTime();
  }
  lastPlay = tNow;
  requestAnimationFrame(playFrame);
}

function tick() {
  if (!app.playing) globe.time = now();
  renderBars(); renderCity(); renderRamadan(); renderEid();
}

// ── 杂项 ────────────────────────────────────────────────
$('#lang').addEventListener('change', (e) => { applyLang(e.target.value); window.track?.('lang_switch', { lang: e.target.value }); });

const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20), { passive: true });

// 只有走到这里才开启淡入的初始隐藏态；上面任何一步抛错，内容都保持可见
try {
  document.documentElement.classList.add('js');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
} catch {
  document.documentElement.classList.remove('js');   // 没有 IntersectionObserver 就直接全显示
}

// ── 启动 ────────────────────────────────────────────────
// 初始城市：优先按浏览器时区猜一个，猜不中就落到麦加。
function initialCity() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return CITIES.find((c) => c.tz === tz) || CITIES.find((c) => c.en === 'Makkah') || CITIES[0];
}

buildLangPicker();
app.lang = detectLang();
app.months = monthNames(app.lang);
app.city = initialCity();
globe.shadow = app.shadow;
globe.selected = app.city;
globe.lon0 = app.city.lon;
globe.lat0 = Math.max(-50, Math.min(50, app.city.lat));
syncTime();
globe.refreshStates(true);   // 先把数据算出来，首屏统计条不能是 0
applyLang(app.lang);
loadManifest();
setInterval(tick, 1000);
requestAnimationFrame(playFrame);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
