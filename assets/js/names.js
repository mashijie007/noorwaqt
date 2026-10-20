/* names.js —— 起名页：生成器 + 名字库检索
 *
 * 在 /<lang>/names/ 加载，三种语言共用这一份。没有后端，213 条名字连同
 * 筛选全在前端跑完 —— 起名是个要反复按几十次「再来一批」的动作，
 * 每次都走一趟网络不如本地算。
 *
 * 两块互不相干的功能共用一份数据：
 *   1. 生成器：按性别 + 主题随机抽，拼成 ism + nasab 的古典全名
 *   2. 名字库：全量表格 + 即时检索，给已经有候选名、只想查词义的人
 *
 * 文案不写死在这里：页面上有一个 <script type="application/json" id="n-ui">，
 * 由 tools/build-names.mjs 按语言塞进去。词义同理，走 names-data.js 里
 * 每条名字的 m.{lang}。多一种语言不用动这个文件。
 *
 * 随机不去重历史：连着按两次出现同一个名字是可以接受的，为了避免重复
 * 而维护一份已出队列，会让小主题（paradise 只有 4 个名字）很快枯竭成空结果。
 * 但同一批 6 张卡之内不重复 —— 那个一眼就能看出来。
 */
import { NAMES, TAGS, FORBIDDEN_SOLO } from './names-data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 当前语言。缺译时一律退回英文，不留空白 */
const LANG = document.documentElement.dataset.locale || 'en';
const t = (obj) => (obj && (obj[LANG] || obj.en)) || '';

/** 页面文案。{n} 这类占位符由 ui() 填 */
const UI = JSON.parse($('#n-ui')?.textContent || '{}');
const ui = (key, vars) => {
  let s = UI[key] || '';
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};

/** 当前筛选条件。tags 为空集表示不限主题 */
const state = { gender: 'any', tags: new Set(), father: '' };

const BATCH = 6;

/** 阿文字形里的「之子 / 之女」。转写用 bin / bint，与证件上的通行写法一致 */
const NASAB = {
  m: { ar: 'بْن', tr: 'bin' },
  f: { ar: 'بِنْت', tr: 'bint' },
};

/** 页面上显示的阿文：优先带元音符号的写法 */
const shown = (n) => n.av || n.ar;

/** 去掉元音符号，供检索比较。用户输入的可能带符号，也可能不带 */
const stripMarks = (s) => s.replace(/[\u064B-\u0652\u0670]/g, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── 筛选与抽样 ──────────────────────────────────────────

function pool() {
  return NAMES.filter((n) => {
    if (state.gender !== 'any' && n.g !== state.gender) return false;
    if (!state.tags.size) return true;
    // 多选主题之间是「或」：选了 light + nature，两者命中任一即可。
    // 做成「与」的话，三个主题一叠加结果基本必空
    return n.tags.some((tag) => state.tags.has(tag));
  });
}

/** 从 list 里不重复地取 k 个。Fisher–Yates 只洗前 k 位，不用整体打乱 */
function sample(list, k) {
  const a = list.slice();
  const out = [];
  for (let i = 0; i < Math.min(k, a.length); i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
    out.push(a[i]);
  }
  return out;
}

/** 父名输入 → 名字库里的那一条。只认转写，不区分大小写，容忍前后空格 */
function lookupFather(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  return NAMES.find((n) => n.g === 'm' && n.tr.toLowerCase() === q)
    || NAMES.find((n) => n.g === 'm' && n.tr.toLowerCase().replace(/[^a-z]/g, '') === q.replace(/[^a-z]/g, ''))
    || null;
}

// ── 渲染 ────────────────────────────────────────────────

/** 一个名字 + 可选的父名 → 全名的两种写法 */
function fullName(n, father) {
  if (!father) return { ar: shown(n), plain: n.ar, tr: n.tr };
  const k = NASAB[n.g];
  return {
    ar: `${shown(n)} ${k.ar} ${shown(father)}`,
    // 复制用不带符号的：符号在不少系统里会被剥掉或显示成方框，与拉丁拼法同理
    plain: `${n.ar} ${stripMarks(k.ar)} ${father.ar}`,
    tr: `${n.tr} ${k.tr} ${father.tr}`,
  };
}

function card(n, father) {
  const full = fullName(n, father);
  const tags = n.tags.map((tag) => `<span class="n-tag">${esc(t(TAGS[tag]))}</span>`).join('');
  return `
<article class="n-card">
  <p class="n-ar" lang="ar" dir="rtl">${esc(full.ar)}</p>
  <h3 class="n-tr">${esc(full.tr)}</h3>
  <p class="n-meaning">${esc(t(n.m))}</p>
  <p class="n-tags"><span class="n-sex n-sex-${n.g}">${esc(ui(n.g === 'm' ? 'boy' : 'girl'))}</span>${tags}</p>
  ${n.n ? `<p class="n-note">${esc(t(n.n))}</p>` : ''}
  <button class="n-copy" type="button" data-copy="${esc(full.tr)} — ${esc(full.plain)}">${esc(ui('copy'))}</button>
</article>`;
}

function generate() {
  const list = pool();
  const out = $('#n-results');
  const father = lookupFather(state.father);
  const hint = $('#n-father-hint');

  // 阿文片段一律包 <bdi>：混排时中性字符（括号、句点）会被双向算法
  // 算进阿文那一段，渲染出来左右括号是对调的
  if (state.father.trim() && !father) {
    hint.innerHTML = esc(ui('fatherUnknown'));
  } else if (father) {
    hint.innerHTML = ui('fatherReading', {
      name: esc(father.tr),
      ar: `<bdi lang="ar">${esc(shown(father))}</bdi>`,
    });
  } else {
    hint.innerHTML = '';
  }

  // 计数先写，再决定渲染什么：写在后面的话，筛成空集时这一行会停在上一次的数字
  $('#n-count').textContent = ui('matchCount', { n: list.length });

  if (!list.length) {
    out.innerHTML = `<p class="n-empty">${esc(ui('noMatch'))}</p>`;
    return;
  }

  out.innerHTML = sample(list, BATCH).map((n) => card(n, father)).join('');
}

// ── 名字库表格 ──────────────────────────────────────────

function renderTable(q = '') {
  const needle = q.trim().toLowerCase();
  const arNeedle = stripMarks(q.trim());
  const rows = NAMES.filter((n) =>
    !needle
    || n.tr.toLowerCase().includes(needle)
    || n.ar.includes(arNeedle)
    || t(n.m).toLowerCase().includes(needle)
    || n.tags.some((tag) => t(TAGS[tag]).toLowerCase().includes(needle))
  );

  $('#n-table-count').textContent = rows.length === NAMES.length
    ? ui('tableAll', { n: NAMES.length })
    : ui('tableSome', { k: rows.length, n: NAMES.length });

  $('#n-table-body').innerHTML = rows.length
    ? rows.map((n) => `<tr>
        <td lang="ar" dir="rtl" class="n-cell-ar">${esc(shown(n))}</td>
        <td class="n-cell-tr">${esc(n.tr)}</td>
        <td>${esc(t(n.m))}${n.n ? `<small>${esc(t(n.n))}</small>` : ''}</td>
        <td class="n-cell-sex">${esc(ui(n.g === 'm' ? 'boy' : 'girl'))}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="n-empty">${esc(ui('tableEmpty'))}</td></tr>`;
}

// ── 绑定 ────────────────────────────────────────────────

function init() {
  // 主题按钮由数据生成，加一个主题不用回来改 HTML
  $('#n-tags').innerHTML = Object.entries(TAGS)
    .map(([k, label]) => `<button type="button" class="n-chip" data-tag="${k}">${esc(t(label))}</button>`)
    .join('');

  // 「不能单用的尊名」那一组。清单在数据文件里，页面上只留一个空容器
  $('#n-solo').innerHTML = FORBIDDEN_SOLO.map((f) =>
    `<div><b lang="ar" dir="rtl">${esc(f.av || f.ar)}</b>${esc(f.tr)} → <i>${esc(f.fix)}</i></div>`
  ).join('');

  // 父名的候选项：名字库里的全部男名
  $('#n-father-list').innerHTML = NAMES.filter((n) => n.g === 'm')
    .map((n) => `<option value="${esc(n.tr)}">${esc(shown(n))} · ${esc(t(n.m))}</option>`)
    .join('');

  $$('#n-gender button').forEach((b) => b.addEventListener('click', () => {
    state.gender = b.dataset.gender;
    $$('#n-gender button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    generate();
  }));

  $('#n-tags').addEventListener('click', (e) => {
    const b = e.target.closest('.n-chip');
    if (!b) return;
    const tag = b.dataset.tag;
    if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
    b.setAttribute('aria-pressed', String(state.tags.has(tag)));
    generate();
  });

  $('#n-father').addEventListener('input', (e) => { state.father = e.target.value; });
  $('#n-father').addEventListener('change', generate);

  $('#n-go').addEventListener('click', generate);

  // 复制按钮。剪贴板 API 在非 https 下会抛，抛了就只改按钮文案，不弹窗
  $('#n-results').addEventListener('click', async (e) => {
    const b = e.target.closest('.n-copy');
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = ui('copied');
    } catch {
      b.textContent = ui('copyFailed');
    }
    setTimeout(() => { b.textContent = ui('copy'); }, 1600);
  });

  const search = $('#n-search');
  search.addEventListener('input', () => renderTable(search.value));

  generate();
  renderTable();
}

init();
