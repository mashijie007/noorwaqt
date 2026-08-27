/* boot-i18n 的自测。这几个函数决定根页面首帧显示什么，
 * 而它们出错的方式恰恰都不会让构建报错。
 *   node tools/lib/_test-boot-i18n.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT, dictFor, CITIES } from './site.mjs';
import { bootKeys } from './boot-i18n.mjs';

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

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
