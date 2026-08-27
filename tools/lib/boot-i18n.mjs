/* boot-i18n.mjs —— 域名根的首屏文案载荷
 *
 * 根页面 / 是语言协商页：静态 HTML 是英文，真正的语言要等 main.js 起来才知道。
 * 但 main.js 是 module、天生 defer，在首帧之后执行是常态 —— 于是印尼语访客
 * 先看到一屏英文，再看着它跳成印尼语。
 *
 * 这里把首屏那一小撮文案 × 44 种语言在构建期烤进 HTML，配两段同步内联脚本，
 * 让首帧画出来就是母语。折叠线以下的内容照旧走 main.js 的异步词典。
 *
 * 首屏范围不写在这里，写在模板上：谁加了 data-boot，谁就进载荷。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT } from './site.mjs';
import { fill } from './prerender.mjs';

/** 不是 DOM 元素、没法打标记，但首帧必须就位的两个 */
const EXTRA = ['docTitle', 'docDesc'];

/**
 * 模板里所有打了 data-boot 的元素用到的文案键。
 * 属性顺序不固定，所以先切出标签、再在标签内部找 data-boot。
 */
export function bootKeys(html) {
  const out = [];
  const add = (k) => { if (k && out.indexOf(k) < 0) out.push(k); };

  for (const m of html.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = m[0];
    if (!/\sdata-boot(?=[\s/>=])/i.test(tag)) continue;
    const key = /\sdata-i18n="([^"]+)"/i.exec(tag);
    if (key) add(key[1]);
    const attr = /\sdata-i18n-attr="([^":]+):([^"]+)"/i.exec(tag);
    if (attr) add(attr[2]);
  }

  for (const k of EXTRA) add(k);
  return out;
}

/**
 * 某一种语言的首屏子集。
 *
 * dict 与 vars 都由 build-pages 的主循环现成给过来 —— 不在这里自己读 JSON。
 * 这是为了保证 boot 文案与同一次构建里预渲染出来的文案逐字节一致：
 * 两边一旦对不上，main.js 起来的那一刻就会看到一次无谓的跳变，
 * 而那正是这整个改动想消掉的东西。
 *
 * dict 已经是 dictFor() 的产物（英文基线 ← 该语言译文），所以缺译文的键
 * 拿到的自然是英文 —— 与运行时 t() 的回落规则一致，这里不需要再兜一层。
 */
export function bootEntry(dict, vars, keys) {
  const out = {};
  for (const k of keys) {
    if (dict[k] == null) continue;
    out[k] = fill(dict[k], vars);
  }
  return out;
}
