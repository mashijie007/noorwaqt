/* build-guides.mjs — 生成 /<lang>/guide/ 下的教法问答页
 *
 *   node tools/build-guides.mjs
 *
 * 内容源是 tools/guides/<lang>.mjs，一个语言一个数组，每篇文章是一个对象。
 * 用 .mjs 而不是 md + front matter，是因为不想为了几行元数据再引一个 YAML
 * 解析器；正文仍然写 Markdown，由本文件里的 render() 处理一个够用的子集。
 *
 * 每篇文章产出一个目录页（<lang>/guide/<slug>/index.html），因为目录式 URL
 * 比 .html 结尾更耐改版 —— 以后换渲染方式，链接不用动。
 *
 * 同时产出：
 *   <lang>/guide/index.html   栏目首页，把同语言的文章串起来
 *   sitemap.xml               首页 + 全部栏目页与文章页
 *
 * 语言之间用 hreflang 互指。某篇文章只有部分语言有译文时，只指向真实存在的
 * 那几个 —— hreflang 指到 404 会让 Google 直接忽略整组声明。
 */
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = resolve(HERE, 'guides');
const ORIGIN = 'https://www.noorwaqt.com';

/** 语言元数据。dir 决定 <html dir>，hreflang 是给搜索引擎看的 BCP-47 写法。 */
const LANGS = {
  zh: { hreflang: 'zh-Hans', dir: 'ltr', name: '简体中文', font: 'sans' },
  en: { hreflang: 'en', dir: 'ltr', name: 'English', font: 'sans' },
  ar: { hreflang: 'ar', dir: 'rtl', name: 'العربية', font: 'serif' },
  id: { hreflang: 'id', dir: 'ltr', name: 'Bahasa Indonesia', font: 'sans' },
};

/** hreflang="x-default"：没有匹配语言时该去哪。英文覆盖面最广。 */
const X_DEFAULT = 'en';

// ── Markdown 子集 ───────────────────────────────────────
// 支持：## / ### 标题、段落、- 无序列表、1. 有序列表、> 引用、
//       | 表格 |、**粗体**、[文字](链接)、`代码`。
// 不支持的写法会原样输出，写内容时看到就知道错了。

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 行内标记。先转义再回填标签，正文里就不用担心尖括号。 */
function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** 表格行 "| a | b |" → 单元格数组 */
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isDivider = (line) => /^\|[\s|:-]+\|$/.test(line.trim());

function render(md) {
  const lines = md.trim().split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // 标题
    let m = /^(#{2,3})\s+(.*)$/.exec(line);
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

    // 引用：连续的 > 行合成一段，最后一行以 — 开头的当作出处
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      const last = buf[buf.length - 1] || '';
      let cite = '';
      if (/^—/.test(last)) { cite = `<cite>${inline(buf.pop())}</cite>`; }
      out.push(`<blockquote><p>${buf.map(inline).join('<br>')}</p>${cite}</blockquote>`);
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

/** 标题 → 锚点 id。非拉丁标题（中文、阿文）取不出有意义的 slug，退回序号。 */
let headingSeq = 0;
function slugifyHeading(text) {
  const s = text.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '');
  return /^[a-z0-9-]+$/.test(s) && s.length > 2 ? s : `s${++headingSeq}`;
}

// ── 页面外壳 ────────────────────────────────────────────

const path = (lang, slug) => (slug ? `/${lang}/guide/${slug}/` : `/${lang}/guide/`);

/** 一篇文章在哪些语言里有译文 */
function alternates(all, slug) {
  return Object.keys(all).filter((l) => all[l].some((a) => a.slug === slug));
}

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

function head({ lang, url, title, desc, alts, jsonld, image }) {
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
<meta property="og:type" content="article">
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
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body class="guide-body">`;
}

function nav(lang, ui) {
  return `
<nav class="nav" id="nav">
  <a class="brand" href="/"><img src="/noorwaqt.png" alt=""> NoorWaqt</a>
  <div class="nav-links">
    <a href="/">${esc(ui.navHome)}</a>
    <a href="${path(lang)}">${esc(ui.navGuide)}</a>
  </div>
  <div class="nav-right">
    <a class="btn btn-primary btn-sm" href="/#download">${esc(ui.navDownload)}</a>
  </div>
</nav>`;
}

function langSwitch(lang, url, alts, ui) {
  const others = alts.filter((l) => l !== lang);
  if (!others.length) return '';
  return `<p class="lang-switch">${esc(ui.alsoIn)} ` + others.map((l) =>
    `<a href="${url.replace(`/${lang}/`, `/${l}/`)}" hreflang="${LANGS[l].hreflang}" lang="${LANGS[l].hreflang}">${LANGS[l].name}</a>`
  ).join(' · ') + '</p>';
}

function footer(lang, ui) {
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

/** 文章末尾的下载位。栏目页和文章页共用。 */
function cta(ui) {
  return `
<aside class="guide-cta">
  <h2>${esc(ui.ctaTitle)}</h2>
  <p>${esc(ui.ctaBody)}</p>
  <p><a class="btn btn-primary" href="/#download">${esc(ui.ctaBtn)}</a></p>
</aside>`;
}

// ── 结构化数据 ──────────────────────────────────────────

function articleJsonLd({ lang, url, a, ui }) {
  const graph = [
    {
      '@type': 'Article',
      '@id': `${ORIGIN}${url}#article`,
      headline: a.h1 || a.title,
      description: a.desc,
      inLanguage: LANGS[lang].hreflang,
      datePublished: a.published,
      dateModified: a.updated || a.published,
      author: { '@type': 'Organization', name: 'NoorWaqt' },
      publisher: {
        '@type': 'Organization',
        name: 'NoorWaqt',
        url: `${ORIGIN}/`,
        logo: { '@type': 'ImageObject', url: `${ORIGIN}/noorwaqt.png` },
      },
      mainEntityOfPage: `${ORIGIN}${url}`,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'NoorWaqt', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: ui.hubTitle, item: `${ORIGIN}${path(lang)}` },
        { '@type': 'ListItem', position: 3, name: a.h1 || a.title },
      ],
    },
  ];

  // FAQPage 只在真有问答时才发。空的 mainEntity 会被判为无效结构化数据。
  if (a.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${ORIGIN}${url}#faq`,
      inLanguage: LANGS[lang].hreflang,
      mainEntity: a.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

// ── 组装 ────────────────────────────────────────────────

function articlePage(lang, a, all, ui) {
  const url = path(lang, a.slug);
  const alts = alternates(all, a.slug);
  const others = all[lang].filter((x) => x.slug !== a.slug).slice(0, 4);

  const faqBlock = a.faq?.length ? `
<section class="faq">
  <h2 id="faq">${esc(ui.faqTitle)}</h2>
  ${a.faq.map((f) => `<details><summary>${inline(f.q)}</summary><p>${inline(f.a)}</p></details>`).join('\n  ')}
</section>` : '';

  const related = others.length ? `
<section class="related">
  <h2>${esc(ui.relatedTitle)}</h2>
  <ul class="related-list">
    ${others.map((o) => `<li><a href="${path(lang, o.slug)}"><b>${esc(o.title)}</b><span>${esc(o.desc)}</span></a></li>`).join('\n    ')}
  </ul>
</section>` : '';

  return head({ lang, url, title: `${a.title} — NoorWaqt`, desc: a.desc, alts, jsonld: articleJsonLd({ lang, url, a, ui }) })
    + nav(lang, ui)
    + `
<main class="guide wrap">
  <nav class="crumbs" aria-label="breadcrumb">
    <a href="/">NoorWaqt</a> <span>/</span> <a href="${path(lang)}">${esc(ui.hubTitle)}</a>
  </nav>

  <article class="prose">
    <h1>${esc(a.h1 || a.title)}</h1>
    <p class="lead">${inline(a.lead)}</p>
    <p class="meta">${esc(ui.updated)} ${esc(a.updated || a.published)}${a.madhhab ? ` · ${esc(a.madhhab)}` : ''}</p>
    ${langSwitch(lang, url, alts, ui)}

    <div class="callout callout-review">
      <p>${inline(ui.reviewNotice)}</p>
    </div>

${render(a.body)}

    <div class="callout">
      <p>${inline(ui.disclaimer)}</p>
    </div>
  </article>
${faqBlock}
${cta(ui)}
${related}
</main>`
    + footer(lang, ui);
}

function hubPage(lang, all, ui) {
  const url = path(lang);
  const alts = Object.keys(all);
  const list = all[lang];

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${ORIGIN}${url}#page`,
        name: ui.hubTitle,
        description: ui.hubDesc,
        inLanguage: LANGS[lang].hreflang,
        isPartOf: { '@type': 'WebSite', name: 'NoorWaqt', url: `${ORIGIN}/` },
      },
      {
        '@type': 'ItemList',
        itemListElement: list.map((a, n) => ({
          '@type': 'ListItem', position: n + 1, name: a.title, url: `${ORIGIN}${path(lang, a.slug)}`,
        })),
      },
    ],
  };

  return head({ lang, url, title: `${ui.hubTitle} — NoorWaqt`, desc: ui.hubDesc, alts, jsonld })
    + nav(lang, ui)
    + `
<main class="guide wrap">
  <nav class="crumbs" aria-label="breadcrumb"><a href="/">NoorWaqt</a> <span>/</span> <span>${esc(ui.hubTitle)}</span></nav>

  <header class="prose">
    <h1>${esc(ui.hubH1)}</h1>
    <p class="lead">${inline(ui.hubLead)}</p>
    ${langSwitch(lang, url, alts, ui)}
    <div class="callout callout-review"><p>${inline(ui.reviewNotice)}</p></div>
  </header>

  <ul class="hub-list">
    ${list.map((a) => `<li>
      <a href="${path(lang, a.slug)}">
        <b>${esc(a.h1 || a.title)}</b>
        <span>${esc(a.desc)}</span>
      </a>
    </li>`).join('\n    ')}
  </ul>
${cta(ui)}
</main>`
    + footer(lang, ui);
}

// ── 写盘 ────────────────────────────────────────────────

const write = (rel, html) => {
  const abs = resolve(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, html.trim() + '\n');
};

const langs = readdirSync(SRC).filter((f) => f.endsWith('.mjs')).map((f) => f.replace('.mjs', ''));
const all = {};
const uis = {};
for (const lang of langs) {
  if (!LANGS[lang]) { console.error(`未知语言 ${lang}，请先在 LANGS 里登记`); process.exit(1); }
  const mod = await import(new URL(`./guides/${lang}.mjs`, import.meta.url));
  all[lang] = mod.articles;
  uis[lang] = mod.ui;
}

const urls = [{ loc: `${ORIGIN}/`, pri: '1.0', freq: 'daily' }];

for (const lang of langs) {
  headingSeq = 0;
  write(`${lang}/guide/index.html`, hubPage(lang, all, uis[lang]));
  urls.push({ loc: `${ORIGIN}${path(lang)}`, pri: '0.8', freq: 'weekly' });

  for (const a of all[lang]) {
    headingSeq = 0;
    write(`${lang}/guide/${a.slug}/index.html`, articlePage(lang, a, all, uis[lang]));
    urls.push({ loc: `${ORIGIN}${path(lang, a.slug)}`, pri: '0.7', freq: 'monthly', mod: a.updated || a.published });
  }
  console.log(`${lang}: 1 个栏目页 + ${all[lang].length} 篇文章`);
}

writeFileSync(resolve(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) =>
    `  <url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ''}` +
    `<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`
  ).join('\n') +
  '\n</urlset>\n');

console.log(`sitemap.xml: ${urls.length} 条 URL`);
