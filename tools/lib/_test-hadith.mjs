/* 圣训引文的自测。
 *   node tools/lib/_test-hadith.mjs
 *
 * 页面在页尾对读者承诺「每一条判定都附了它所依据的那段圣训，好让你自己去核」。
 * 这份测试就是让那句话不至于变成空话：
 *
 *   1. 每一个引文块都必须带阿拉伯原文。只给译文和编号，读者核不了 ——
 *      译文是我们的转述，编号要翻书才知道对不对。这一条不会让构建报错，
 *      也不会让 verify-dist 报错，只会安静地少一行。
 *   2. 原文只存一份（lib/hadith.mjs），不许有人在内容文件里直接手写一段阿文。
 *   3. 原文栏里不许混进拉丁字母：写错的话页面上会以 Amiri 渲染出一串歪字母。
 *   4. 行文里引用的每一段圣训，在同一篇里都必须有对应的引文块。第 1 条只管
 *      「引文块带不带原文」，管不到「只在句子里提了一句、根本没开引文块」的引用 ——
 *      布哈里 6205、穆斯林 2143 / 2142b / 2139 就是这样漏掉的。
 *
 * 这些检查都不碰教法内容本身 —— 那要人去核。它们只保证「可核对」这件事
 * 不会在后续编辑中悄悄丢掉。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { AR } from './hadith.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};
const list = (xs) => (xs.length ? xs.join(', ') : '（空）');

/** 内容文件：tools/guides/*.mjs 与 tools/names/*.mjs */
const sources = [];
for (const dir of ['guides', 'names']) {
  for (const f of readdirSync(resolve(HERE, '..', dir))) {
    if (!f.endsWith('.mjs')) continue;
    const rel = `tools/${dir}/${f}`;
    sources.push({ rel, text: readFileSync(resolve(ROOT, rel), 'utf8') });
  }
}

/** 一份内容里的引文块（连续的 > 行） */
const quoteBlocks = (text) => text.match(/(?:^>[^\n]*\n)+/gm) || [];

console.log('原文库');

eq('hadith.mjs 不是空的', Object.keys(AR).length > 0, true);

eq('没有空条目',
  list(Object.entries(AR).filter(([, v]) => !v || !v.trim()).map(([k]) => k)), '（空）');

// 阿文、空格、逗号/句点、ﷺ 之外的字符都不该出现。拉丁字母混进来最常见
eq('原文里没有拉丁字母',
  list(Object.entries(AR)
    .filter(([, v]) => /[A-Za-z]/.test(v))
    .map(([k]) => k)), '（空）');

const used = new Set();
for (const { text } of sources) {
  for (const m of text.matchAll(/AR\['([^']+)'\]/g)) used.add(m[1]);
}

eq('引用的 key 都在 hadith.mjs 里',
  list([...used].filter((k) => !(k in AR))), '（空）');

eq('hadith.mjs 里没有没人用的条目',
  list(Object.keys(AR).filter((k) => !used.has(k))), '（空）');

console.log('引文块');

for (const { rel, text } of sources) {
  const blocks = quoteBlocks(text);
  const missing = blocks.filter((b) => !b.includes('>>'));
  eq(rel + ' 的每个引文块都带原文',
    missing.length ? missing.map((b) => b.trim().split('\n')[0].slice(0, 40)).join(' / ') : '（空）',
    '（空）');
}

// 原文一律走 AR[...]，不许在内容文件里直接手写阿拉伯字母 ——
// 手写的那份改不动、也没人知道它核过没有
for (const { rel, text } of sources) {
  const inline = (text.match(/^>>[^\n]*$/gm) || []).filter((l) => !/\$\{AR\['[^']+'\]\}/.test(l));
  eq(rel + ' 没有手写的原文',
    inline.length ? inline.map((l) => l.slice(0, 40)).join(' / ') : '（空）', '（空）');
}

console.log('行文里的引用');

// 圣训的编号写法因语言而异，统一成 collection-number 再比较。
// 字母后缀不能省：同一编号下的 a / b / c 异文措辞并不一样（335c 才有「补斋不补拜」）。
const CITE = {
  bukhari: /(?:Sahih al-Bukhari|Shahih al-Bukhari|《布哈里圣训实录》)\s*(\d+[a-z]?)/g,
  muslim: /(?:Sahih Muslim|Shahih Muslim|《穆斯林圣训实录》)\s*(\d+[a-z]?)/g,
  abudawud: /(?:Sunan Abi Dawud|Sunan Abu Dawud|Abu Dawud|《艾布·达乌德圣训集》)\s*(\d+[a-z]?)/g,
  tirmidhi: /(?:Jami.\s?at-Tirmidhi|Tirmidhi|Tirmidzi|《提尔密集圣训集》)\s*(\d+[a-z]?)/g,
};
const citedKeys = (text) => {
  const out = new Set();
  for (const [name, re] of Object.entries(CITE)) {
    for (const m of text.matchAll(re)) out.add(`${name}-${m[1]}`);
  }
  return out;
};

/** 问答页一个文件里有好几篇，以 slug: 切开，一篇的引文块不能替另一篇作证 */
const segments = (text) => {
  const parts = text.split(/(?=^\s*slug:\s*')/m);
  return parts.length > 1 ? parts : [text];
};

for (const { rel, text } of sources) {
  const uncovered = new Set();
  for (const seg of segments(text)) {
    const quoted = citedKeys(quoteBlocks(seg + '\n').join(''));
    const rest = seg.replace(/(?:^>[^\n]*\n)+/gm, '');
    for (const k of citedKeys(rest)) if (!quoted.has(k)) uncovered.add(k);
  }
  eq(rel + ' 行文里引用的圣训都有引文块',
    uncovered.size ? [...uncovered].sort().join(', ') : '（空）', '（空）');
}

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
