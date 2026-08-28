/* live.js — NoorWaqt Live Render Core
 *
 *  NoorWaqt Prayer Engine
 *           │
 *           ▼
 *  ┌─────────────────────┐
 *  │  Live Render Core   │  ← 本文件
 *  │  当前时间 / 下一番 / 倒计时 / 五番 / Hijri / 城市
 *  └──────────┬──────────┘
 *             │
 *   ┌─────────┴───────────┐
 *   ▼                     ▼
 * YouTube 16:9        TikTok 9:16
 *   │                     │
 *   ▼                     ▼
 * FFmpeg              FFmpeg
 *   │                     │
 *   ▼                     ▼
 * YouTube Live      TikTok LIVE
 *
 * 设计约束：
 *  - OBS Browser Source 整页捕获，不滚动、秒级刷新、零交互即可常驻推流
 *  - 纯客户端计算，复用 prayer.js / hijri.js / cities.js 同款引擎，与官网/APP 1分钟不差
 */

import { CITIES, citySlug, searchCities } from './cities.js';
import { prayerTimes, todayFor, stateAt, timeline, localClock, fastingAt, resolveMethod, METHOD_LABEL, PRAYERS, SLOTS } from './prayer.js';
import { hijri } from './hijri.js';
import { LOCALES, loadLocale, t, cityName, dirOf, bcp47, monthNames } from './i18n.js';
import { qiblaBearing, distanceToMakkah } from './cities.js';

// ── DOM ──
const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const els = {
  cityName: $('#cityName'), citySub: $('#citySub'),
  hijri: $('#hijriDate'), greg: $('#gregDate'),
  clock: $('#clock'), clockTz: $('#clockTz'),
  nextName: $('#nextName'), nextTime: $('#nextTime'), nextIn: $('#nextIn'),
  countdown: $('#countdown'), progress: $('#progressBar'),
  prayerList: $('#prayerList'),
  currentChip: $('#currentPrayerChip'), liveMsg: $('#liveMsg'),
  method: $('#methodLabel'), asr: $('#asrLabel'),
  qiblaVal: $('#qiblaVal'), qiblaDist: $('#qiblaDist'),
  fastingState: $('#fastingState'), fastingCd: $('#fastingCd'), fastProgress: $('#fastProgress'),
  footerTime: $('#footerTime'),
  // labels
  labelCurrentTime: $('#labelCurrentTime'), labelNextPrayer: $('#labelNextPrayer'),
  labelToday: $('#labelToday'), labelQibla: $('#labelQibla'), labelFasting: $('#labelFasting'),
  controlsHint: $('#controlsHint'), demoYoutube: $('#demoYoutube'), demoTiktok: $('#demoTiktok'),
  // controls
  ctrlCity: $('#ctrlCity'), ctrlLang: $('#ctrlLang'), ctrlLayout: $('#ctrlLayout'), ctrlAsr: $('#ctrlAsr'),
  cityDatalist: $('#cityDatalist'), controlBar: $('#controlBar'),
  toast: $('#toast'),
};

// ── URL Params ──
const params = new URLSearchParams(location.search);
function getParam(name, fallback) { const v = params.get(name); return v != null && v !== '' ? v : fallback; }

let state = {
  lang: getParam('lang', 'zh'),
  city: null,
  layout: getParam('layout', '16x9'), // 16x9 | 9x16 | auto
  asr: parseInt(getParam('asr', '1'), 10) === 2 ? 2 : 1,
  clean: params.get('clean') === '1',
};

// ── Language guard ──
if (!LOCALES.some(l => l.code === state.lang)) state.lang = 'zh';
if (!['16x9','9x16','auto'].includes(state.layout)) state.layout = '16x9';

// ── City resolution ──
function findCity(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  // slug exact
  let hit = CITIES.find(c => citySlug(c.en).toLowerCase() === s);
  if (hit) return hit;
  // en exact
  hit = CITIES.find(c => c.en.toLowerCase() === s);
  if (hit) return hit;
  // zh / ar includes
  hit = CITIES.find(c => (c.zh && c.zh === raw) || (c.ar && c.ar === raw));
  if (hit) return hit;
  // fuzzy
  const fuzzy = searchCities(raw, 1);
  return fuzzy[0] || null;
}
state.city = findCity(getParam('city', 'Makkah')) || CITIES.find(c => c.en === 'Makkah') || CITIES[0];

// ── Layout ──
function applyLayout(layout) {
  const normalized = layout === '16x9' ? '16x9' : layout === '9x16' ? '9x16' : 'auto';
  let chosen = normalized;
  if (normalized === 'auto') {
    const ratio = window.innerWidth / window.innerHeight;
    chosen = ratio >= 1 ? '16x9' : '9x16';
  }
  stage.className = 'stage layout-' + chosen;
  stage.dataset.layout = chosen;
  // HTML dir
  document.documentElement.lang = bcp47(state.lang);
  document.documentElement.dir = dirOf(state.lang);
}
applyLayout(state.layout);
window.addEventListener('resize', () => { if (state.layout === 'auto') applyLayout('auto'); });

// ── Dirty helpers ──
function humanDurationHHMMSS(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2,'0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2,'0');
  const ss = String(s % 60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}
function humanIn(ms) {
  // 复用 i18n 的 human 风格，但倒计时需要精确到秒
  return humanDurationHHMMSS(ms);
}
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.hidden = true, 2200);
}

// ── Prayer colors (same as site.css vars) ──
const PRAYER_COLOR = {
  fajr: 'rgb(110,168,255)', dhuhr: 'rgb(255,215,110)', asr: 'rgb(255,159,90)', maghrib: 'rgb(255,107,107)', isha: 'rgb(167,139,250)', sunrise: 'rgba(255,255,255,.22)'
};
const ORDER = ['fajr','sunrise','dhuhr','asr','maghrib','isha'];
const PRAYER_ORDER = ['fajr','dhuhr','asr','maghrib','isha'];

// ── Render core ──
let dictReady = false;
let months = [];

async function ensureLang(lang) {
  await loadLocale(lang);
  dictReady = true;
  months = monthNames(lang);
  document.title = `NoorWaqt Live — ${cityName(state.city, lang)} · ${t(lang,'prayer_fajr')}...`;
  // 静态标签
  if (els.labelCurrentTime) els.labelCurrentTime.textContent = t(lang, 'liveCurrentTime');
  if (els.labelNextPrayer) els.labelNextPrayer.textContent = t(lang, 'liveNextPrayer');
  if (els.labelToday) els.labelToday.textContent = t(lang, 'liveToday');
  if (els.labelQibla) els.labelQibla.textContent = t(lang, 'liveQibla');
  if (els.labelFasting) els.labelFasting.textContent = t(lang, 'liveFasting');
  if (els.controlsHint) els.controlsHint.innerHTML = `${t(lang,'liveControlsHint')} <code>?clean=1</code>`;
  if (els.demoYoutube) els.demoYoutube.textContent = t(lang, 'liveYouTubeDemo');
  if (els.demoTiktok) els.demoTiktok.textContent = t(lang, 'liveTikTokDemo');
}

function fmtHijri(ts, lang) {
  const h = hijri(ts);
  const m = months[h.m-1] ?? h.m;
  // 复用 t hijriDate 模板
  return t(lang, 'hijriDate', { y: h.y, m, d: h.d });
}
function fmtGreg(ts, tz, lang) {
  try {
    return new Intl.DateTimeFormat(bcp47(lang), { timeZone: tz, year:'numeric', month:'long', day:'numeric', weekday:'long' }).format(new Date(ts));
  } catch {
    return new Intl.DateTimeFormat('en', { timeZone: tz, year:'numeric', month:'long', day:'numeric', weekday:'long' }).format(new Date(ts));
  }
}

function renderPrayerList(city, now) {
  const times = todayFor(city, now, state.asr);
  const st = stateAt(city, now, state.asr);
  const next = st.next;
  // 当前处于哪一番 (current != null 且是礼拜)
  const current = st.current;

  const rows = ORDER.map(k => {
    const ts = times[k];
    const isNext = next && next.name === k;
    const isCurrent = current === k;
    const label = t(state.lang, 'prayer_' + k);
    const clockStr = ts ? localClock(ts, city.tz, 'en-GB') : '--:--';
    const color = PRAYER_COLOR[k] || 'var(--idle)';
    const badge = isNext ? `<span class="p-badge next">${t(state.lang,'liveNext')}</span>` : isCurrent ? `<span class="p-badge now">${t(state.lang,'liveNow')}</span>` : `<span class="p-badge">-</span>`;
    return `<div class="live-prayer-row ${isNext?'is-next':''} ${isCurrent?'is-current':''}">
      <i class="dot" style="background:${color};${k==='sunrise'?'opacity:.5':''}"></i>
      <span class="p-name">${label}</span>
      <span class="p-time">${clockStr}</span>
      ${badge}
    </div>`;
  }).join('');
  els.prayerList.innerHTML = rows;
}

function render(now) {
  const city = state.city;
  const lang = state.lang;
  const tz = city.tz;

  // clock — 用城市时区格式化
  try {
    const clockStr = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).format(new Date(now));
    els.clock.textContent = clockStr;
  } catch { els.clock.textContent = new Date(now).toLocaleTimeString('en-GB', { hour12:false }); }
  els.clockTz.textContent = tz + ' · ' + (() => {
    try { return new Intl.DateTimeFormat(bcp47(lang), { timeZone: tz, timeZoneName:'short' }).formatToParts(new Date(now)).find(p=>p.type==='timeZoneName')?.value || ''; } catch { return ''; }
  })();

  // hijri / greg
  els.hijri.textContent = fmtHijri(now, lang);
  try { els.greg.textContent = fmtGreg(now, tz, lang); } catch { els.greg.textContent = new Date(now).toDateString(); }

  // city header
  els.cityName.textContent = cityName(city, lang);
  const methodKey = city.method;
  const methodLabel = METHOD_LABEL[methodKey];
  const methodName = methodLabel ? (methodLabel[lang] || methodLabel.en) : methodKey;
  els.citySub.textContent = `${city.cc} · ${tz} · ${methodName}`;
  els.method.textContent = `${t(lang,'liveMethod')} · ${methodName}`;
  els.asr.textContent = `${t(lang,'cityAsr')} · ${state.asr===2 ? t(lang,'cityAsrHanafi') : t(lang,'cityAsrStd')}`;

  // state
  const st = stateAt(city, now, state.asr);
  const times = todayFor(city, now, state.asr);

  // next prayer card
  if (st.next) {
    const nextLabel = t(lang, 'prayer_' + st.next.name);
    els.nextName.textContent = nextLabel;
    els.nextTime.textContent = localClock(st.next.at, tz, 'en-GB');
    els.countdown.textContent = humanDurationHHMMSS(st.untilNext);
    els.nextIn.textContent = t(lang, 'cityIn', { t: (()=>{ const ms=st.untilNext; const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000); return h? `${h}h ${m}m` : `${m} min`; })() });
    // progress: from current window start to next
    let total = st.next.at - (st.windowEnd ? (st.windowEnd - (st.next.at - (st.since? now - st.since : 0))) : now);
    // 更稳：取 timeline 上当前 window 的起点
    const tl = timeline(city, now, state.asr);
    let curIdx = tl.findIndex(e => e.at <= now && (tl[tl.indexOf(e)+1]?.at > now));
    // fallback: 用 since
    let start = now - (st.since || 0);
    if (tl[curIdx]) start = tl[curIdx].at;
    total = st.next.at - start;
    const elapsed = now - start;
    const pct = total>0 ? Math.max(0, Math.min(100, (elapsed/total)*100)) : 0;
    els.progress.style.width = pct.toFixed(2)+'%';
  } else {
    els.nextName.textContent = '—'; els.nextTime.textContent='—'; els.countdown.textContent='--:--:--'; els.nextIn.textContent='—'; els.progress.style.width='0%';
  }

  // current chip
  if (st.current) {
    const rgb = PRAYER_COLOR[st.current]?.replace('rgb(','').replace(')','');
    const label = t(lang, 'prayer_'+st.current);
    els.currentChip.innerHTML = `<i class="swatch" style="background:rgb(${rgb})"></i>${t(lang,'cityCurrent')} · ${label}`;
    els.currentChip.style.color = PRAYER_COLOR[st.current];
    els.liveMsg.textContent = t(lang,'cityNow') || 'It is time';
  } else {
    els.currentChip.innerHTML = `<i class="swatch" style="background:var(--idle)"></i>${t(lang,'slotIdle')}`;
    els.currentChip.style.color = 'var(--idle)';
    els.liveMsg.textContent = st.next ? `${t(lang,'cityNext')} · ${t(lang,'prayer_'+st.next.name)}` : '—';
  }

  // prayer list
  renderPrayerList(city, now);

  // qibla
  const bearing = qiblaBearing(city.lat, city.lon);
  const dist = distanceToMakkah(city.lat, city.lon);
  els.qiblaVal.textContent = bearing.toFixed(1) + '°';
  els.qiblaDist.textContent = t(lang,'liveKmToMakkah', { km: Math.round(dist).toLocaleString(bcp47(lang)) });

  // fasting
  const f = fastingAt(city, now, state.asr);
  if (f.fasting) {
    els.fastingState.textContent = '🌙 ' + t(lang,'ramadanFasting');
    els.fastingCd.textContent = t(lang,'liveToIftar', { t: humanDurationHHMMSS(f.untilIftar) });
    els.fastProgress.style.width = (f.progress*100).toFixed(1)+'%';
  } else {
    els.fastingState.textContent = '🍽 ' + t(lang,'ramadanOpen');
    els.fastingCd.textContent = f.untilSuhoorEnd != null ? t(lang,'liveToFajr', { t: humanDurationHHMMSS(f.untilSuhoorEnd) }) : '—';
    els.fastProgress.style.width = '0%';
  }

  // footer UTC
  try { els.footerTime.textContent = new Intl.DateTimeFormat('en-GB', { timeZone:'UTC', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', timeZoneName:'short' }).format(new Date(now)) + ' UTC'; }
  catch { els.footerTime.textContent = new Date(now).toISOString().slice(11,19) + ' UTC'; }

  // document dir already set
}

// ── Controls ──
function fillControls() {
  // datalist
  els.cityDatalist.innerHTML = CITIES.map(c => `<option value="${c.en}"></option>`).join('');
  // lang
  const sorted = [...LOCALES].sort((a,b)=>a.name.localeCompare(b.name));
  els.ctrlLang.innerHTML = sorted.map(l => `<option value="${l.code}">${l.name} · ${l.code}</option>`).join('');
  els.ctrlLang.value = state.lang;
  els.ctrlLayout.value = ['16x9','9x16'].includes(state.layout) ? state.layout : '16x9';
  if (state.layout==='auto') els.ctrlLayout.value = '16x9';
  els.ctrlAsr.value = String(state.asr);
  els.ctrlCity.value = state.city.en;
  if (state.clean) els.controlBar.hidden = true;
}

function updateUrl() {
  const p = new URLSearchParams();
  p.set('city', citySlug(state.city.en));
  p.set('lang', state.lang);
  p.set('layout', state.layout);
  if (state.asr===2) p.set('asr','2');
  if (state.clean) p.set('clean','1');
  const url = location.pathname + '?' + p.toString();
  history.replaceState(null, '', url);
}

function bindControls() {
  els.ctrlCity.addEventListener('change', async () => {
    const hit = findCity(els.ctrlCity.value);
    if (!hit) { toast('City not found'); return; }
    state.city = hit;
    await ensureLang(state.lang);
    updateUrl();
    toast(`City → ${cityName(hit, state.lang)}`);
  });
  els.ctrlCity.addEventListener('keydown', (e) => { if (e.key==='Enter') els.ctrlCity.dispatchEvent(new Event('change')); });

  els.ctrlLang.addEventListener('change', async () => {
    state.lang = els.ctrlLang.value;
    await ensureLang(state.lang);
    applyLayout(state.layout);
    updateUrl();
    render(Date.now());
  });
  els.ctrlLayout.addEventListener('change', () => {
    state.layout = els.ctrlLayout.value;
    applyLayout(state.layout);
    updateUrl();
  });
  els.ctrlAsr.addEventListener('change', () => {
    state.asr = parseInt(els.ctrlAsr.value,10)===2?2:1;
    updateUrl();
    render(Date.now());
  });
  $('#ctrlSwap').addEventListener('click', () => {
    state.layout = state.layout === '16x9' ? '9x16' : '16x9';
    els.ctrlLayout.value = state.layout;
    applyLayout(state.layout);
    updateUrl();
  });
  $('#ctrlCopy').addEventListener('click', async () => {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  });
  $('#ctrlClean').addEventListener('click', () => {
    state.clean = !state.clean;
    els.controlBar.hidden = state.clean;
    updateUrl();
    toast(state.clean ? 'Clean mode ON — controls hidden (?clean=1 for OBS)' : 'Clean mode OFF');
  });
  // keyboard: c = toggle clean, s = swap
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input,select')) return;
    if (e.key==='c' || e.key==='C') $('#ctrlClean').click();
    if (e.key==='s' || e.key==='S') $('#ctrlSwap').click();
  });
}

// ── Tick loop ──
// 倒计时要秒级跳，rAF + setInterval 双保险（后台标签页 rAF 降频）
let tickTimer = null;
function startTick() {
  const loop = () => render(Date.now());
  loop();
  clearInterval(tickTimer);
  tickTimer = setInterval(loop, 1000);
  // rAF for progress bar smoothness — only when visible
  let last = performance.now();
  function raf(now) {
    if (document.visibilityState === 'visible' && now - last > 250) { last = now; render(Date.now()); }
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(Date.now()); });
}

// ── Boot ──
fillControls();
bindControls();
await ensureLang(state.lang);
// Apply lang dir after load
applyLayout(state.layout);
startTick();

// Expose for debug / FFmpeg automation
window.NWLive = { state, CITIES, render, applyLayout };
