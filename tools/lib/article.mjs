/* article.mjs —— 长文页的公共外壳
 *
 * 两个生成器共用这一份：
 *   build-guides.mjs   /<lang>/guide/      教法问答
 *   build-names.mjs    /<lang>/names/      起名页
 *
 * 两边长得一样不是巧合 —— 同一套导航、页脚、正文排版、同一份 Markdown 子集。
 * 原先这些代码只长在 build-guides.mjs 里，起名页要出多语言版时照抄一份，
 * 等于把「以后改导航要改两处」写进了仓库。所以先抽出来再加第二个调用方。
 *
 * 这里只管外壳与正文渲染，结构化数据留给各自的生成器：问答页发 Article +
 * FAQPage，起名页发 WebPage + FAQPage，没有共同的形状可抽。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const ORIGIN = 'https://www.noorwaqt.com';

/** 语言元数据。dir 决定 <html dir>，hreflang 是给搜索引擎看的 BCP-47 写法。 */
export const LANGS = {
  zh: { hreflang: 'zh-Hans', dir: 'ltr', name: '简体中文', font: 'sans' },
  en: { hreflang: 'en', dir: 'ltr', name: 'English', font: 'sans' },
  ar: { hreflang: 'ar', dir: 'rtl', name: 'العربية', font: 'serif' },
  id: { hreflang: 'id', dir: 'ltr', name: 'Bahasa Indonesia', font: 'sans' },
};

/** hreflang="x-default"：没有匹配语言时该去哪。英文覆盖面最广。 */
export const X_DEFAULT = 'en';

// ── Markdown 子集 ───────────────────────────────────────
// 支持：## / ### 标题、段落、- 无序列表、1. 有序列表、> 引用、
//       | 表格 |、**粗体**、*斜体*、[文字](链接)、`代码`。
// 引用块里，以 >> 开头的那一行是阿拉伯原文（见 lib/hadith.mjs）。
// 不支持的写法会原样输出，写内容时看到就知道错了。

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 行内标记。先转义再回填标签，正文里就不用担心尖括号。 */
export function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 斜体放在粗体之后：此时 ** 已经变成标签，剩下的单星号只可能是斜体。
    // 反过来写的话 **x** 会先被吃掉一对星号，粗体永远匹配不上
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** 表格行 "| a | b |" → 单元格数组 */
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isDivider = (line) => /^\|[\s|:-]+\|$/.test(line.trim());

/** 标题 → 锚点 id。非拉丁标题（中文、阿文）取不出有意义的 slug，退回序号。
 *  序号按页重置，所以每个页面开头都要调一次 resetHeadings()。 */
let headingSeq = 0;
export const resetHeadings = () => { headingSeq = 0; };

function slugifyHeading(text) {
  const s = text.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '');
  return /^[a-z0-9-]+$/.test(s) && s.length > 2 ? s : `s${++headingSeq}`;
}

export function render(md) {
  const lines = md.trim().split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // 标题
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      const tag = m[1].length === 2 ? 'h2' : 'h3';
      // 给 h2 一个 id，方便以后做目录锚点和站内深链
      const id = slugifyHeading(m[2]);
      out.push(`<${tag}${tag === 'h2' ? ` id="${id}"` : ''}>${inline(m[2])}</${tag}>`);
      i++; continue;
    }

    // 表格：表头 + 分隔行 + 若干数据行
    if (line.trim().startsWith('|') && isDivider(lines[i + 1] || '')) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      out.push(
        '<div class="table-scroll"><table><thead><tr>' +
        head.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>'
      );
      continue;
    }

    // 引用：连续的 > 行合成一段。其中
    //   >> 开头 → 阿拉伯原文，单独成段，排在译文之前
    //   —  开头 → 出处，收进 <cite>
    // 原文排在译文前面，因为原文才是被引的东西，译文是我们的转述。
    if (line.startsWith('>')) {
      const raw = [];
      while (i < lines.length && lines[i].startsWith('>')) { raw.push(lines[i].replace(/^>\s?/, '')); i++; }

      const ar = [];
      const buf = [];
      let cite = '';
      for (const l of raw) {
        if (l.startsWith('>')) ar.push(l.replace(/^>\s?/, ''));
        else if (/^—/.test(l)) cite = `<cite>${inline(l)}</cite>`;
        else buf.push(l);
      }

      const arBlock = ar.length
        ? `<p class="quote-ar" lang="ar" dir="rtl">${ar.map(esc).join('<br>')}</p>`
        : '';
      out.push(`<blockquote>${arBlock}<p>${buf.map(inline).join('<br>')}</p>${cite}</blockquote>`);
      continue;
    }

    // 列表
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const re = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) { items.push(lines[i].replace(re, '')); i++; }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${tag}>`);
      continue;
    }

    // 段落：直到空行
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|[-*]\s|\d+\.\s|\|)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${buf.map(inline).join(' ')}</p>`);
  }

  return out.join('\n');
}

// ── 页面外壳 ────────────────────────────────────────────

/**
 * 默认的链接预览图。用 build-og.mjs 出的那张站点卡，不用方形 logo ——
 * 1057×1057 的方图在 WhatsApp / Telegram 里只渲染成一个小缩略图，出不了大卡。
 * 尺寸标注只在用默认图时写：某篇文章要是自带插图，标个 1200×630 就是在骗抓取端。
 */
const OG_DEFAULT = 'og/_site.jpg';
const OG_DEFAULT_SIZE = [
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:type" content="image/jpeg">',
].join('\n');

/**
 * <head>。alts 是「这篇在哪些语言里真的有」——指到 404 会让 Google
 * 直接忽略整组 hreflang 声明，所以调用方必须按实际产出的文件来算。
 * ogType: 文章页用 article，栏目页/工具页用 website。
 */
export function head({ lang, url, title, desc, alts, jsonld, image, extraCss = [], ogType = 'article' }) {
  const L = LANGS[lang];
  const links = alts.map((l) =>
    `<link rel="alternate" hreflang="${LANGS[l].hreflang}" href="${ORIGIN}${url.replace(`/${lang}/`, `/${l}/`)}">`
  );
  if (alts.includes(X_DEFAULT)) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}${url.replace(`/${lang}/`, `/${X_DEFAULT}/`)}">`);
  }

  return `<!DOCTYPE html>
<html lang="${L.hreflang}" dir="${L.dir}" data-locale="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#04100e">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${ORIGIN}${url}">
${links.join('\n')}
<link rel="icon" href="/noorwaqt.png">
<link rel="apple-touch-icon" href="/noorwaqt.png">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${ORIGIN}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ORIGIN}/${image || OG_DEFAULT}">
<meta name="twitter:image" content="${ORIGIN}/${image || OG_DEFAULT}">
${image ? '' : OG_DEFAULT_SIZE}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/guide.css">
${extraCss.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body class="guide-body">`;
}

/** 导航。items 是 [{ href, label, current? }]，顺序即显示顺序 */
export function nav(items, ui) {
  return `
<nav class="nav" id="nav">
  <a class="brand" href="/"><img src="/noorwaqt.png" alt=""> NoorWaqt</a>
  <div class="nav-links">
    ${items.map((it) =>
      `<a href="${it.href}"${it.current ? ' aria-current="page"' : ''}>${esc(it.label)}</a>`
    ).join('\n    ')}
  </div>
  <div class="nav-right">
    <a class="btn btn-primary btn-sm" href="/#download">${esc(ui.navDownload)}</a>
  </div>
</nav>`;
}

/** 「其他语言：」。只列真实存在译文的语言 */
export function langSwitch(lang, url, alts, ui) {
  const others = alts.filter((l) => l !== lang);
  if (!others.length) return '';
  return `<p class="lang-switch">${esc(ui.alsoIn)} ` + others.map((l) =>
    `<a href="${url.replace(`/${lang}/`, `/${l}/`)}" hreflang="${LANGS[l].hreflang}" lang="${LANGS[l].hreflang}">${LANGS[l].name}</a>`
  ).join(' · ') + '</p>';
}

export function footer(ui) {
  return `
<footer class="footer">
  <div class="wrap footer-inner">
    <div>
      <div class="footer-tag">Your prayer. Your time. Your world.</div>
      <small>${esc(ui.footerFiqh)}</small>
      <small>${esc(ui.footerPrivacy)}</small>
    </div>
    <small>&copy; 2026 NoorWaqt · <a href="/">noorwaqt.com</a></small>
  </div>
</footer>
</body>
</html>`;
}

/** 文末的下载位。栏目页、文章页、起名页共用。 */
export function cta(ui) {
  return `
<aside class="guide-cta">
  <h2>${esc(ui.ctaTitle)}</h2>
  <p>${esc(ui.ctaBody)}</p>
  <p><a class="btn btn-primary" href="/#download">${esc(ui.ctaBtn)}</a></p>
</aside>`;
}

/** 写盘。rel 相对仓库根 */
export function writeFile(root, rel, html) {
  const abs = resolve(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, html.trim() + '\n');
}
