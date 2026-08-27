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

/**
 * 载荷的序列化。必须把 < 转义掉 —— 词典里有 <b> <em>，
 * 原样塞进 <script> 里，一个 </script> 序列就能把整段脚本提前截断。
 * 顺带把 > 也转义掉，让 <b> 这类标签整体转义、不留半截，更彻底。
 * blocks.mjs 里的 langHrefScript 没做这一步，因为它的值只有 URL：不要照抄它。
 */
const forScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

/**
 * pickLang 的源码，去掉 export —— 内联进去的是一段没有模块系统的裸脚本。
 * 顺手把注释也去掉：文件头那段说明文字里恰好提到了 "export" 这个词，
 * 留着的话它会原样躺进内联脚本里，看着像是漏删的 export 关键字。
 */
const pickLangSource = () =>
  readFileSync(resolve(ROOT, 'assets/js/lang-pick.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^export\s+/m, '')
    .trim();

/**
 * 三段脚本。head 插到 </head> 前，body 插到 </header> 后。
 *
 * 分两段是因为它们要在不同的时刻生效：
 *   A 段（head）—— lang / dir 必须在首帧之前定下来，否则 RTL 语言会看到
 *                  整个布局从左到右翻过去一次，比文案闪一下更刺眼。
 *   B 段（hero 之后）—— 要改的元素这时才存在。
 *
 * 两段都是 classic 脚本、同步执行，写法保守到 ES5 —— 它们跑在首帧之前，
 * 是这个页面上唯一没有任何兜底的代码。抛错就是回到改动前的行为：
 * 英文静态页 + main.js 异步纠正。
 */
export function bootScripts(boot) {
  const head =
    '<script>window.NW_I18N_BOOT=' + forScript(boot) + ';</script>\n'
    + '<script>(function(){try{\n'
    + pickLangSource() + '\n'
    + 'var B=window.NW_I18N_BOOT;if(!B)return;\n'
    + "var saved=null;try{saved=localStorage.getItem('nw-lang');}catch(e){}\n"
    + "var code=pickLang(Object.keys(B.d),saved,navigator.languages||[navigator.language||'en']);\n"
    + 'var d=B.d[code];if(!d)return;\n'
    + 'var el=document.documentElement;\n'
    + "el.lang=code.replace('_','-');el.dir=B.dir[code]||'ltr';el.setAttribute('data-locale',code);\n"
    + 'if(d.docTitle)document.title=d.docTitle;\n'
    + 'var m=document.querySelector(\'meta[name="description"]\');\n'
    + "if(m&&d.docDesc)m.setAttribute('content',d.docDesc);\n"
    + 'window.NW_BOOT_LANG=code;\n'
    + '}catch(e){}})();</script>';

  // 规则与 main.js 的 applyLang() 逐条对齐：data-html 走 innerHTML，
  // 其余走 textContent，data-i18n-attr 按 "属性:键" 设属性。
  const body =
    '<script>(function(){try{\n'
    + 'var B=window.NW_I18N_BOOT,code=window.NW_BOOT_LANG;\n'
    + 'if(!B||!code)return;var d=B.d[code];if(!d)return;\n'
    + "var els=document.querySelectorAll('[data-boot]');\n"
    + 'for(var i=0;i<els.length;i++){var el=els[i];\n'
    + "var k=el.getAttribute('data-i18n');\n"
    + 'if(k&&d[k]!=null){\n'
    + "if(el.hasAttribute('data-html'))el.innerHTML=d[k];else el.textContent=d[k];\n"
    + '}\n'
    + "var a=el.getAttribute('data-i18n-attr');\n"
    + "if(a){var p=a.split(':');if(d[p[1]]!=null)el.setAttribute(p[0],d[p[1]]);}\n"
    + '}\n'
    + '}catch(e){}})();</script>';

  return { head, body };
}
