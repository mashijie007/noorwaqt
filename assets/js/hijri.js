/* hijri.js — 伊历换算与节日
 *
 * 伊历换算直接用浏览器内建的乌姆库拉历（islamic-umalqura），不自己造轮子：
 * 这是沙特官方采用的计算历，也是 App 侧 hijri 包的同一基准。
 * 它是「推算历」，实际月份仍以当地新月观测为准，可能相差一天。
 *
 * 节日总表逐条移植自 App 的
 *   lib/features/islamic_calendar/domain/islamic_event_catalog.dart
 * 那边写着「新增节日只改这一处」，网站这份是它的镜像 —— 两边要一起改。
 */

const DAY = 86400e3;

const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
});

/** 某个时间戳对应的伊历年月日 */
export function hijri(ts) {
  const p = fmt.formatToParts(new Date(ts));
  const get = (t) => parseInt(p.find((x) => x.type === t).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

// 月名不在这里维护：它随语言而变，由调用方从 i18n 的 monthNames() 传进来，
// 而那份数据直接来自 App 的 hijriMonthNames —— 44 种语言两端同源。

/**
 * 伊历年度节日总表。字段与 App 的 IslamicEvent 一一对应：
 *   id / hijriMonth / hijriDay / kind / startsAtMaghribEve
 *
 * eve = true 的是「贵夜」：伊历一日自昏礼始，所以「赖哲卜月 27 夜」实际
 * 开始于公历前一天的昏礼，倒计时必须提前到那一刻，不能按当日零时算。
 */
export const EVENTS = [
  { id: 'muharram',      m: 1,  d: 1,  kind: 'newYear' },
  { id: 'ashura',        m: 1,  d: 10, kind: 'fastingDay' },
  { id: 'mawlid',        m: 3,  d: 12, kind: 'commemoration' },
  { id: 'isra_miraj',    m: 7,  d: 27, kind: 'holyNight', eve: true },
  { id: 'baraat',        m: 8,  d: 15, kind: 'holyNight', eve: true },
  { id: 'ramadan_start', m: 9,  d: 1,  kind: 'monthStart' },
  { id: 'laylat_qadr',   m: 9,  d: 27, kind: 'holyNight', eve: true },
  { id: 'eid_fitr',      m: 10, d: 1,  kind: 'eid' },
  { id: 'hajj',          m: 12, d: 8,  kind: 'hajj' },
  { id: 'arafat',        m: 12, d: 9,  kind: 'fastingDay' },
  { id: 'eid_adha',      m: 12, d: 10, kind: 'eid' },
];

/** 各类别的图标，仅用于展示 */
export const KIND_ICON = {
  newYear: '🌙', holyNight: '✨', fastingDay: '🤲',
  monthStart: '🌙', eid: '🎉', hajj: '🕋', commemoration: '📖',
};

/** 斋月是伊历九月 */
export const isRamadan = (ts) => hijri(ts).m === 9;

const KEY = (m, d) => `${m}-${d}`;
const BY_DATE = new Map(EVENTS.map((e) => [KEY(e.m, e.d), e]));

/** 某一天是否是节日；是则返回该事件 */
export const eventOn = (ts) => { const h = hijri(ts); return BY_DATE.get(KEY(h.m, h.d)) || null; };

// 逐日扫描一次就能把未来一整个伊历年的节日全部定位，
// 比每个节日各自向前找（11 × 355 次换算）快一个数量级。
let scanCache = { day: -1, list: null };

/**
 * 从 fromTs 起，按时间先后排列的节日。
 * 每项的 at 是该节日所在公历日的 UTC 零时；eve 类事件的真实起点
 * 要由调用方结合当地昏礼再往前挪（见 main.js）。
 */
export function upcoming(fromTs = Date.now(), limit = 12) {
  const day = Math.floor(fromTs / DAY);
  if (scanCache.day !== day) {
    const list = [];
    for (let i = 0; i <= 380 && list.length < EVENTS.length + 2; i++) {
      const ts = (day + i) * DAY;
      const h = hijri(ts);
      const ev = BY_DATE.get(KEY(h.m, h.d));
      if (ev) list.push({ ...ev, at: ts, hijriYear: h.y, today: i === 0 });
    }
    scanCache = { day, list };
  }
  return scanCache.list.slice(0, limit);
}

/** 当前正在进行的（今天的）节日，没有则返回 null */
export const todayEvent = (ts = Date.now()) => {
  const first = upcoming(ts, 1)[0];
  return first && first.today ? first : null;
};

// 伊历日期的写法（「伊历 1448 年 赖买丹月 9 日」还是「9 Ramadan 1448 AH」）
// 是语言问题不是历法问题，模板放在各语言的文案里，见 i18n 的 hijriDate / hijriDateShort。
// 之前写死在这里的结果是：繁体中文拿到了简体的「伊历」配上繁体的「伊歷三月」。
