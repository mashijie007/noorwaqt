/* city-page.js —— 城市礼拜时间页的客户端部分
 *
 * 页面本身是构建期算好的静态 HTML：爬虫不跑 JS 也能拿到完整内容，
 * 这是这批页面存在的意义，不能交给客户端渲染。
 *
 * 但静态页有个天然缺陷 —— 它停在构建那一天。构建每天跑一次，
 * 用户仍可能在缓存里拿到隔天的版本，跨月时整张时刻表都会是上个月的。
 * 所以这里做一件事：拿页面里嵌的坐标重算一遍，跟构建日对不上就就地刷新。
 * 算的是同一个 prayer.js，结果和构建期逐位一致。
 */
import { prayerTimes, localClock, stateAt, SLOTS } from './prayer.js';
import { LOCALES, isSupported } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const dataEl = $('#pt-data');
if (dataEl) init(JSON.parse(dataEl.textContent));

function init(city) {
  buildLangPicker();
  refreshIfStale(city);
  markCurrentPrayer(city);
}

/** 语言选择器。换语言就是换地址 —— 地址表由构建期注入 */
function buildLangPicker() {
  const sel = $('#lang');
  if (!sel) return;

  const here = document.documentElement.dataset.locale;
  sel.innerHTML = LOCALES
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => `<option value="${l.code}">${l.name}</option>`)
    .join('');
  if (isSupported(here)) sel.value = here;

  sel.addEventListener('change', (e) => {
    const href = window.NW_LANG_HREF?.[e.target.value];
    if (href) location.href = href;
  });
}

/** 城市当地的今天 */
function localYMD(tz, at = Date.now()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(at)).split('-').map(Number);
  return { y, m, d };
}

/** Intl 不认识全部 44 种语言，不认识就明确用英文，别让它悄悄回落到浏览器语言 */
function intlLocale(tag) {
  try { return Intl.NumberFormat.supportedLocalesOf(tag).length ? tag : 'en'; } catch { return 'en'; }
}

function refreshIfStale(city) {
  const { y, m, d } = localYMD(city.tz);
  const todayKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (todayKey === city.builtFor) return;   // 构建就是今天，静态内容已经是对的

  const loc = intlLocale(document.documentElement.lang || 'en');
  const clock = (ts) => localClock(ts, city.tz, loc);
  const t = prayerTimes(y, m, d, city.lat, city.lon, city.method, 1);

  for (const slot of SLOTS) {
    const el = $(`[data-time="${slot}"]`);
    if (el) el.textContent = clock(t[slot]);
  }

  const dateEl = $('#pt-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat(loc, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(Date.UTC(y, m - 1, d));
  }

  const [by, bm] = city.builtFor.split('-').map(Number);
  if (by !== y || bm !== m) rebuildTable(city, y, m, loc, clock);
  highlightToday(d);
}

/** 跨月了：整张表都是上个月的，重画 */
function rebuildTable(city, y, m, loc, clock) {
  const body = $('.pt-table tbody');
  if (!body) return;

  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const wd = new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' });
  const nf = new Intl.NumberFormat(loc);

  let rows = '';
  for (let i = 1; i <= days; i++) {
    const t = prayerTimes(y, m, i, city.lat, city.lon, city.method, 1);
    rows += `<tr data-day="${i}"><td>${nf.format(i)} ${wd.format(Date.UTC(y, m - 1, i))}</td>`
      + SLOTS.map((s) => `<td>${clock(t[s])}</td>`).join('') + '</tr>';
  }
  body.innerHTML = rows;

  // 标题模板是各语言自己的（「8 月时刻表」/「Calendrier de août」），
  // 这里只把里面的月份名换掉，不去猜整句的结构
  const heading = $('.pt-table-wrap')?.closest('.pt-section')?.querySelector('h2');
  if (heading) {
    const monthOf = (yy, mm) =>
      new Intl.DateTimeFormat(loc, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(yy, mm - 1, 1));
    const [by, bm] = city.builtFor.split('-').map(Number);
    heading.textContent = heading.textContent.replace(monthOf(by, bm), monthOf(y, m));
  }
}

function highlightToday(d) {
  for (const tr of $$('.pt-table tbody tr')) {
    tr.classList.toggle('is-today', Number(tr.dataset.day) === d);
  }
}

/** 给此刻正处在窗口内的那番拜加个标记，页面一打开就知道现在是哪一番 */
function markCurrentPrayer(city) {
  const st = stateAt({ lat: city.lat, lon: city.lon, tz: city.tz, method: city.method }, Date.now(), 1);
  for (const el of $$('.pt-time')) el.classList.remove('is-now');
  if (!st.current) return;
  const el = $(`.pt-time[data-slot="${st.current}"]`);
  if (el) {
    el.classList.add('is-now');
    el.setAttribute('aria-current', 'true');
  }
}
