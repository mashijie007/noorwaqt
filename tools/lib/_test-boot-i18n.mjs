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
  'a,docTitle');

eq('扫出 data-i18n-attr 的键（冒号后半段）',
  bootKeys('<button data-boot data-i18n-attr="aria-label:b"></button>').join(','),
  'b,docTitle');

eq('没打标记的不算',
  bootKeys('<p data-i18n="a">x</p><p data-boot data-i18n="c">y</p>').join(','),
  'c,docTitle');

eq('属性顺序反过来也认',
  bootKeys('<p data-i18n="a" data-html data-boot>x</p>').join(','),
  'a,docTitle');

eq('重复的键只留一个',
  bootKeys('<p data-boot data-i18n="a">x</p><p data-boot data-i18n="a">y</p>').join(','),
  'a,docTitle');

eq('EXTRA 不会重复追加',
  bootKeys('<p data-boot data-i18n="docTitle">x</p>').join(','),
  'docTitle');

console.log('bootKeys 边界：</header> 定义 B 段能看见的范围');
eq('</header> 之前的 data-boot 正常扫入',
  bootKeys('<p data-boot data-i18n="a">x</p></header>').join(','),
  'a,docTitle');

{
  let threw = false;
  try {
    bootKeys('<div>x</div></header><p data-boot data-i18n="a">y</p>');
  } catch {
    threw = true;
  }
  eq('</header> 之后出现 data-boot 会抛错', threw, true);
}

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
// 这个数字是道闸：模板上多一个、少一个 data-boot 都会在这里停下来。
// 它必须写死 —— 从 bootKeys 自己的结果里推期望值，等于拿被测函数给自己作证。
// 首屏范围本来就该是有意扩的，改了就顺手把这里也改了。
eq('模板里共 24 个首屏键', keys.length, 24);
for (const k of ['navGlobal', 'navLive', 'navDownload', 'heroTitle', 'heroLive', 'litPill',
  'litShareAria', 'heroCta2', 'heroHintTime', 'timeNow', 'breathLabel', 'docTitle']) {
  eq('含 ' + k, keys.includes(k), true);
}
eq('docDesc 不再进首屏载荷', keys.includes('docDesc'), false);
eq('折叠线以下的键不在内', keys.includes('barsTitle'), false);
eq('页脚的键不在内', keys.includes('privacyTitle'), false);

console.log('真词典');
const arDict = dictFor('ar');
const arVars = { n: CITIES.length, total: CITIES.length, lit: '—' };
const ar = bootEntry(arDict, arVars, keys);
// 这里问的是「ar 词典一个首屏键都没缺」，拿 keys.length 比才是原意：
// keys 来自模板、ar 来自词典，两个独立来源，首屏范围再变也不用改这行。
eq('ar 的 ' + keys.length + ' 个键都在', Object.keys(ar).length, keys.length);
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
eq('A 段不再碰 meta description', s.head.includes('description'), false);
eq('A 段不用箭头函数', s.head.includes('=>'), false);
eq('B 段扫 data-boot', s.body.includes('[data-boot]'), true);
eq('B 段认 data-html', s.body.includes('data-html'), true);
eq('B 段认 data-i18n-attr', s.body.includes('data-i18n-attr'), true);
eq('B 段不用箭头函数', s.body.includes('=>'), false);
eq('两段都包了 try', s.head.includes('try') && s.body.includes('try'), true);

// 生成脚本的语法检查：确保拼接出来的 JavaScript 能真正被解析。
// 这只证明脚本能解析，证不明它真的把文案填对了地方——下面那段在真实
// DOM 壳里执行它才是。
try {
  const scriptContent = (s.head + s.body).replace(/<\/?script>/g, '');
  new Function(scriptContent);
  eq('生成脚本语法有效', true, true);
} catch {
  eq('生成脚本语法有效', false, true);
}

console.log('bootScripts 在真实 DOM 壳里执行（不依赖构建产物，直接喂合成载荷）');

// 覆盖：一个 LTR 语言（id）、一个 RTL 语言（ar）、一个走 BCP-47 转换的
// 语言（zh_Hant，下划线转连字符）、被 saved 覆盖时选中的语言（ur）、
// 兜底语言（en）。每种语言都带齐 docTitle / 一个纯文本键 / 一个
// data-html 键 / 一个 data-i18n-attr 键，这样一次跑就能把 B 段四种
// DOM 效果全验一遍。
const domBoot = {
  d: {
    en: { docTitle: 'EN Title', navGlobal: 'Global', heroTitle: 'Hero <em>EN</em>', litShareAria: 'Share EN' },
    id: { docTitle: 'ID Title', navGlobal: 'Global ID', heroTitle: 'Hero <em>ID</em>', litShareAria: 'Share ID' },
    ar: { docTitle: 'AR Title', navGlobal: 'AR Nav', heroTitle: 'Hero <em>AR</em>', litShareAria: 'Share AR' },
    zh_Hant: { docTitle: 'ZH Title', navGlobal: 'ZH Nav', heroTitle: 'Hero <em>ZH</em>', litShareAria: 'Share ZH' },
    ur: { docTitle: 'UR Title', navGlobal: 'UR Nav', heroTitle: 'Hero <em>UR</em>', litShareAria: 'Share UR' },
  },
  dir: { en: 'ltr', id: 'ltr', ar: 'rtl', zh_Hant: 'ltr', ur: 'rtl' },
};
const domScripts = bootScripts(domBoot);
const scriptBodies = [...(domScripts.head + domScripts.body).matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1]);

/** 拿真实生成的脚本，在最小 DOM 壳里跑一遍，返回跑完之后的 DOM 状态 */
function run({ throwOnStorage, languages, saved }) {
  const mk = (attrs) => ({
    _a: attrs, _text: null, _html: null, _set: {},
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    setAttribute(k, v) { this._set[k] = v; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
  });
  // 模拟带 data-boot 的元素：一个 data-html、一个纯文本、一个 data-i18n-attr
  const h1 = mk({ 'data-i18n': 'heroTitle', 'data-html': '', 'data-boot': '' });
  const nav = mk({ 'data-i18n': 'navGlobal', 'data-boot': '' });
  const btn = mk({ 'data-i18n-attr': 'aria-label:litShareAria', 'data-boot': '' });
  const marked = [h1, nav, btn];

  const docEl = { lang: 'x', dir: 'x', _attr: {}, setAttribute(k, v) { this._attr[k] = v; } };
  const ctx = {
    window: {},
    document: {
      documentElement: docEl,
      title: 'UNSET',
      querySelectorAll: (sel) => (sel === '[data-boot]' ? marked : []),
    },
    localStorage: {
      getItem: () => { if (throwOnStorage) throw new Error('SecurityError: 隐私模式'); return saved ?? null; },
    },
    navigator: { languages, language: languages && languages[0] },
  };
  ctx.window.document = ctx.document;

  for (const src of scriptBodies) {
    new Function('window', 'document', 'localStorage', 'navigator', src)
      .call(ctx.window, ctx.window, ctx.document, ctx.localStorage, ctx.navigator);
  }
  return {
    lang: docEl.lang, dir: docEl.dir, dataLocale: docEl._attr['data-locale'],
    title: ctx.document.title,
    hero: h1._html, nav: nav._text, aria: btn._set['aria-label'],
  };
}

console.log('  路径 1：浏览器偏好选中一种语言（id-ID）');
{
  const r = run({ throwOnStorage: false, languages: ['id-ID'], saved: null });
  eq('lang', r.lang, 'id');
  eq('dir', r.dir, 'ltr');
  eq('data-locale', r.dataLocale, 'id');
  eq('title', r.title, 'ID Title');
  eq('data-html 元素拿到 innerHTML', r.hero, 'Hero <em>ID</em>');
  eq('纯文本元素拿到 textContent', r.nav, 'Global ID');
  eq('data-i18n-attr 元素设上属性', r.aria, 'Share ID');
}

console.log('  路径 2：localStorage.getItem 抛异常（隐私模式），协商仍然成立');
{
  const r = run({ throwOnStorage: true, languages: ['ar-SA'], saved: null });
  eq('lang', r.lang, 'ar');
  eq('dir', r.dir, 'rtl');
  eq('data-locale', r.dataLocale, 'ar');
  eq('title', r.title, 'AR Title');
  eq('data-html 元素拿到 innerHTML', r.hero, 'Hero <em>AR</em>');
  eq('纯文本元素拿到 textContent', r.nav, 'AR Nav');
  eq('data-i18n-attr 元素设上属性', r.aria, 'Share AR');
}

console.log('  路径 3：保存值覆盖浏览器偏好（saved=ur，偏好=fr-FR）');
{
  const r = run({ throwOnStorage: false, languages: ['fr-FR'], saved: 'ur' });
  eq('lang', r.lang, 'ur');
  eq('dir', r.dir, 'rtl');
  eq('data-locale', r.dataLocale, 'ur');
  eq('title', r.title, 'UR Title');
}

console.log('  路径 4：偏好不支持，回落 en');
{
  const r = run({ throwOnStorage: false, languages: ['pt-BR'], saved: null });
  eq('lang', r.lang, 'en');
  eq('dir', r.dir, 'ltr');
  eq('data-locale', r.dataLocale, 'en');
  eq('title', r.title, 'EN Title');
}

console.log('  路径 5：zh-TW 协商出 zh_Hant，lang 属性转成 BCP-47 的 zh-Hant');
{
  const r = run({ throwOnStorage: false, languages: ['zh-TW'], saved: null });
  eq('lang 是连字符形式', r.lang, 'zh-Hant');
  eq('data-locale 仍是内部下划线码', r.dataLocale, 'zh_Hant');
  eq('title', r.title, 'ZH Title');
}

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
