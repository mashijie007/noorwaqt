/* build-guides.mjs — 生成 /<lang>/guide/ 下的教法问答页
 *
 *   node tools/build-guides.mjs
 *
 * 内容源是 tools/guides/<lang>.mjs，一个语言一个数组，每篇文章是一个对象。
 * 用 .mjs 而不是 md + front matter，是因为不想为了几行元数据再引一个 YAML
 * 解析器；正文仍然写 Markdown，由 tools/lib/article.mjs 里的 render() 处理
 * 一个够用的子集 —— 那份文件还管导航、页脚、<head>，与起名页共用。
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
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ORIGIN, LANGS, esc, inline, render, resetHeadings,
  head, nav, langSwitch, footer, cta, writeFile,
} from './lib/article.mjs';
import { navItems } from './lib/nav-items.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = resolve(HERE, 'guides');

const path = (lang, slug) => (slug ? `/${lang}/guide/${slug}/` : `/${lang}/guide/`);

/** 一篇文章在哪些语言里有译文 */
function alternates(all, slug) {
  return Object.keys(all).filter((l) => all[l].some((a) => a.slug === slug));
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
    + nav(navItems(lang, ui, 'guide'), ui)
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
    + footer(ui);
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
    + nav(navItems(lang, ui, 'guide'), ui)
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
    + footer(ui);
}

// ── 写盘 ────────────────────────────────────────────────

const write = (rel, html) => writeFile(ROOT, rel, html);

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
  resetHeadings();
  write(`${lang}/guide/index.html`, hubPage(lang, all, uis[lang]));
  urls.push({ loc: `${ORIGIN}${path(lang)}`, pri: '0.8', freq: 'weekly' });

  for (const a of all[lang]) {
    resetHeadings();
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
