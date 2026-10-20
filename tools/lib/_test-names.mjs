/* 名字库的自测。
 *   node tools/lib/_test-names.mjs
 *
 * 这份数据有 213 条、三种语言的词义，靠眼睛看是看不住的。两类问题分开管：
 *
 *   1. 教义上的硬约束。第一条就是「先知一律是男性」—— 之前麦尔彦、阿西娅、
 *      哈哲尔、萨拉、哈娃这五条挂的是 prophetic 标签，页面上渲染成女名配
 *      「先知」，这是教义错误，不是显示瑕疵。这类错不会让构建报错，也不会
 *      让 verify-dist 报错，只会安静地挂在页面上，所以钉在这里。
 *
 *   2. 结构完整性。缺一门语言的词义、挂了没登记的标签、转写撞名 —— 都会在
 *      页面上变成空白格或重复项。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { NAMES, TAGS, FORBIDDEN_SOLO } from '../../assets/js/names-data.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

const LANGS = ['en', 'zh', 'id'];

/** 古兰经明文提到的先知，通行的 25 位。顺序按古兰经叙述的先后 */
const QURANIC_PROPHETS = [
  'Adam', 'Idris', 'Nuh', 'Hud', 'Salih', 'Ibrahim', 'Lut', 'Ismail', 'Ishaq',
  'Yaqub', 'Yusuf', 'Shuayb', 'Ayyub', 'Dhul-Kifl', 'Musa', 'Harun', 'Dawud',
  'Sulayman', 'Ilyas', 'al-Yasa', 'Yunus', 'Zakariyya', 'Yahya', 'Isa', 'Muhammad',
];

/** 先知（愿主福安之）本人的另外几个名号。它们挂 prophetic，但不是另外的先知 */
const NAMES_OF_THE_PROPHET = ['Ahmad', 'Mustafa'];

/** 「有……者」式的尊称短语，不作人名收录 —— 见 names-data.js 里的说明 */
const NOT_GIVEN_AS_NAMES = ['Dhul-Kifl'];

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};
const list = (xs) => (xs.length ? xs.join(', ') : '（空）');

console.log('教义约束');

// 伊斯兰没有女先知。古兰与圣训里受尊崇的女性归 righteous，不是 prophetic
eq('没有女名挂着 prophetic 标签',
  list(NAMES.filter((n) => n.g === 'f' && n.tags.includes('prophetic')).map((n) => n.tr)),
  '（空）');

eq('righteous 标签只用在女名上',
  list(NAMES.filter((n) => n.tags.includes('righteous') && n.g !== 'f').map((n) => n.tr)),
  '（空）');

// prophetic 是个很容易被顺手滥用的标签（鲁格曼、塔鲁特都不是先知）。
// 白名单对撞：挂了这个标签就必须真的是先知，或是先知本人的名号
eq('prophetic 没有挂在先知以外的名字上',
  list(NAMES.filter((n) => n.tags.includes('prophetic')
    && !QURANIC_PROPHETS.includes(n.tr) && !NAMES_OF_THE_PROPHET.includes(n.tr)).map((n) => n.tr)),
  '（空）');

// 反过来：古兰经里的先知除了明确不作人名的那几个，都该在库里
eq('古兰经里的先知没有漏收',
  list(QURANIC_PROPHETS.filter((t) => !NOT_GIVEN_AS_NAMES.includes(t) && !NAMES.some((n) => n.tr === t))),
  '（空）');

eq('不作人名的尊称没有被收进来',
  list(NOT_GIVEN_AS_NAMES.filter((t) => NAMES.some((n) => n.tr === t))), '（空）');

// 真主的尊名不单独做人名。FORBIDDEN_SOLO 里的转写不能同时出现在名字库里
const soloNames = new Set(FORBIDDEN_SOLO.map((f) => f.tr.toLowerCase()));
eq('名字库里没有收录不能单用的尊名',
  list(NAMES.filter((n) => soloNames.has(n.tr.toLowerCase())).map((n) => n.tr)),
  '（空）');

// Abd 复合名只能配真主的尊名。真要收 Abd al-Nabi 这类，得先过这一关
eq('没有 Abd 配真主以外对象的名字',
  list(NAMES.filter((n) => /^abd\s/i.test(n.tr) && /^abd\s+(al-)?(nabi|husayn|masih|rasul)/i.test(n.tr)).map((n) => n.tr)),
  '（空）');

console.log('结构完整性');

for (const lang of LANGS) {
  eq(lang + ' 的词义没有缺口',
    list(NAMES.filter((n) => !n.m?.[lang]).map((n) => n.tr)), '（空）');
}

for (const lang of LANGS) {
  eq(lang + ' 的注释没有缺口',
    list(NAMES.filter((n) => n.n && !n.n[lang]).map((n) => n.tr)), '（空）');
}

eq('标签三种语言都有译文',
  list(Object.entries(TAGS).filter(([, v]) => LANGS.some((l) => !v[l])).map(([k]) => k)),
  '（空）');

eq('没有用到未登记的标签',
  list([...new Set(NAMES.flatMap((n) => n.tags))].filter((t) => !TAGS[t])),
  '（空）');

eq('每条名字至少有一个标签',
  list(NAMES.filter((n) => !n.tags?.length).map((n) => n.tr)), '（空）');

eq('转写没有撞名',
  list(NAMES.map((n) => n.tr).filter((v, i, a) => a.indexOf(v) !== i)), '（空）');

eq('性别只有 m / f',
  list([...new Set(NAMES.map((n) => n.g))].filter((g) => g !== 'm' && g !== 'f')), '（空）');

// 阿文那一栏混进拉丁字母的话，页面上会以 Amiri 渲染出一串歪字母
eq('阿文栏只有阿拉伯字母',
  list(NAMES.filter((n) => /[^؀-ۿـ ]/.test(n.ar)).map((n) => n.tr)), '（空）');

// 登记的标签都该真的有名字在用，否则页面上会出现一个点了必空的筛选按钮
eq('没有空标签',
  list(Object.keys(TAGS).filter((t) => !NAMES.some((n) => n.tags.includes(t)))), '（空）');

console.log('元音符号');

// 阿文元音符号（تشكيل）。av 是页面上显示给读者照着念的那份，
// 标错一个字母读者就会念错，而这不会让任何东西报错 —— 所以逐条对。
const MARKS = /[\u064B-\u0652\u0670]/;
// replace 要全局，test 不能带 g —— 带 g 的正则做 test 会残留 lastIndex，隔条误判
const strip = (x) => x.replace(new RegExp(MARKS.source, 'g'), '');

eq('每条名字都有 av',
  list(NAMES.filter((n) => !n.av).map((n) => n.tr)), '（空）');

// 只加符号、不许改字母：去掉符号后必须与 ar 逐字一致。手误换掉一个字母会在这里现形
eq('av 去掉符号后与 ar 一致',
  list(NAMES.filter((n) => n.av && strip(n.av) !== strip(n.ar)).map((n) => n.tr)), '（空）');

// 防止把 ar 原样抄进 av 就算「标过了」
eq('av 里真的有元音符号',
  list(NAMES.filter((n) => n.av && !MARKS.test(n.av)).map((n) => n.tr)), '（空）');

eq('av 里没有拉丁字母',
  list(NAMES.filter((n) => n.av && /[A-Za-z]/.test(n.av)).map((n) => n.tr)), '（空）');

eq('不能单用的尊名也标了符号',
  list(FORBIDDEN_SOLO.filter((f) => !f.av || strip(f.av) !== strip(f.ar)).map((f) => f.tr)), '（空）');

console.log('文案里的数量');

// 「216 个名字」这句话散在三种语言的标题、导语、正文小标题和首页文案里。
// 往库里加一条名字，这些数字就全成了假话 —— 而且不会有任何东西报错。
//
// 首页那句不能写成 {n} 占位符：运行时切语言走的是 t(lang, key)，不填占位符，
// 页面上会直接露出一个生的 {n}。所以数字写死，由这里盯着它别漂。
const total = String(NAMES.length);
const boys = String(NAMES.filter((n) => n.g === 'm').length);
const girls = String(NAMES.filter((n) => n.g === 'f').length);

for (const lang of LANGS) {
  const { page } = await import(new URL('../names/' + lang + '.mjs', import.meta.url));
  eq(lang + ' 页标题里的数量是 ' + total, page.title.includes(total), true);
  eq(lang + ' 导语里的总数是 ' + total, page.lead.includes(total), true);
  eq(lang + ' 导语里的男名数是 ' + boys, page.lead.includes(boys), true);
  eq(lang + ' 导语里的女名数是 ' + girls, page.lead.includes(girls), true);
  eq(lang + ' 正文「全表」小标题里的数量是 ' + total, page.body.includes(total), true);
}

for (const lang of LANGS) {
  const dict = JSON.parse(read('tools/translations/' + lang + '.json'));
  eq(lang + ' 首页文案里的数量是 ' + total, dict.namesLead.includes(total), true);
}

// 模板里那句中文兜底也要跟上：中文页读的就是它
eq('index.html 的中文兜底文案跟上了',
  read('index.html').includes('data-i18n="namesLead">' + total), true);

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
