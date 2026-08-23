/* i18n.js — 多语言
 *
 * 站点支持的语言与 App 完全一致（44 种）。语言清单和英文基线由
 * tools/build-locales.mjs 从 App 的 lib/l10n 生成到 locale-data.js。
 *
 * 44 种语言全部内联会让首屏白白背上几百 KB，所以只有英文基线是同步内置的，
 * 其余按需去 assets/locales/<code>.json 取。任何一个键缺失都会回落到英文，
 * 因此某种语言没翻完只是少几句文案，不会开天窗。
 *
 * 阿拉伯字母系的语言走 RTL，由 <html dir> 驱动，CSS 用逻辑属性自动镜像。
 */
import { LOCALES, EN } from './locale-data.js';

export { LOCALES, EN };

/** 已加载的语言词典；英文是同步就位的兜底 */
const cache = new Map([['en', EN]]);
const inflight = new Map();

export const localeMeta = (code) => LOCALES.find((l) => l.code === code) || null;
export const dirOf = (code) => localeMeta(code)?.dir || 'ltr';
export const isSupported = (code) => !!localeMeta(code);

/** BCP-47 写法，给 Intl 用（内部用下划线是为了对齐 App 的 arb 文件名） */
export const bcp47 = (code) => code.replace('_', '-');

/**
 * 载入某个语言的词典。重复调用只会发一次请求。
 * 拿不到就沉默失败 —— 调用方拿到的是英文，页面照常能用。
 */
export async function loadLocale(code) {
  if (cache.has(code)) return cache.get(code);
  if (inflight.has(code)) return inflight.get(code);

  const p = fetch(`/assets/locales/${code}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((dict) => {
      const merged = dict ? { ...EN, ...dict } : EN;
      cache.set(code, merged);
      inflight.delete(code);
      return merged;
    })
    .catch(() => { inflight.delete(code); return EN; });

  inflight.set(code, p);
  return p;
}

/** 取文案并做 {占位符} 替换；未载入或缺键一律回落英文 */
export function t(code, key, vars) {
  const dict = cache.get(code) || EN;
  let s = dict[key] ?? EN[key] ?? key;
  if (vars) for (const k in vars) s = String(s).replaceAll('{' + k + '}', vars[k]);
  return s;
}

/** 当前语言下的伊历月名（12 个），来自 App 的 hijriMonthNames */
export function monthNames(code) {
  const dict = cache.get(code) || EN;
  return dict.months || EN.months;
}

/**
 * 城市名。城市表只备了中 / 英 / 阿三种写法，其余语言按书写系统就近取用：
 * 阿拉伯字母系的语言用阿文名比用英文名自然，繁体中文用中文名。
 */
export function cityName(c, code) {
  if (c[code]) return c[code];
  if (code === 'zh_Hant') return c.zh || c.en;
  if (dirOf(code) === 'rtl') return c.ar || c.en;
  return c.en;
}
