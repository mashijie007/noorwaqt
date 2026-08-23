/* build-locales.mjs — 生成 assets/locales/*.json
 *
 * 数据来自两处：
 *   1. App 的 lib/l10n/app_<code>.arb —— 礼拜名、伊历月名、节日名。
 *      这些是已有的专业翻译，直接复用，保证网站和 App 说法一致。
 *   2. tools/translations/<code>.json —— 网站自有文案（首屏、各段落）。
 *
 * App 那边的 ARB 一旦更新，重跑本脚本即可：
 *   node tools/build-locales.mjs [../ddd]
 *
 * 缺失的键在运行时回落到英文（见 i18n.js），所以某个语言没翻完也不会开天窗。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const APP = resolve(ROOT, process.argv[2] || '../ddd');
const L10N = resolve(APP, 'lib/l10n');
const OUT = resolve(ROOT, 'assets/locales');
const TRANS = resolve(HERE, 'translations');

if (!existsSync(L10N)) {
  console.error(`找不到 App 的 l10n 目录: ${L10N}\n用法: node tools/build-locales.mjs <app 仓库路径>`);
  process.exit(1);
}

/** 网站键 → App ARB 键 */
const FROM_APP = {
  prayer_fajr: 'prayerFajr',
  prayer_dhuhr: 'prayerDhuhr',
  prayer_asr: 'prayerAsr',
  prayer_maghrib: 'prayerMaghrib',
  prayer_isha: 'prayerIsha',
  prayer_sunrise: 'homeSunrise',
  ev_muharram: 'holidayMuharram',
  ev_ashura: 'holidayAshura',
  ev_mawlid: 'holidayMawlid',
  ev_isra_miraj: 'holidayIsraMiraj',
  ev_baraat: 'holidayBaraat',
  ev_ramadan_start: 'holidayRamadanStart',
  ev_laylat_qadr: 'holidayLaylatQadr',
  ev_eid_fitr: 'holidayEidFitr',
  ev_hajj: 'holidayHajj',
  ev_arafat: 'holidayArafat',
  ev_eid_adha: 'holidayEidAdha',
};

/* Intl.DisplayNames 对少数语言给不出母语名，会悄悄回落成运行环境的语言。
   这几个手工写死，免得语言选择器里冒出一个中文的「索宁克语」。 */
const ENDONYM = {
  snk: 'Sooninkanxanne',
  zh: '中文',
  zh_Hant: '繁體中文',
  cnr: 'crnogorski',
};

const locales = readdirSync(L10N).filter((f) => f.endsWith('.arb'))
  .map((f) => f.replace(/^app_|\.arb$/g, '')).sort();

mkdirSync(OUT, { recursive: true });

const report = [];
for (const loc of locales) {
  const arb = JSON.parse(readFileSync(`${L10N}/app_${loc}.arb`, 'utf8'));
  const out = {};

  for (const [webKey, appKey] of Object.entries(FROM_APP)) {
    const v = arb[appKey];
    if (typeof v === 'string' && v.trim()) out[webKey] = v.trim();
  }

  const months = String(arb.hijriMonthNames || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (months.length === 12) out.months = months;

  // 网站自有文案覆盖在上面（同名键以站点翻译为准）
  const tf = `${TRANS}/${loc}.json`;
  let own = 0;
  if (existsSync(tf)) {
    const t = JSON.parse(readFileSync(tf, 'utf8'));
    for (const [k, v] of Object.entries(t)) {
      if (typeof v === 'string' && v.trim()) { out[k] = v; own++; }
      else if (Array.isArray(v)) { out[k] = v; own++; }
    }
  }

  writeFileSync(`${OUT}/${loc}.json`, JSON.stringify(out, null, 1) + '\n');
  report.push({ loc, fromApp: Object.keys(FROM_APP).filter((k) => out[k]).length, months: months.length, own, total: Object.keys(out).length });
}

// ── 同时生成 assets/js/locale-data.js ──────────────────
// 里面两样东西必须同步可用、不能等网络：
//   LOCALES —— 语言清单（母语名、书写方向），语言选择器要用
//   EN      —— 英文基线，任何语言缺键时的兜底。必须同步，
//              否则网络慢的时候页面会先空一片再补上文字。
const meta = [];
for (const loc of locales) {
  const bcp = loc.replace('_', '-');
  const arb = JSON.parse(readFileSync(`${L10N}/app_${loc}.arb`, 'utf8'));
  const sample = ['prayerFajr', 'holidayEidFitr', 'homeSunrise'].map((k) => arb[k] || '').join('');
  let arabic = 0, letters = 0;
  for (const ch of sample) {
    if (/\s/.test(ch)) continue;
    letters++;
    const c = ch.codePointAt(0);
    if ((c >= 0x0600 && c <= 0x06ff) || (c >= 0x0750 && c <= 0x077f) ||
        (c >= 0xfb50 && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff)) arabic++;
  }
  const dir = letters && arabic > letters * 0.5 ? 'rtl' : 'ltr';
  let name = ENDONYM[loc];
  if (!name) {
    try { name = new Intl.DisplayNames([bcp], { type: 'language' }).of(bcp); } catch { name = bcp; }
  }
  meta.push({ code: loc, dir, name });
}

const en = JSON.parse(readFileSync(`${OUT}/en.json`, 'utf8'));
writeFileSync(resolve(ROOT, 'assets/js/locale-data.js'),
  '/* locale-data.js —— 由 tools/build-locales.mjs 生成，请勿手改。\n' +
  ' * LOCALES: 语言清单（与 App 的 lib/l10n 一一对应）\n' +
  ' * EN:      英文基线，作为所有语言的同步兜底\n */\n' +
  'export const LOCALES = ' + JSON.stringify(meta, null, 1) + ';\n\n' +
  'export const EN = ' + JSON.stringify(en, null, 1) + ';\n');

const w = (s, n) => String(s).padEnd(n);
console.log(w('locale', 9) + w('app词汇', 9) + w('月名', 6) + w('站点文案', 10) + w('总计', 7) + 'dir');
for (const r of report) {
  const m = meta.find((x) => x.code === r.loc);
  console.log(w(r.loc, 9) + w(r.fromApp + '/17', 9) + w(r.months, 6) + w(r.own, 10) + w(r.total, 7) + m.dir + '  ' + m.name);
}
console.log(`\n已生成 ${report.length} 个语言文件 → assets/locales/`);
console.log('已生成 assets/js/locale-data.js（语言清单 + 英文基线）');
const thin = report.filter((r) => r.own === 0).map((r) => r.loc);
if (thin.length) console.log(`\n尚无站点文案、暂时回落英文的语言（${thin.length}）: ` + thin.join(' '));
