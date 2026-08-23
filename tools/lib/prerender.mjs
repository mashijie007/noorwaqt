/* prerender.mjs —— 把 index.html 的 i18n 占位在构建期填成真文本
 *
 * 站点运行时是靠 main.js 遍历 [data-i18n] 注入译文的，源码里留下的是中文兜底。
 * 对用户没问题，对爬虫是致命的：44 种语言的译文一个字都进不了 HTML，
 * 搜索引擎看到的永远只有那一份中文。
 *
 * 这里做的就是把运行时那一步搬到构建期 —— 同一套键、同一份词典，
 * 只是提前算好写进静态文件。运行时那段逻辑保持不动：它仍然负责
 * 用户在页面上手动切语言的场景。
 *
 * 不引 DOM 库是有意的：模板是自己写的、结构受控，一个几十行的扫描器
 * 足够应付，还省掉一整棵依赖树。
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeText = (s) => String(s).replace(/[&<>]/g, (c) => ESC[c]);
export const escapeAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

/** {占位符} 替换，和 i18n.js 的 t() 保持一致 */
export function fill(s, vars) {
  let out = String(s);
  if (vars) for (const k in vars) out = out.replaceAll('{' + k + '}', vars[k]);
  return out;
}

/** 开标签的 '>' 落在哪 —— 属性值里的 '>' 不算数，所以要跟着引号走 */
function openTagEnd(html, start) {
  let quote = null;
  for (let i = start + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '>') return i;
  }
  return -1;
}

/** 与 from 之前那个开标签配对的闭标签位置，同名嵌套要数深度 */
function closeTagAt(html, name, from) {
  const open = new RegExp('<' + name + '(?=[\\s/>])', 'gi');
  const close = new RegExp('</' + name + '\\s*>', 'gi');
  let depth = 0, i = from;
  for (;;) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(html), c = close.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    if (depth === 0) return c.index;
    depth--; i = c.index + 1;
  }
}

/** 从属性位置回退到它所属的 '<' */
const tagStartBefore = (html, at) => html.lastIndexOf('<', at);

/** 给一个开标签设属性：已有就改值，没有就插到收尾的 '>' 前 */
function setAttr(tag, attr, value) {
  const re = new RegExp('(\\s' + attr + '=")[^"]*(")', 'i');
  if (re.test(tag)) return tag.replace(re, (_, a, b) => a + value + b);
  return tag.replace(/\s*\/?>$/, (end) => ' ' + attr + '="' + value + '"' + (end.includes('/') ? ' />' : '>'));
}

/**
 * 填充 [data-i18n] 的内容与 [data-i18n-attr] 的属性。
 * 带 data-html 的按原样插入（译文里有 <em> / <b>），其余转义。
 * 缺键就原样留着模板里的中文兜底 —— 少一句话，不开天窗。
 */
export function renderI18n(html, dict, vars = {}) {
  const edits = [];

  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) {
    const raw = dict[m[1]];
    if (raw == null) continue;

    const ts = tagStartBefore(html, m.index);
    const name = /^<([a-zA-Z][\w-]*)/.exec(html.slice(ts, ts + 24))?.[1];
    if (!name) continue;
    const te = openTagEnd(html, ts);
    if (te < 0) continue;
    const ce = closeTagAt(html, name, te + 1);
    if (ce < 0) continue;

    const isHtml = /\sdata-html(?=[\s>=])/.test(html.slice(ts, te + 1));
    const value = fill(raw, vars);
    edits.push([te + 1, ce, isHtml ? value : escapeText(value)]);
  }

  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    const [attr, key] = m[1].split(':');
    const raw = dict[key];
    if (raw == null || !attr) continue;

    const ts = tagStartBefore(html, m.index);
    const te = openTagEnd(html, ts);
    if (te < 0) continue;
    edits.push([ts, te + 1, setAttr(html.slice(ts, te + 1), attr, escapeAttr(fill(raw, vars)))]);
  }

  // 倒着套用，前面的下标才不会被后面的替换挪位
  edits.sort((a, b) => b[0] - a[0]);
  let out = html;
  for (const [s, e, text] of edits) out = out.slice(0, s) + text + out.slice(e);
  return out;
}

// ── <head> 的改写 ───────────────────────────────────────

export function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escapeText(title) + '</title>');
}

/** 改 <meta> 的 content；模板里没有这一条就补到 </head> 前 */
export function setMeta(html, attr, name, content) {
  const re = new RegExp('(<meta\\s[^>]*' + attr + '="' + name + '"[^>]*content=")[^"]*(")', 'i');
  const value = escapeAttr(content);
  if (re.test(html)) return html.replace(re, (_, a, b) => a + value + b);
  return injectHead(html, '<meta ' + attr + '="' + name + '" content="' + value + '">');
}

export function setCanonical(html, href) {
  const re = /(<link\s[^>]*rel="canonical"[^>]*href=")[^"]*(")/i;
  if (re.test(html)) return html.replace(re, (_, a, b) => a + escapeAttr(href) + b);
  return injectHead(html, '<link rel="canonical" href="' + escapeAttr(href) + '">');
}

export const injectHead = (html, snippet) => html.replace(/<\/head>/i, snippet + '\n</head>');
export const injectBodyEnd = (html, snippet) => html.replace(/<\/body>/i, snippet + '\n</body>');

/** <html> 上的 lang / dir 与 data-* */
export function setHtmlAttrs(html, attrs) {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null)
    .map(([k, v]) => k + '="' + escapeAttr(v) + '"');
  return html.replace(/<html\b[^>]*>/i, '<html ' + parts.join(' ') + '>');
}

/**
 * 把模板里的 ./xxx 改成根绝对路径。
 * 子目录页面（/ar/、/ur/prayer-times/dhaka/）深度各不相同，相对路径得按层数算 ../；
 * 站点固定挂在域名根上，一律用 / 开头最省事，也最不容易在某一层算错。
 */
export const rootAbsolute = (html) => html.replace(/(["'(])\.\/(?!\/)/g, '$1/');
