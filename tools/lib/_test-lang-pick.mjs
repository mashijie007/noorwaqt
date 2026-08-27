/* pickLang 的自测。首帧的语言与 main.js 的语言由同一个函数决定，
 * 它挑错了，用户看到的就是两次跳变 —— 比一次闪烁更难受。
 *   node tools/lib/_test-lang-pick.mjs
 */
import { pickLang } from '../../assets/js/lang-pick.js';
import { LOCALES } from '../../assets/js/locale-data.js';

const CODES = LOCALES.map((l) => l.code);

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};

console.log('pickLang');
eq('上次的选择优先于浏览器偏好', pickLang(CODES, 'ar', ['id-ID']), 'ar');
eq('不认识的保存值被忽略', pickLang(CODES, 'xx', ['id-ID']), 'id');
eq('空保存值不影响协商', pickLang(CODES, null, ['ms-MY']), 'ms');

eq('zh-TW 归繁体', pickLang(CODES, null, ['zh-TW']), 'zh_Hant');
eq('zh-HK 归繁体', pickLang(CODES, null, ['zh-HK']), 'zh_Hant');
eq('zh-MO 归繁体', pickLang(CODES, null, ['zh-MO']), 'zh_Hant');
eq('zh-Hant 归繁体', pickLang(CODES, null, ['zh-Hant']), 'zh_Hant');
eq('zh-CN 归简体', pickLang(CODES, null, ['zh-CN']), 'zh');
eq('光一个 zh 归简体', pickLang(CODES, null, ['zh']), 'zh');

eq('区域码落到基础语言', pickLang(CODES, null, ['fr-CA']), 'fr');
eq('大小写不敏感', pickLang(CODES, null, ['AR-SA']), 'ar');
eq('不支持的语言继续往后找', pickLang(CODES, null, ['pt-BR', 'ru-RU']), 'ru');
eq('全都不支持就回落英文', pickLang(CODES, null, ['pt-BR', 'nl-NL']), 'en');
eq('偏好列表为空回落英文', pickLang(CODES, null, []), 'en');
eq('偏好列表缺失回落英文', pickLang(CODES, null, undefined), 'en');

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
