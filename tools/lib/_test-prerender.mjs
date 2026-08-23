/* 预渲染扫描器的自测。构建的正确性全压在这几十行上，所以留一份可跑的断言。
 *   node tools/lib/_test-prerender.mjs
 */
import { renderI18n, rootAbsolute, setMeta, setTitle, setHtmlAttrs } from './prerender.mjs';

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};

console.log('renderI18n');
eq('转义纯文本',
  renderI18n('<p data-i18n="a">中文</p>', { a: 'Hello & <bye>' }),
  '<p data-i18n="a">Hello &amp; &lt;bye&gt;</p>');

eq('data-html 原样插入',
  renderI18n('<h1 data-i18n="b" data-html>旧 <em>x</em></h1>', { b: 'New <em>hi</em>' }),
  '<h1 data-i18n="b" data-html>New <em>hi</em></h1>');

eq('同名标签嵌套时配对正确',
  renderI18n('<div data-i18n="a" data-html><div class="x">旧</div></div>', { a: '<div>新</div>' }),
  '<div data-i18n="a" data-html><div>新</div></div>');

eq('已有属性被改值而不是追加',
  renderI18n('<input placeholder="老的" data-i18n-attr="placeholder:c">', { c: 'Search…' }),
  '<input placeholder="Search…" data-i18n-attr="placeholder:c">');

eq('缺属性时插入',
  renderI18n('<input data-i18n-attr="placeholder:c">', { c: 'Search…' }),
  '<input data-i18n-attr="placeholder:c" placeholder="Search…">');

eq('缺键保留模板兜底',
  renderI18n('<p data-i18n="zzz">中文</p>', {}),
  '<p data-i18n="zzz">中文</p>');

eq('占位符替换',
  renderI18n('<span data-i18n="d">共 {n} 个</span>', { d: '{n} cities in {c} countries' }, { n: 152, c: 84 }),
  '<span data-i18n="d">152 cities in 84 countries</span>');

eq('同一页多处按倒序套用不串位',
  renderI18n('<p data-i18n="a">一</p><p data-i18n="b">二</p>', { a: 'AAAA', b: 'B' }),
  '<p data-i18n="a">AAAA</p><p data-i18n="b">B</p>');

console.log('rootAbsolute');
eq('相对资源改写', rootAbsolute('<img src="./a.png">'), '<img src="/a.png">');
eq('锚点不动', rootAbsolute('<a href="#top">x</a>'), '<a href="#top">x</a>');
eq('绝对地址不动', rootAbsolute('<a href="https://e.com/./y">y</a>'), '<a href="https://e.com/./y">y</a>');
eq('CSS url() 也改写', rootAbsolute('background:url("./b.png")'), 'background:url("/b.png")');

console.log('head');
eq('标题', setTitle('<title>旧</title>', 'New'), '<title>New</title>');
eq('已有 meta 改值',
  setMeta('<meta name="description" content="旧">', 'name', 'description', '新的"值'),
  '<meta name="description" content="新的&quot;值">');
eq('og 属性改值',
  setMeta('<meta property="og:title" content="旧">', 'property', 'og:title', 'X'),
  '<meta property="og:title" content="X">');
eq('html 属性重写',
  setHtmlAttrs('<html lang="zh" dir="ltr">', { lang: 'ar', dir: 'rtl', 'data-locale': 'ar' }),
  '<html lang="ar" dir="rtl" data-locale="ar">');

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
