/* prayer.js — 礼拜时间引擎
 *
 * 这是 NoorWaqt App 所用 `adhan_dart` 2.0.1 的忠实 JS 移植，
 * 算法出自 Jean Meeus《Astronomical Algorithms》：太阳坐标经三日插值求修正时角，
 * 而不是简化的平太阳模型。移植的目的只有一个 —— 网站算出来的时刻，
 * 必须和用户手机里那个 App 一模一样，一分钟都不能差。
 *
 * 对应的 Dart 源文件：
 *   Astronomical.dart / SolarCoordinates.dart / SolarTime.dart
 *   PrayerTimes.dart / CalculationMethod.dart / CalculationParameters.dart
 * 计算方法的地域匹配对应 lib/services/prayer_method_resolver.dart。
 *
 * 所有时刻一律以 UTC 时间戳（毫秒）返回，"此刻某城处于哪一番礼拜"因此
 * 完全不涉及时区换算。要显示当地钟点时再用 Intl + IANA 时区名格式化，
 * 夏令时交给浏览器，我们一个偏移量都不存。
 */

// ── MathUtils.dart ─────────────────────────────────────
const dtr = (d) => (d * Math.PI) / 180;
const rtd = (r) => (r * 180) / Math.PI;
const normalizeToScale = (n, max) => n - max * Math.floor(n / max);
const unwindAngle = (a) => normalizeToScale(a, 360);
/** Dart 的 round() 是「四舍五入且远离零」，与 JS 的 Math.round 在负半数上不同 */
const dartRound = (x) => (x < 0 ? -Math.round(-x) : Math.round(x));
const quadrantShiftAngle = (a) => (a >= -180 && a <= 180 ? a : a - 360 * dartRound(a / 360));

// ── Astronomical.dart ──────────────────────────────────
const meanSolarLongitude = (T) => unwindAngle(280.4664567 + 36000.76983 * T + 0.0003032 * T * T);
const meanLunarLongitude = (T) => unwindAngle(218.3165 + 481267.8813 * T);
const ascendingLunarNodeLongitude = (T) =>
  unwindAngle(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000);
const meanSolarAnomaly = (T) => unwindAngle(357.52911 + 35999.05029 * T - 0.0001537 * T * T);

function solarEquationOfTheCenter(T, meanAnomaly) {
  const m = dtr(meanAnomaly);
  return (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(m)
       + (0.019993 - 0.000101 * T) * Math.sin(2 * m)
       + 0.000289 * Math.sin(3 * m);
}

function apparentSolarLongitude(T, l0) {
  const longitude = l0 + solarEquationOfTheCenter(T, meanSolarAnomaly(T));
  const omega = 125.04 - 1934.136 * T;
  return unwindAngle(longitude - 0.00569 - 0.00478 * Math.sin(dtr(omega)));
}

const meanObliquityOfTheEcliptic = (T) =>
  23.439291 - 0.013004167 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T;

const apparentObliquityOfTheEcliptic = (T, e0) =>
  e0 + 0.00256 * Math.cos(dtr(125.04 - 1934.136 * T));

function meanSiderealTime(T) {
  const jd = T * 36525 + 2451545.0;
  return unwindAngle(
    280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000
  );
}

function nutationInLongitude(l0, lp, omega) {
  return (-17.2 / 3600) * Math.sin(dtr(omega))
       - (1.32 / 3600) * Math.sin(2 * dtr(l0))
       - (0.23 / 3600) * Math.sin(2 * dtr(lp))
       + (0.21 / 3600) * Math.sin(2 * dtr(omega));
}

function nutationInObliquity(l0, lp, omega) {
  return (9.2 / 3600) * Math.cos(dtr(omega))
       + (0.57 / 3600) * Math.cos(2 * dtr(l0))
       + (0.10 / 3600) * Math.cos(2 * dtr(lp))
       - (0.09 / 3600) * Math.cos(2 * dtr(omega));
}

function altitudeOfCelestialBody(phi, delta, H) {
  return rtd(Math.asin(
    Math.sin(dtr(phi)) * Math.sin(dtr(delta)) +
    Math.cos(dtr(phi)) * Math.cos(dtr(delta)) * Math.cos(dtr(H))
  ));
}

const approximateTransit = (L, theta0, a2) => normalizeToScale((a2 + -L - theta0) / 360, 1);

function interpolate(y2, y1, y3, n) {
  const a = y2 - y1, b = y3 - y2, c = b - a;
  return y2 + (n / 2) * (a + b + n * c);
}
function interpolateAngles(y2, y1, y3, n) {
  const a = unwindAngle(y2 - y1), b = unwindAngle(y3 - y2), c = b - a;
  return y2 + (n / 2) * (a + b + n * c);
}

function julianDay(year, month, day, hours = 0) {
  const Y = Math.trunc(month > 2 ? year : year - 1);
  const M = Math.trunc(month > 2 ? month : month + 12);
  const Dd = day + hours / 24;
  const A = Math.trunc(Y / 100);
  const B = Math.trunc(2 - A + Math.trunc(A / 4));
  return Math.trunc(365.25 * (Y + 4716)) + Math.trunc(30.6001 * (M + 1)) + Dd + B - 1524.5;
}
const julianCentury = (jd) => (jd - 2451545.0) / 36525;

// ── SolarCoordinates.dart ──────────────────────────────
function solarCoordinates(jd) {
  const T = julianCentury(jd);
  const l0 = meanSolarLongitude(T);
  const lp = meanLunarLongitude(T);
  const omega = ascendingLunarNodeLongitude(T);
  const lambda = dtr(apparentSolarLongitude(T, l0));
  const theta0 = meanSiderealTime(T);
  const dPsi = nutationInLongitude(l0, lp, omega);
  const dEpsilon = nutationInObliquity(l0, lp, omega);
  const epsilon0 = meanObliquityOfTheEcliptic(T);
  const epsilonApparent = dtr(apparentObliquityOfTheEcliptic(T, epsilon0));

  return {
    declination: rtd(Math.asin(Math.sin(epsilonApparent) * Math.sin(lambda))),
    rightAscension: unwindAngle(rtd(Math.atan2(
      Math.cos(epsilonApparent) * Math.sin(lambda), Math.cos(lambda)
    ))),
    apparentSiderealTime:
      theta0 + ((dPsi * 3600) * Math.cos(dtr(epsilon0 + dEpsilon))) / 3600,
  };
}

// 太阳坐标只跟儒略日有关，与地点无关 —— 152 座城市共享同一份缓存，
// 一次刷新下来真正需要计算的只有五六个儒略日。
const SC_CACHE = new Map();
function solarCoordinatesCached(jd) {
  let v = SC_CACHE.get(jd);
  if (!v) {
    if (SC_CACHE.size > 512) SC_CACHE.clear();
    v = solarCoordinates(jd);
    SC_CACHE.set(jd, v);
  }
  return v;
}

function correctedTransit(m0, L, theta0, a2, a1, a3) {
  const theta = unwindAngle(theta0 + 360.985647 * m0);
  const a = unwindAngle(interpolateAngles(a2, a1, a3, m0));
  const H = quadrantShiftAngle(theta - -L - a);
  return (m0 + H / -360) * 24;
}

function correctedHourAngle(m0, h02, lat, lon, afterTransit, theta0, a2, a1, a3, d2, d1, d3) {
  const lw = -lon;
  const term1 = Math.sin(dtr(h02)) - Math.sin(dtr(lat)) * Math.sin(dtr(d2));
  const term2 = Math.cos(dtr(lat)) * Math.cos(dtr(d2));
  // 极区守卫：太阳根本达不到该高度时，adhan 退回 1.0 度而不是产生 NaN。
  // 这是原库的行为，必须原样保留，否则两端结果会分叉。
  const h021 = Math.abs(term1 / term2) > 1 ? 1.0 : rtd(Math.acos(term1 / term2));

  const m = afterTransit ? m0 + h021 / 360 : m0 - h021 / 360;
  const theta = unwindAngle(theta0 + 360.985647 * m);
  const a = unwindAngle(interpolateAngles(a2, a1, a3, m));
  const delta = interpolate(d2, d1, d3, m);
  const H = theta - lw - a;
  const h = altitudeOfCelestialBody(lat, delta, H);
  const dm = (h - h02) / (360 * Math.cos(dtr(delta)) * Math.cos(dtr(lat)) * Math.sin(dtr(H)));
  return (m + dm) * 24;
}

// ── SolarTime.dart ─────────────────────────────────────
const SUN_ALTITUDE = -50 / 60;   // 日出日落：太阳视半径 + 大气折射

function solarTime(year, month, day, lat, lon) {
  const jd = julianDay(year, month, day, 0);
  const solar = solarCoordinatesCached(jd);
  const prev = solarCoordinatesCached(jd - 1);
  const next = solarCoordinatesCached(jd + 1);
  const m0 = approximateTransit(lon, solar.apparentSiderealTime, solar.rightAscension);

  const hourAngle = (angle, afterTransit) => correctedHourAngle(
    m0, angle, lat, lon, afterTransit,
    solar.apparentSiderealTime, solar.rightAscension, prev.rightAscension, next.rightAscension,
    solar.declination, prev.declination, next.declination
  );

  return {
    transit: correctedTransit(m0, lon, solar.apparentSiderealTime,
      solar.rightAscension, prev.rightAscension, next.rightAscension),
    sunrise: hourAngle(SUN_ALTITUDE, false),
    sunset: hourAngle(SUN_ALTITUDE, true),
    hourAngle,
    /** 晡礼：影长等于物高的 shadowLength 倍加上正午影长时 */
    afternoon(shadowLength) {
      const tangent = Math.abs(lat - solar.declination);
      const inverse = shadowLength + Math.tan(dtr(tangent));
      return hourAngle(rtd(Math.atan(1.0 / inverse)), true);
    },
  };
}

// ── TimeComponents.dart / DateUtils.dart ───────────────
function utcFromHours(hours, y, m, d) {
  if (!isFinite(hours)) return NaN;
  const h = Math.floor(hours);
  const mi = Math.floor((hours - h) * 60);
  const s = Math.floor((hours - (h + mi / 60)) * 3600);
  return Date.UTC(y, m - 1, d, h, mi, s);   // Date.UTC 会自然处理 h 越界或为负
}

/** adhan 默认四舍五入到整分钟，App 显示的就是这个结果 */
function roundedMinute(ts, rounding = 'nearest') {
  if (!isFinite(ts)) return NaN;
  if (rounding === 'none') return ts;
  const sec = new Date(ts).getUTCSeconds() % 60;
  const offset = rounding === 'up'
    ? (sec > 0 ? 60 - sec : 0)
    : (sec >= 30 ? 60 - sec : -sec);
  return ts + offset * 1000;
}

// ── CalculationMethod.dart ─────────────────────────────
// 数值与 adhan_dart 的 CalculationMethodParameters 逐项对齐，
// 包括各方法自带的分钟级修正（methodAdjustments）。
const A0 = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
const mk = (fajrAngle, ishaAngle, extra = {}) => ({
  fajrAngle, ishaAngle, ishaInterval: 0, maghribAngle: null, rounding: 'nearest',
  ...extra,
  adj: { ...A0, ...(extra.adj || {}) },
});

export const METHODS = {
  MWL:          mk(18, 17,   { adj: { dhuhr: 1 } }),
  Egyptian:     mk(19.5, 17.5, { adj: { dhuhr: 1 } }),
  Karachi:      mk(18, 18,   { adj: { dhuhr: 1 } }),
  NorthAmerica: mk(15, 15,   { adj: { dhuhr: 1 } }),
  UmmAlQura:    mk(18.5, 0,  { ishaInterval: 90 }),
  Dubai:        mk(18.2, 18.2, { adj: { sunrise: -3, dhuhr: 3, asr: 3, maghrib: 3 } }),
  Qatar:        mk(18, 0,    { ishaInterval: 90 }),
  Kuwait:       mk(18, 17.5),
  Tehran:       mk(17.7, 14, { maghribAngle: 4.5 }),
  Jafari:       mk(16, 14,   { maghribAngle: 4 }),
  Turkiye:      mk(18, 17,   { adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } }),
  Singapore:    mk(20, 18,   { adj: { dhuhr: 1 }, rounding: 'up' }),
  Indonesian:   mk(20, 18,   { adj: { dhuhr: 1 } }),
  Russia:       mk(16, 15),
  Morocco:      mk(19, 17,   { adj: { sunrise: -3, dhuhr: 5, maghrib: 5 } }),
  Algerian:     mk(18, 17),
  Tunisia:      mk(18, 18),
  Jordan:       mk(18, 18,   { adj: { maghrib: 5 } }),
  France:       mk(12, 12),
  Portugal:     mk(18, 0,    { ishaInterval: 77, adj: { maghrib: 3 } }),
};

export const METHOD_LABEL = {
  MWL:          { zh: '世界穆斯林联盟', en: 'Muslim World League', ar: 'رابطة العالم الإسلامي' },
  Egyptian:     { zh: '埃及测量总局', en: 'Egyptian Authority of Survey', ar: 'الهيئة المصرية العامة للمساحة' },
  Karachi:      { zh: '卡拉奇伊斯兰科学大学', en: 'University of Islamic Sciences, Karachi', ar: 'جامعة العلوم الإسلامية بكراتشي' },
  NorthAmerica: { zh: '北美伊斯兰协会', en: 'ISNA (North America)', ar: 'الجمعية الإسلامية لأمريكا الشمالية' },
  UmmAlQura:    { zh: '乌姆库拉大学', en: 'Umm al-Qura', ar: 'جامعة أم القرى' },
  Dubai:        { zh: '阿联酋（迪拜）', en: 'Dubai', ar: 'دبي' },
  Qatar:        { zh: '卡塔尔', en: 'Qatar', ar: 'قطر' },
  Kuwait:       { zh: '科威特', en: 'Kuwait', ar: 'الكويت' },
  Tehran:       { zh: '德黑兰地球物理研究所', en: 'Institute of Geophysics, Tehran', ar: 'معهد الجيوفيزياء بطهران' },
  Turkiye:      { zh: '土耳其宗教事务局', en: 'Diyanet (Türkiye)', ar: 'رئاسة الشؤون الدينية التركية' },
  Singapore:    { zh: '新加坡 MUIS', en: 'Singapore (MUIS)', ar: 'سنغافورة' },
  Indonesian:   { zh: '印度尼西亚宗教部', en: 'Indonesia (KEMENAG)', ar: 'وزارة الشؤون الدينية الإندونيسية' },
  Morocco:      { zh: '摩洛哥宗教基金与伊斯兰事务部', en: 'Morocco', ar: 'وزارة الأوقاف والشؤون الإسلامية المغربية' },
  Algerian:     { zh: '阿尔及利亚宗教事务与宗教基金部', en: 'Algerian Ministry of Religious Affairs', ar: 'وزارة الشؤون الدينية والأوقاف الجزائرية' },
  Tunisia:      { zh: '突尼斯宗教事务部', en: 'Tunisia', ar: 'وزارة الشؤون الدينية التونسية' },
  Jordan:       { zh: '约旦宗教基金部', en: 'Jordan', ar: 'وزارة الأوقاف الأردنية' },
  Russia:       { zh: '俄罗斯穆斯林宗教事务管理局', en: 'Russia (Spiritual Administration of Muslims)', ar: 'الإدارة الدينية لمسلمي روسيا' },
  France:       { zh: '法国伊斯兰组织联盟（UOIF）', en: 'Union des Organisations Islamiques de France (UOIF)', ar: 'اتحاد المنظمات الإسلامية في فرنسا' },
  Portugal:     { zh: '葡萄牙伊斯兰社群', en: 'Portugal (Islamic Community of Lisbon)', ar: 'الجالية الإسلامية في البرتغال' },
  Jafari:       { zh: '贾法里学派', en: 'Ja\'fari', ar: 'الجعفري' },
};

/**
 * 按坐标匹配当地惯用的计算方法。
 * 这张表逐条对应 App 的 lib/services/prayer_method_resolver.dart 的 _regions，
 * 行序与数值都一致（[key, minLat, maxLat, minLon, maxLon]，对应 Dart 那边的
 * _GeoRegion 构造参数顺序）。改动务必两边同步 —— 行尾注释即 Dart 侧的 label。
 *
 * 顺序有实质含义：包围盒互相重叠时靠前者胜出，小国须早于邻近的大国。
 * 每条为何这样切、代价是什么，理由都写在 App 那份表里，此处只留排序要点。
 * 边界为矩形近似，贴不住真实国界；交界地带落到邻国算法是可接受的，
 * 因为这只是默认值，App 里可手动改，站点上也标明了用的是哪种算法。
 */
const REGIONS = [
  // 海湾小国：精确匹配优先，须早于沙特的大框
  ['Qatar',        24.4,  26.3,   50.6,  51.8],  // 卡塔尔
  ['Kuwait',       28.5,  30.5,   46.5,  49.0],  // 科威特
  ['Dubai',        22.6,  26.2,   51.5,  57.0],  // 阿联酋（迪拜）

  // 伊拉克、巴勒斯坦本地通行 MWL，须早于伊朗框、约旦框与沙特大框
  ['MWL',          29.1,  37.4,   38.8,  48.5],  // 伊拉克
  ['MWL',          31.2,  32.6,   34.2,  35.5],  // 巴勒斯坦
  ['Jordan',       29.1,  33.4,   34.9,  39.3],  // 约旦（须早于沙特大框）

  // 沙特 / 阿拉伯半岛：阿曼、也门、巴林一并落入
  ['UmmAlQura',    12.0,  33.0,   34.0,  60.0],  // 沙特阿拉伯
  ['Egyptian',     22.0,  31.9,   24.5,  37.0],  // 埃及

  // 马格里布：突尼斯、摩洛哥须早于阿尔及利亚，三者包围盒有重叠
  ['Tunisia',      30.2,  37.6,    7.5,  11.6],  // 突尼斯
  ['Morocco',      20.7,  36.0,  -17.1,  -1.0],  // 摩洛哥 / 西撒哈拉
  ['Algerian',     18.9,  37.1,   -8.7,  12.0],  // 阿尔及利亚

  ['Tehran',       25.0,  39.8,   44.0,  63.0],  // 伊朗
  ['Turkiye',      36.0,  42.5,   25.5,  45.0],  // 土耳其

  // 东南亚：印尼 KEMENAG 与马来西亚 JAKIM / 新加坡 MUIS 同为 20°/18°，
  // 故两框在婆罗洲的重叠不影响结果。须早于南亚框——南亚框东界 97°E
  // 会盖住苏门答腊北端的亚齐，那里若拿到 18°/18° 晨礼要晚约 8 分钟。
  ['Singapore',     0.8,   7.5,   99.5, 105.5],  // 马来半岛 / 新加坡
  ['Singapore',     0.8,   7.5,  109.5, 119.5],  // 东马 / 文莱
  ['Indonesian',  -11.5,   6.5,   94.5, 141.5],  // 印度尼西亚

  // 南疆须早于南亚框：下面的中国框排在南亚框之后，和田、莎车一带
  // 会先被南亚框吞掉。南界取 36°，再往南就压到拉达克。
  ['MWL',          36.0,  38.5,   73.5,  97.0],  // 南疆
  ['Karachi',       5.0,  38.5,   60.5,  97.0],  // 南亚次大陆

  ['NorthAmerica', 24.0,  60.0, -141.0, -52.0],  // 北美（含加拿大全境）

  // 西欧：西班牙北部落在法国框内，须先拦截（西班牙通行 MWL，非法国的 12°/12°）
  ['MWL',          42.5,  43.8,   -5.0,  -1.0],  // 西班牙北部
  ['France',       41.3,  51.1,   -5.2,   9.6],  // 法国
  ['Portugal',     36.9,  42.2,   -9.6,  -6.1],  // 葡萄牙

  // 俄罗斯远东须早于中国框：中国框东界 135.1°，会把符拉迪沃斯托克、
  // 哈巴罗夫斯克一并吞成 MWL
  ['Russia',       42.3,  48.6,  130.6, 136.0],  // 俄罗斯远东

  // 以下几框明示回落 MWL：当地无官方统一算法，主流应用默认 MWL。
  // 写成显式条目而非任其落到兜底，是为了挡住排在最后的俄罗斯大框。
  ['MWL',          17.5,  53.6,   73.5, 135.1],  // 中国
  ['MWL',          30.0,  46.0,  124.5, 146.5],  // 日本 / 朝鲜半岛
  ['MWL',          35.0,  52.0,   50.5,  87.5],  // 中亚（北界 52° 以让出乌法、喀山；西界 50.5° 以让出达吉斯坦）
  ['MWL',          39.8,  41.95,  44.5,  50.5],  // 外高加索

  // 俄罗斯：西界取 27.3° 的实际国界，不能用经度一路west到东欧——
  // 否则巴尔干、波罗的海连同阿尔巴尼亚、科索沃都会拿到俄式 16°/15°
  ['Russia',       54.3,  55.4,   19.6,  22.9],  // 加里宁格勒（飞地，单列）
  ['Russia',       41.2,  78.0,   27.3, 180.0],  // 俄罗斯
];

export function resolveMethod(lat, lon) {
  for (const [name, minLat, maxLat, minLon, maxLon] of REGIONS) {
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) return name;
  }
  return 'MWL';
}

// ── PrayerTimes.dart ───────────────────────────────────
const DAY = 86400e3;
const MIN = 60e3;

/**
 * 某个日历日、某个坐标的六个时刻，返回 UTC 时间戳。
 * 高纬度规则用 adhan 的默认值 middleOfTheNight（夜长的二分之一），
 * 因为 App 没有覆写它 —— 这一点必须跟着 App 走。
 */
export function prayerTimes(year, month, day, lat, lon, methodKey = 'MWL', shadowLength = 1) {
  const p = METHODS[methodKey] || METHODS.MWL;

  const d0 = Date.UTC(year, month - 1, day);
  const before = new Date(d0 - DAY), after = new Date(d0 + DAY);
  const [by, bm, bd] = [before.getUTCFullYear(), before.getUTCMonth() + 1, before.getUTCDate()];
  const [ay, am, ad] = [after.getUTCFullYear(), after.getUTCMonth() + 1, after.getUTCDate()];

  const st = solarTime(year, month, day, lat, lon);
  const stBefore = solarTime(by, bm, bd, lat, lon);
  const stAfter = solarTime(ay, am, ad, lat, lon);

  const dhuhrTime = utcFromHours(st.transit, year, month, day);
  const sunriseTime = utcFromHours(st.sunrise, year, month, day);
  const sunsetTime = utcFromHours(st.sunset, year, month, day);
  const sunsetBefore = utcFromHours(stBefore.sunset, by, bm, bd);
  const asrTime = utcFromHours(st.afternoon(shadowLength), year, month, day);

  // 夜长定义为「今日日落 → 明日日出」，高纬度回退按它切分
  const tomorrowSunrise = utcFromHours(stAfter.sunrise, ay, am, ad);
  const night = (tomorrowSunrise - sunsetTime) / 1000;

  // 默认高纬度规则 middleOfTheNight → 晨礼与宵礼各取夜长的一半
  const portion = 0.5;
  const nightFraction = portion * night;

  let fajrTime = utcFromHours(st.hourAngle(-p.fajrAngle, false), year, month, day);
  const safeFajr = sunriseTime - dartRound(nightFraction) * 1000;
  if (!isFinite(fajrTime) || safeFajr > fajrTime) fajrTime = safeFajr;

  let ishaTime;
  if (p.ishaInterval > 0) {
    ishaTime = sunsetTime + p.ishaInterval * MIN;
  } else {
    ishaTime = utcFromHours(st.hourAngle(-p.ishaAngle, true), year, month, day);
    const safeIsha = sunsetTime + dartRound(nightFraction) * 1000;
    if (!isFinite(ishaTime) || safeIsha < ishaTime) ishaTime = safeIsha;
  }

  let maghribTime = sunsetTime;
  if (p.maghribAngle != null) {
    const angleBased = utcFromHours(st.hourAngle(-p.maghribAngle, true), year, month, day);
    if (sunsetTime < angleBased && ishaTime > angleBased) maghribTime = angleBased;
  }

  const r = p.rounding;
  const adj = p.adj;
  return {
    fajr:    roundedMinute(fajrTime + adj.fajr * MIN, r),
    sunrise: roundedMinute(sunriseTime + adj.sunrise * MIN, r),
    dhuhr:   roundedMinute(dhuhrTime + adj.dhuhr * MIN, r),
    asr:     roundedMinute(asrTime + adj.asr * MIN, r),
    maghrib: roundedMinute(maghribTime + adj.maghrib * MIN, r),
    isha:    roundedMinute(ishaTime + adj.isha * MIN, r),
    _sunsetBefore: sunsetBefore,
  };
}

// ── 网站自己的一层：连续时刻序列与状态 ──────────────────
/** 一天中依次出现的六个节点。sunrise 不是礼拜，是晨礼窗口的终点 */
export const SLOTS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
/** 五番拜（日出到晌礼之间是杜哈时段，不属于任何一番） */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const TL_CACHE = new Map();

/**
 * 某地在 now 前后连续的时刻序列（覆盖前一天到后一天）。
 * 跨时区、跨日、夏令时全部被「绝对时间戳」这一层自然吸收。
 */
export function timeline(city, now, shadowLength = 1) {
  const dayIndex = Math.floor(now / DAY);
  const key = `${city.lat},${city.lon},${dayIndex},${shadowLength},${city.method}`;
  const hit = TL_CACHE.get(key);
  if (hit) return hit;

  const out = [];
  for (let k = -1; k <= 1; k++) {
    const d = new Date((dayIndex + k) * DAY);
    const t = prayerTimes(
      d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
      city.lat, city.lon, city.method, shadowLength
    );
    for (const s of SLOTS) if (isFinite(t[s])) out.push({ name: s, at: t[s] });
  }
  out.sort((a, b) => a.at - b.at);
  // 相邻日的窗口可能给出重复节点，去掉挨得太近的
  const dedup = out.filter((e, i) => i === 0 || e.at - out[i - 1].at > 1000 || e.name !== out[i - 1].name);

  if (TL_CACHE.size > 900) TL_CACHE.clear();
  TL_CACHE.set(key, dedup);
  return dedup;
}

/**
 * 某城此刻的状态。
 * current 为 null 表示处于日出到晌礼之间的杜哈时段 —— 地图上这段不点亮。
 */
export function stateAt(city, now, shadowLength = 1) {
  const tl = timeline(city, now, shadowLength);
  let i = -1;
  for (let k = 0; k < tl.length; k++) { if (tl[k].at <= now) i = k; else break; }
  if (i < 0) return { current: null, since: 0, next: tl[0] || null, untilNext: tl[0] ? tl[0].at - now : null };
  const ev = tl[i];
  const next = tl[i + 1] || null;
  return {
    current: ev.name === 'sunrise' ? null : ev.name,
    since: now - ev.at,
    windowEnd: next ? next.at : null,
    next,
    untilNext: next ? next.at - now : null,
  };
}

/** 某城「当地今天」的五番时刻（含日出），键为名称、值为 UTC 时间戳 */
export function todayFor(city, now, shadowLength = 1) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: city.tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const localToday = fmt.format(new Date(now));
  const out = {};
  for (const ev of timeline(city, now, shadowLength)) {
    if (fmt.format(new Date(ev.at)) === localToday && out[ev.name] == null) out[ev.name] = ev.at;
  }
  return out;
}

/** 用城市所在时区把时间戳格式化为当地钟点 */
export function localClock(ts, tz, locale = 'en-GB') {
  if (ts == null || !isFinite(ts)) return '--:--';
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(ts));
}

/** 太阳直射点，用于地球的昼夜晨昏线 */
export function subsolarPoint(now) {
  const d = new Date(now);
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const jd = julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hours);
  const sc = solarCoordinates(jd);
  // 格林尼治时角 = 视恒星时 − 赤经；直射点经度是它的相反数
  const lon = quadrantShiftAngle(unwindAngle(-(sc.apparentSiderealTime - sc.rightAscension)));
  return { lat: sc.declination, lon };
}

/** 斋戒窗口：从晨礼到昏礼。返回进度与到开斋的剩余时间 */
export function fastingAt(city, now, shadowLength = 1) {
  const tl = timeline(city, now, shadowLength);
  for (let i = 0; i < tl.length - 1; i++) {
    if (tl[i].name !== 'fajr') continue;
    const start = tl[i].at;
    const end = tl.slice(i + 1).find((e) => e.name === 'maghrib');
    if (!end) continue;
    if (now >= start && now < end.at) {
      return {
        fasting: true, start, end: end.at,
        progress: (now - start) / (end.at - start),
        untilIftar: end.at - now,
      };
    }
  }
  const nextFajr = tl.find((e) => e.name === 'fajr' && e.at > now);
  return {
    fasting: false,
    nextFajr: nextFajr ? nextFajr.at : null,
    untilSuhoorEnd: nextFajr ? nextFajr.at - now : null,
  };
}
