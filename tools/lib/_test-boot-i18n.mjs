/* boot-i18n 的自测。这几个函数决定根页面首帧显示什么，
 * 而它们出错的方式恰恰都不会让构建报错。
 *   node tools/lib/_test-boot-i18n.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT, dictFor, CITIES } from './site.mjs';
import { bootKeys, bootEntry, bootScripts } from './boot-i18n.mjs';

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};

console.log('bootKeys');
eq('扫出 data-i18n',
  bootKeys('<p data-boot data-i18n="a">x</p>').join(','),
  'a,docTitle,docDesc');

eq('扫出 data-i18n-attr 的键（冒号后半段）',
  bootKeys('<button data-boot data-i18n-attr="aria-label:b"></button>').join(','),
  'b,docTitle,docDesc');

eq('没打标记的不算',
  bootKeys('<p data-i18n="a">x</p><p data-boot data-i18n="c">y</p>').join(','),
  'c,docTitle,docDesc');

eq('属性顺序反过来也认',
  bootKeys('<p data-i18n="a" data-html data-boot>x</p>').join(','),
  'a,docTitle,docDesc');

eq('重复的键只留一个',
  bootKeys('<p data-boot data-i18n="a">x</p><p data-boot data-i18n="a">y</p>').join(','),
  'a,docTitle,docDesc');

eq('EXTRA 不会重复追加',
  bootKeys('<p data-boot data-i18n="docTitle">x</p>').join(','),
  'docTitle,docDesc');

console.log('bootEntry');
eq('只取要的键',
  JSON.stringify(bootEntry({ a: 'A', b: 'B', c: 'C' }, {}, ['a', 'c'])),
  '{"a":"A","c":"C"}');

eq('占位符按构建期的值填上',
  bootEntry({ x: '<b>{n}</b> cities' }, { n: 152 }, ['x']).x,
  '<b>152</b> cities');

eq('HTML 保持原样不转义',
  bootEntry({ x: 'New <em>hi</em> & bye' }, {}, ['x']).x,
  'New <em>hi</em> & bye');

eq('缺的键直接不出现',
  JSON.stringify(bootEntry({ a: 'A' }, {}, ['a', 'zzz'])),
  '{"a":"A"}');

console.log('真模板');
const template = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const keys = bootKeys(template);
eq('模板里共 23 个首屏键', keys.length, 23);
for (const k of ['navGlobal', 'navDownload', 'heroTitle', 'heroLive', 'litPill',
  'litShareAria', 'heroCta2', 'heroHintTime', 'timeNow', 'docTitle', 'docDesc']) {
  eq('含 ' + k, keys.includes(k), true);
}
eq('折叠线以下的键不在内', keys.includes('barsTitle'), false);
eq('页脚的键不在内', keys.includes('privacyTitle'), false);

console.log('真词典');
const arDict = dictFor('ar');
const arVars = { n: CITIES.length, total: CITIES.length, lit: '—' };
const ar = bootEntry(arDict, arVars, keys);
eq('ar 的 23 个键都在', Object.keys(ar).length, 23);
eq('ar 里没有残留占位符', /\{(n|lit|total)\}/.test(JSON.stringify(ar)), false);
eq('ar 的 heroTitle 是阿拉伯语', /[؀-ۿ]/.test(ar.heroTitle), true);
eq('az 缺 navGuide 时回落英文基线',
  bootEntry(dictFor('az'), arVars, ['navGuide']).navGuide,
  dictFor('en').navGuide);

console.log('bootScripts');
const s = bootScripts({ d: { en: { docTitle: 'T <b>x</b>' }, ar: { docTitle: 'ت' } }, dir: { en: 'ltr', ar: 'rtl' } });

eq('载荷里的尖括号被转义', s.head.indexOf('<b>x</b>'), -1);
eq('转义成 \\u003c', s.head.includes('\\u003cb\\u003e'), true);
eq('载荷挂在 window 上', s.head.includes('window.NW_I18N_BOOT='), true);
eq('pickLang 源码被内联进来', s.head.includes('function pickLang'), true);
eq('内联的源码里没有 export', /\bexport\b/.test(s.head), false);
eq('A 段写 data-locale', s.head.includes("'data-locale'"), true);
eq('A 段不用箭头函数', s.head.includes('=>'), false);
eq('B 段扫 data-boot', s.body.includes('[data-boot]'), true);
eq('B 段认 data-html', s.body.includes('data-html'), true);
eq('B 段认 data-i18n-attr', s.body.includes('data-i18n-attr'), true);
eq('B 段不用箭头函数', s.body.includes('=>'), false);
eq('两段都包了 try', s.head.includes('try') && s.body.includes('try'), true);

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
