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

/** 不是 DOM 元素、没法打标记，但首帧必须就位的一个 */
const EXTRA = ['docTitle'];

/**
 * 模板里所有打了 data-boot 的元素用到的文案键。
 * 属性顺序不固定，所以先切出标签、再在标签内部找 data-boot。
 *
 * 只扫到 </header> 为止：B 段就是插在 </header> 之后同步执行的，
 * 它 querySelectorAll('[data-boot]') 那一刻，DOM 解析到哪、它就只能看到哪。
 * </header> 之后标了 data-boot 的元素会被这里扫进载荷（页面因此变大），
 * 却永远不会被 B 段填上——不报错、不失败，只是静默地白占字节。
 * 与其等这种情况在生产上被人肉发现，不如在这里直接抛错。
 */
export function bootKeys(html) {
  const out = [];
  const add = (k) => { if (k && out.indexOf(k) < 0) out.push(k); };

  const cut = html.indexOf('</header>');
  const scope = cut < 0 ? html : html.slice(0, cut);

  for (const m of scope.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = m[0];
    if (!/\sdata-boot(?=[\s/>=])/i.test(tag)) continue;
    const key = /\sdata-i18n="([^"]+)"/i.exec(tag);
    if (key) add(key[1]);
    const attr = /\sdata-i18n-attr="([^":]+):([^"]+)"/i.exec(tag);
    if (attr) add(attr[2]);
  }

  if (cut >= 0 && /\sdata-boot(?=[\s/>=])/i.test(html.slice(cut))) {
    throw new Error('</header> 之后出现了 data-boot：B 段在解析到那里时还看不见它，标了也不会被填上');
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
 * U+2028/U+2029（行/段分隔符）JSON.stringify 会原样吐出来，ES2019 之前
 * 的字符串字面量里这俩是非法的；概率低但转起来就是一行代码，顺手转掉。
 */
const forScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/**
 * pickLang 的源码，去掉 export —— 内联进去的是一段没有模块系统的裸脚本。
 * 顺手把注释也去掉：文件头那段说明文字里恰好提到了 "export" 这个词，
 * 留着的话它会原样躺进内联脚本里，看着像是漏删的 export 关键字。
 *
 * `/mg` 而不是只 `/m`：这份源码以后可能不止一处 export（比如加个具名导出
 * 当内部辅助函数）。只去掉第一个会在裸脚本里留下一个孤零零的 export 关键字——
 * 一个语法错误，还恰好被两段脚本自己的 try/catch 也捕不住，因为它在
 * new Function 构造阶段就炸了。
 */
function pickLangSource() {
  const src = readFileSync(resolve(ROOT, 'assets/js/lang-pick.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^export\s+/mg, '')
    .trim();
  // 一行 // 注释里如果混进 </script>，会把内联的 <script> 标签在浏览器的
  // HTML 解析器眼里提前截断——后面所有东西（包括 B 段本身）都变成文本。
  // 这是唯一一处出了事没有任何兜底的地方，只能在源头挡掉。
  if (/<\/?script/i.test(src)) throw new Error('lang-pick.js 里出现了 script 标签文本，会截断内联脚本');
  return src;
}

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
