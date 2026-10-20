/* build-names.mjs — 生成 /<lang>/names/ 起名页
 *
 *   node tools/build-names.mjs
 *
 * 内容源是 tools/names/<lang>.mjs：一个语言一份，ui 是界面文案，
 * page 是这一页的全部内容。正文写 Markdown 子集，与问答页同一个渲染器
 * （tools/lib/article.mjs），导航、页脚、<head> 也都从那里来。
 *
 * 名字库本身不在这里 —— 213 条名字在 assets/js/names-data.js，三种语言
 * 共用同一份数据，每条名字的词义按语言分列。页面只负责把 names.js 需要的
 * 那几句界面文案以 JSON 塞进去，剩下的在浏览器里拼。
 *
 * 之所以不把名字表预渲染进 HTML：213 行 × 3 种语言写进静态页是 300KB 级的
 * 重复内容，而这张表是给人筛着看的，不是给爬虫抓的 —— 真正要被收录的是
 * 上半页那些教法与命名规则。
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

import {
  ORIGIN, LANGS, esc, inline, render, resetHeadings,
  head, nav, langSwitch, footer, cta, writeFile,
} from './lib/article.mjs';
import { navItems, langsOf } from './lib/nav-items.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = resolve(HERE, 'names');

const path = (lang) => `/${lang}/names/`;

/** 正文里放「不能单用的尊名」那一组方块的位置。内容由 names.js 按数据填 */
const SOLO_TOKEN = '<p>[[solo]]</p>';
const SOLO_BLOCK = '<div class="n-solo" id="n-solo"></div>';

function jsonLd({ lang, url, page }) {
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${ORIGIN}${url}#page`,
      name: page.h1,
      description: page.desc,
      inLanguage: LANGS[lang].hreflang,
      isPartOf: { '@type': 'WebSite', name: 'NoorWaqt', url: `${ORIGIN}/` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'NoorWaqt', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb },
      ],
    },
  ];

  // FAQPage 只在真有问答时才发。空的 mainEntity 会被判为无效结构化数据
  if (page.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${ORIGIN}${url}#faq`,
      inLanguage: LANGS[lang].hreflang,
      mainEntity: page.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** 生成器那一块。所有可见文案来自 page，没有一个词写死在这里 */
function tool(page) {
  return `
<section class="n-tool" aria-labelledby="n-tool-h">
  <h2 id="n-tool-h" class="n-label n-label-h">${esc(page.toolTitle)}</h2>

  <div class="n-row">
    <span class="n-label">${esc(page.labelFor)}</span>
    <div class="n-seg" id="n-gender" role="group" aria-label="${esc(page.labelFor)}">
      <button type="button" data-gender="any" aria-pressed="true">${esc(page.forAny)}</button>
      <button type="button" data-gender="m" aria-pressed="false">${esc(page.forBoy)}</button>
      <button type="button" data-gender="f" aria-pressed="false">${esc(page.forGirl)}</button>
    </div>
  </div>

  <div class="n-row">
    <span class="n-label">${esc(page.labelThemes)} <small>${esc(page.themesNote)}</small></span>
    <div class="n-chips" id="n-tags"></div>
  </div>

  <div class="n-row">
    <label class="n-label" for="n-father">${esc(page.labelFather)}</label>
    <input class="n-father" id="n-father" list="n-father-list" autocomplete="off" placeholder="${esc(page.fatherPlaceholder)}">
    <datalist id="n-father-list"></datalist>
    <p class="n-hint" id="n-father-hint"></p>
  </div>

  <div class="n-actions">
    <button class="btn btn-primary" type="button" id="n-go">${esc(page.goBtn)}</button>
    <p class="n-count" id="n-count"></p>
  </div>

  <div class="n-results" id="n-results"></div>
</section>`;
}

/** 名字库那一块。表体由 names.js 填 */
function browse(page) {
  return `
<section class="n-browse" aria-labelledby="browse">
  <div class="n-search-row">
    <input class="n-search" id="n-search" type="search" placeholder="${esc(page.searchPlaceholder)}" aria-label="${esc(page.searchLabel)}">
    <p class="n-count" id="n-table-count"></p>
  </div>
  <div class="n-table-wrap">
    <table class="n-table">
      <thead>
        <tr><th>${esc(page.colArabic)}</th><th>${esc(page.colTranslit)}</th><th>${esc(page.colMeaning)}</th><th>${esc(page.colFor)}</th></tr>
      </thead>
      <tbody id="n-table-body"></tbody>
    </table>
  </div>
</section>`;
}

function namesPage(lang, page, ui, alts) {
  const url = path(lang);

  const faqBlock = page.faq?.length ? `
<section class="faq">
  <h2 id="faq">${esc(ui.faqTitle)}</h2>
  ${page.faq.map((f) => `<details><summary>${inline(f.q)}</summary><p>${inline(f.a)}</p></details>`).join('\n  ')}
</section>` : '';

  const related = page.related?.length ? `
<section class="related">
  <h2>${esc(ui.relatedTitle)}</h2>
  <ul class="related-list">
    ${page.related.map((o) => `<li><a href="${o.href}"><b>${esc(o.title)}</b><span>${esc(o.desc)}</span></a></li>`).join('\n    ')}
  </ul>
</section>` : '';

  return head({
    lang,
    url,
    title: `${page.title} — NoorWaqt`,
    desc: page.desc,
    alts,
    jsonld: jsonLd({ lang, url, page }),
    extraCss: ['/assets/css/names.css'],
    ogType: 'website',
  })
    + nav(navItems(lang, ui, 'names'), ui)
    + `
<main class="guide wrap">
  <nav class="crumbs" aria-label="breadcrumb">
    <a href="/">NoorWaqt</a> <span>/</span> <span>${esc(page.crumb)}</span>
  </nav>

  <article class="prose">
    <h1>${esc(page.h1)}</h1>
    <p class="lead">${inline(page.lead)}</p>
    <p class="meta">${esc(ui.updated)} ${esc(page.updated)}${page.madhhab ? ` · ${esc(page.madhhab)}` : ''}</p>
    ${langSwitch(lang, url, alts, ui)}

    <div class="callout callout-review">
      <p>${inline(page.reviewNotice)}</p>
    </div>
  </article>
${tool(page)}

  <article class="prose">
${render(page.body).replace(SOLO_TOKEN, SOLO_BLOCK)}
  </article>
${browse(page)}

  <article class="prose">
    <div class="callout">
      <p>${inline(page.disclaimer)}</p>
    </div>
  </article>
${faqBlock}
${cta(ui)}
${related}
</main>

<script type="application/json" id="n-ui">${JSON.stringify(page.app)}</script>
<script type="module" src="/assets/js/names.js"></script>`
    + footer(ui);
}

// ── 写盘 ────────────────────────────────────────────────

const langs = readdirSync(SRC).filter((f) => f.endsWith('.mjs')).map((f) => f.replace('.mjs', ''));

// 导航里登记的语言必须与这里真实存在的内容文件一致，否则导航会指向 404
const declared = langsOf('names');
for (const lang of declared) {
  if (!langs.includes(lang)) {
    console.error(`nav-items.mjs 里登记了 names:${lang}，但 tools/names/${lang}.mjs 不存在`);
    process.exit(1);
  }
}

for (const lang of langs) {
  if (!LANGS[lang]) { console.error(`未知语言 ${lang}，请先在 article.mjs 的 LANGS 里登记`); process.exit(1); }
  const mod = await import(new URL(`./names/${lang}.mjs`, import.meta.url));
  resetHeadings();
  writeFile(ROOT, `${lang}/names/index.html`, namesPage(lang, mod.page, mod.ui, langs));
  console.log(`${lang}: 起名页 1 个`);
}
