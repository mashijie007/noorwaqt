# 首屏文案内联 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首屏 23 个文案键 × 44 种语言在构建期内联进域名根 `/` 的 HTML，配两段同步内联脚本，让首帧画出来就是访客的母语。

**Architecture:** 语言协商逻辑抽成纯函数 `pickLang`，被三方共用（`main.js` import、构建期读源码内联、单测直接调）。构建期在生成 44 个语言页的那个循环里顺手攒下每种语言的首屏子集，在根页面 emit 处注入三段脚本：`</head>` 前放载荷 + A 段（定 `lang`/`dir`/`title`/`description`/`dataset.locale`），`</header>` 后放 B 段（填 `[data-boot]` 文案）。`main.js` 起来后读到 A 段写的 `dataset.locale`，走的还是它原有的第一分支，不会二次跳变。

**Tech Stack:** 原生 ESM（浏览器与 Node 共用同一批文件，无打包步骤）、Node 内置测试写法（手写 `eq()` 断言 + 退出码，与 `tools/lib/_test-prerender.mjs` 一致）。

**Spec:** `docs/superpowers/specs/2026-08-27-boot-i18n-inline-design.md`

## Global Constraints

- **两段内联脚本必须是 ES5 安全的保守写法**：`var` / `function` / `for` 循环，不用箭头函数、可选链、`const`、模板字符串。它们跑在首帧之前，是页面上唯一没有任何兜底的代码。仓库其余浏览器 JS 是 `type="module"`，不受此限。
- **`assets/js/lang-pick.js` 必须零依赖、零副作用**：不 import 任何东西，不碰 `document` / `localStorage` / `navigator`。它会被当成纯文本读出来内联，任何 import 语句都会当场炸掉首帧。
- **载荷序列化必须转义 `<`**：`JSON.stringify(o).replace(/</g, '\\u003c')`。词典里有 `<b>` `<em>`，直接塞进 `<script>` 会被 `</script>` 之类的序列提前截断。现有的 `langHrefScript`（`tools/lib/blocks.mjs:120`）没做这一步，因为它的值只有 URL —— 不要照抄它。
- **占位符一律走构建期现成的机制**：`fill(dict[key], vars)`，`vars` 就是 `build-pages.mjs` 里 `pageVars(dict)` 的产物。不要自己写替换逻辑 —— boot 文案必须与预渲染文案逐字节一致，否则 `main.js` 一起来就会看到一次无谓的跳变。
- **只动域名根 `/`**。`/xx/` 语言页与城市页的产物必须零变化（`data-boot` 属性本身会跟着模板进到 `/xx/` 页面里，这是可以的；脚本和载荷不行）。
- **注释用中文**，与仓库现有风格一致。
- **每个任务结束必须 commit。**

## File Structure

| 文件 | 职责 |
|---|---|
| `assets/js/lang-pick.js` | **新增。** 纯函数 `pickLang(codes, saved, prefs)`，语言协商的唯一实现。 |
| `assets/js/main.js` | **改。** `detectLang()` 改为调用 `pickLang`。 |
| `index.html` | **改。** 首屏 21 个元素加 `data-boot` 标记。 |
| `tools/lib/boot-i18n.mjs` | **新增。** 扫键、攒载荷、出脚本。三个纯函数，不写文件、不读 dist。 |
| `tools/build-pages.mjs` | **改。** 循环里攒载荷，根页面 emit 处注入。 |
| `tools/lib/_test-lang-pick.mjs` | **新增。** `pickLang` 单测。 |
| `tools/lib/_test-boot-i18n.mjs` | **新增。** `boot-i18n.mjs` 三个函数的单测，不依赖 dist。 |
| `tools/verify-dist.mjs` | **改。** 产物级检查：载荷覆盖度、语言数、只有根页面有脚本。 |
| `package.json` | **改。** `test` 脚本跑三个测试文件。 |

单测（不需要构建）与产物检查（需要 dist）分开：前者进 `npm test`，后者进 `npm run verify`。

---

### Task 1: 抽出 `pickLang` 纯函数

把语言协商从 `main.js` 里搬出来，成为可被三方共用的纯函数。这一步单独成任务，是因为它必须**行为完全不变** —— 后面所有任务都建立在"首帧和 `main.js` 挑出同一个语言"之上。

**Files:**
- Create: `assets/js/lang-pick.js`
- Create: `tools/lib/_test-lang-pick.mjs`
- Modify: `assets/js/main.js:9`（加 import）、`assets/js/main.js:30-50`（`detectLang`）
- Modify: `package.json:9`（`test` 脚本）

**Interfaces:**
- Consumes: `assets/js/locale-data.js` 的 `LOCALES`（测试用，取 44 个 code）
- Produces: `pickLang(codes: string[], saved: string|null, prefs: string[]) => string`，兜底返回 `'en'`。Task 4 会把这个文件的源码读成文本内联；Task 5 依赖它已经落地。

- [ ] **Step 1: 写失败的测试**

创建 `tools/lib/_test-lang-pick.mjs`：

```js
/* pickLang 的自测。首帧的语言与 main.js 的语言由同一个函数决定，
 * 它挑错了，用户看到的就是两次跳变 —— 比一次闪烁更难受。
 *   node tools/lib/_test-lang-pick.mjs
 */
import { pickLang } from '../../assets/js/lang-pick.js';
import { LOCALES } from '../../assets/js/locale-data.js';

const CODES = LOCALES.map((l) => l.code);

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};

console.log('pickLang');
eq('上次的选择优先于浏览器偏好', pickLang(CODES, 'ar', ['id-ID']), 'ar');
eq('不认识的保存值被忽略', pickLang(CODES, 'xx', ['id-ID']), 'id');
eq('空保存值不影响协商', pickLang(CODES, null, ['ms-MY']), 'ms');

eq('zh-TW 归繁体', pickLang(CODES, null, ['zh-TW']), 'zh_Hant');
eq('zh-HK 归繁体', pickLang(CODES, null, ['zh-HK']), 'zh_Hant');
eq('zh-MO 归繁体', pickLang(CODES, null, ['zh-MO']), 'zh_Hant');
eq('zh-Hant 归繁体', pickLang(CODES, null, ['zh-Hant']), 'zh_Hant');
eq('zh-CN 归简体', pickLang(CODES, null, ['zh-CN']), 'zh');
eq('光一个 zh 归简体', pickLang(CODES, null, ['zh']), 'zh');

eq('区域码落到基础语言', pickLang(CODES, null, ['fr-CA']), 'fr');
eq('大小写不敏感', pickLang(CODES, null, ['AR-SA']), 'ar');
eq('不支持的语言继续往后找', pickLang(CODES, null, ['pt-BR', 'ru-RU']), 'ru');
eq('全都不支持就回落英文', pickLang(CODES, null, ['pt-BR', 'nl-NL']), 'en');
eq('偏好列表为空回落英文', pickLang(CODES, null, []), 'en');
eq('偏好列表缺失回落英文', pickLang(CODES, null, undefined), 'en');

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: 跑测试确认它失败**

```bash
node tools/lib/_test-lang-pick.mjs
```

预期：`ERR_MODULE_NOT_FOUND`，找不到 `assets/js/lang-pick.js`。

- [ ] **Step 3: 写实现**

创建 `assets/js/lang-pick.js`：

```js
/* lang-pick.js —— 语言协商。纯函数，不碰 DOM、localStorage、navigator。
 *
 * 必须是纯的，因为它有三个消费者：
 *   1. main.js 正常 import
 *   2. 构建期把这个文件的源码当文本读出来、去掉 export，内联进根页面的 boot 脚本
 *   3. tools/lib/_test-lang-pick.mjs 直接调
 * 写死两份拷贝迟早会漂，而漂的后果是首帧和 main.js 挑出两种不同的语言 ——
 * 用户看到的是连闪两次，比什么都不做更糟。
 *
 * 同理：这里不许 import 任何东西。它会被内联成一段没有模块系统的裸脚本。
 */

/**
 * @param {string[]} codes  支持的语言码（LOCALES 的 code 集合）
 * @param {string|null} saved  上次的选择（localStorage 的 nw-lang），没有就传 null
 * @param {string[]} prefs  浏览器偏好（navigator.languages）
 * @returns {string} 语言码，兜底 'en'
 */
export function pickLang(codes, saved, prefs) {
  if (saved && codes.indexOf(saved) >= 0) return saved;

  var list = prefs || [];
  for (var i = 0; i < list.length; i++) {
    var l = String(list[i]).toLowerCase();
    // 中文要先分繁简：zh-TW / zh-HK / zh-MO / zh-Hant 都归繁体
    if (l.indexOf('zh') === 0) return /hant|tw|hk|mo/.test(l) ? 'zh_Hant' : 'zh';
    var base = l.split('-')[0];
    for (var j = 0; j < codes.length; j++) {
      if (codes[j] === base || codes[j].split('_')[0] === base) return codes[j];
    }
  }
  return 'en';
}
```

用 `var` 和索引循环而不是 `const` / `find`，是因为这份源码会被原样内联进首帧脚本 —— 见 Global Constraints。

- [ ] **Step 4: 跑测试确认它通过**

```bash
node tools/lib/_test-lang-pick.mjs
```

预期：15 个 `ok`，末行 `全部通过`，退出码 0。

- [ ] **Step 5: 改 `main.js` 用上它**

`assets/js/main.js:9` 后面加一行 import：

```js
import { pickLang } from './lang-pick.js';
```

把 `assets/js/main.js:30-50` 的整个 `detectLang()` 换成：

```js
function detectLang() {
  // 预渲染页面（/ar/、/id/ 这些）把自己的语言写在 <html data-locale> 上。
  // 那是 URL 和 canonical 共同认定的语言，必须压过浏览器偏好和上次的选择 ——
  // 否则从搜索结果点进 /ar/ 的人，会看着页面自己跳成英文。
  // 域名根没有预渲染的 data-locale，但 head 里的 boot 脚本会把协商结果写上去，
  // 值同样出自 pickLang —— 所以这里读到什么，首帧画的就是什么，不会二次跳变。
  const declared = document.documentElement.dataset.locale;
  if (declared && isSupported(declared)) return declared;

  let saved = null;
  try { saved = localStorage.getItem('nw-lang'); } catch { /* 隐私模式下会抛 */ }

  return pickLang(
    LOCALES.map((l) => l.code),
    saved,
    navigator.languages || [navigator.language || 'en']
  );
}
```

- [ ] **Step 6: 改 `package.json` 的 test 脚本**

把 `package.json:9` 那行换成：

```json
    "test": "node tools/lib/_test-prerender.mjs && node tools/lib/_test-lang-pick.mjs",
```

- [ ] **Step 7: 跑全部测试**

```bash
npm test
```

预期：`_test-prerender.mjs` 的断言全过，接着 `_test-lang-pick.mjs` 15 个 `ok`，退出码 0。

- [ ] **Step 8: 确认站点还能跑**

```bash
npm run build && npm run verify
```

预期：构建输出「语言页 44 种语言 + 域名根」，verify 全绿。这一步只是证明抽函数没有把构建弄坏 —— 此时产物应当与改动前一致。

- [ ] **Step 9: Commit**

```bash
git add assets/js/lang-pick.js assets/js/main.js tools/lib/_test-lang-pick.mjs package.json
git commit -m "refactor(i18n): 语言协商抽成纯函数 pickLang

首帧的 boot 脚本要用同一套规则挑语言，但它跑在模块系统之前，
没法 import main.js。抽成零依赖的纯函数，让构建期可以把源码
当文本读出来内联 —— 而不是复制一份迟早会漂的拷贝。

行为不变，另外给 localStorage 补了 try/catch（隐私模式会抛）。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 模板打 `data-boot` 标记 + 扫键器

首屏范围由模板上的标记定义，构建期扫出来。标记和清单在同一处，改模板的人顺手就加了。

**Files:**
- Modify: `index.html`（21 处加 `data-boot`）
- Create: `tools/lib/boot-i18n.mjs`
- Create: `tools/lib/_test-boot-i18n.mjs`
- Modify: `package.json:9`（`test` 脚本再加一个文件）

**Interfaces:**
- Consumes: 无
- Produces: `bootKeys(html: string) => string[]` —— 返回去重后的键名数组，含模板扫出的键与常量 `EXTRA`。Task 3 的 `bootEntry` 吃它的输出，Task 5 和 Task 6 都会调它。

- [ ] **Step 1: 写失败的测试**

创建 `tools/lib/_test-boot-i18n.mjs`：

```js
/* boot-i18n 的自测。这几个函数决定根页面首帧显示什么，
 * 而它们出错的方式恰恰都不会让构建报错。
 *   node tools/lib/_test-boot-i18n.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT, dictFor, CITIES } from './site.mjs';
import { bootKeys } from './boot-i18n.mjs';

let failed = 0;
const eq = (name, got, want) => {
  if (got === want) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + '\n    got  ' + got + '\n    want ' + want);
};

console.log('bootKeys');
eq('扫出 data-i18n',
  bootKeys('<p data-boot data-i18n="a">x</p>').join(','),
  'a,docTitle,docDesc');

eq('扫出 data-i18n-attr 的键（冒号后半段）',
  bootKeys('<button data-boot data-i18n-attr="aria-label:b"></button>').join(','),
  'b,docTitle,docDesc');

eq('没打标记的不算',
  bootKeys('<p data-i18n="a">x</p><p data-boot data-i18n="c">y</p>').join(','),
  'c,docTitle,docDesc');

eq('属性顺序反过来也认',
  bootKeys('<p data-i18n="a" data-html data-boot>x</p>').join(','),
  'a,docTitle,docDesc');

eq('重复的键只留一个',
  bootKeys('<p data-boot data-i18n="a">x</p><p data-boot data-i18n="a">y</p>').join(','),
  'a,docTitle,docDesc');

eq('EXTRA 不会重复追加',
  bootKeys('<p data-boot data-i18n="docTitle">x</p>').join(','),
  'docTitle,docDesc');

console.log('真模板');
const template = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const keys = bootKeys(template);
eq('模板里共 23 个首屏键', keys.length, 23);
for (const k of ['navGlobal', 'navDownload', 'heroTitle', 'heroLive', 'litPill',
  'litShareAria', 'heroCta2', 'heroHintTime', 'timeNow', 'docTitle', 'docDesc']) {
  eq('含 ' + k, keys.includes(k), true);
}
eq('折叠线以下的键不在内', keys.includes('barsTitle'), false);
eq('页脚的键不在内', keys.includes('privacyTitle'), false);

console.log(failed ? '\n' + failed + ' 个断言没过' : '\n全部通过');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: 跑测试确认它失败**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：`ERR_MODULE_NOT_FOUND`，找不到 `./boot-i18n.mjs`。

- [ ] **Step 3: 写 `bootKeys`**

创建 `tools/lib/boot-i18n.mjs`：

```js
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
```

- [ ] **Step 4: 跑测试 —— 单元断言该过了，真模板那几条该挂**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：`bootKeys` 那 6 条 `ok`；「模板里共 23 个首屏键」FAIL（`got 2 want 23`，只剩 EXTRA），后面 `含 xxx` 一片 FAIL。模板还没打标记，这是对的。

- [ ] **Step 5: 给模板打 21 处标记**

在 `index.html` 下列元素的开标签里加一个 `data-boot` 属性（加在 `data-i18n` / `data-i18n-attr` 后面即可，不动其他任何内容）：

| 行 | 锚点 |
|---|---|
| 31 | `data-i18n="navGlobal"` |
| 32 | `data-i18n="navRamadan"` |
| 33 | `data-i18n="navWomen"` |
| 34 | `data-i18n="navGuide"` |
| 35 | `data-i18n="navPrivacy"` |
| 40 | `data-i18n="navDownload"` |
| 63 | `data-i18n="heroEyebrow"` |
| 64 | `data-i18n="heroTitle"` |
| 65 | `data-i18n="heroLead"` |
| 67 | `data-i18n="heroLive"`（`<span id="live-count">` 那个，不是外层 `<p>`） |
| 70 | `data-i18n="litPill"`（`<span id="lit-count">`） |
| 71 | `data-i18n-attr="aria-label:litShareAria"` |
| 75 | `data-i18n="heroCta"` |
| 76 | `data-i18n="heroCta2"` |
| 83 | `data-i18n="heroHintDrag"` |
| 84 | `data-i18n="heroHintTap"` |
| 85 | `data-i18n="heroHintTime"` |
| 87 | `data-i18n="timeLead"` |
| 91 | `data-i18n="timeTitle"` |
| 95 | `data-i18n="timePlay"` |
| 96 | `data-i18n="timeNow"` |

例如第 31 行：

```html
    <a href="#global" data-i18n="navGlobal" data-boot>全球礼拜</a>
```

第 64 行：

```html
      <h1 data-i18n="heroTitle" data-html data-boot>此刻，世界各地的<em>穆斯林正在礼拜</em>。</h1>
```

第 71 行：

```html
        <button class="lit-share-btn" id="lit-share" data-i18n-attr="aria-label:litShareAria" data-boot aria-label="邀请好友一起点亮">↗</button>
```

- [ ] **Step 6: 数一遍标记数量**

```bash
grep -c "data-boot" index.html
```

预期：`21`。

再确认没有标到折叠线以下（`</header>` 在第 102 行）：

```bash
awk 'NR>102 && /data-boot/ {print NR": "$0}' index.html
```

预期：无输出。

- [ ] **Step 7: 跑测试确认全过**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：全部 `ok`，末行 `全部通过`，退出码 0。

- [ ] **Step 8: 改 `package.json` 的 test 脚本**

```json
    "test": "node tools/lib/_test-prerender.mjs && node tools/lib/_test-lang-pick.mjs && node tools/lib/_test-boot-i18n.mjs",
```

- [ ] **Step 9: 跑全部测试 + 构建**

```bash
npm test && npm run build && npm run verify
```

预期：三个测试文件全过；构建正常；verify 全绿。此时 `data-boot` 只是个没人读的属性，产物除了多出这 21 个属性以外不该有别的变化。

- [ ] **Step 10: Commit**

```bash
git add index.html tools/lib/boot-i18n.mjs tools/lib/_test-boot-i18n.mjs package.json
git commit -m "feat(i18n): 首屏范围用 data-boot 标在模板上，构建期扫出来

首屏键清单如果写死在构建脚本里，模板一改就漂，而漂的表现是
那几处又开始闪 —— 不报错，没人发现。标在模板上，改的人顺手就加了。

折叠线取 </header>：hero 是整屏高的 header，边界不随视口变。
共 21 处标记 + docTitle/docDesc 两个非 DOM 键 = 23 个。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 攒载荷 `bootEntry`

把某一种语言的首屏子集从已经算好的词典里摘出来。**关键在于复用构建期现成的 `fill` 与 `pageVars`** —— boot 文案必须与预渲染文案逐字节一致。

**Files:**
- Modify: `tools/lib/boot-i18n.mjs`（加 `bootEntry`）
- Modify: `tools/lib/_test-boot-i18n.mjs`（加断言）

**Interfaces:**
- Consumes: `bootKeys()` 的输出；`tools/lib/prerender.mjs` 的 `fill(s, vars)`
- Produces: `bootEntry(dict: object, vars: object, keys: string[]) => object` —— 键值都是**未转义的原始字符串**（`<b>` 保持原样）。Task 4 的 `bootScripts` 和 Task 5 的构建循环都用它。

为什么值不转义：B 段脚本用 `textContent` / `innerHTML` 赋值，规则与 `main.js:73-81` 的 `applyLang()` 逐条对齐 —— `applyLang` 拿到的也是原始词典值。转义会让 `data-html` 的元素显示出生的 `&lt;b&gt;`。

- [ ] **Step 1: 写失败的测试**

在 `tools/lib/_test-boot-i18n.mjs` 里，把 import 那行改成：

```js
import { bootKeys, bootEntry } from './boot-i18n.mjs';
```

并在 `console.log('真模板')` 那一段**之前**插入：

```js
console.log('bootEntry');
eq('只取要的键',
  JSON.stringify(bootEntry({ a: 'A', b: 'B', c: 'C' }, {}, ['a', 'c'])),
  '{"a":"A","c":"C"}');

eq('占位符按构建期的值填上',
  bootEntry({ x: '<b>{n}</b> cities' }, { n: 152 }, ['x']).x,
  '<b>152</b> cities');

eq('HTML 保持原样不转义',
  bootEntry({ x: 'New <em>hi</em> & bye' }, {}, ['x']).x,
  'New <em>hi</em> & bye');

eq('缺的键直接不出现',
  JSON.stringify(bootEntry({ a: 'A' }, {}, ['a', 'zzz'])),
  '{"a":"A"}');
```

再在文件末尾、`console.log(failed ...)` **之前**插入一段真词典的断言：

```js
console.log('真词典');
const arDict = dictFor('ar');
const arVars = { n: CITIES.length, total: CITIES.length, lit: '—' };
const ar = bootEntry(arDict, arVars, keys);
eq('ar 的 23 个键都在', Object.keys(ar).length, 23);
eq('ar 里没有残留占位符', /\{(n|lit|total)\}/.test(JSON.stringify(ar)), false);
eq('ar 的 heroTitle 是阿拉伯语', /[؀-ۿ]/.test(ar.heroTitle), true);
eq('az 缺 navGuide 时回落英文基线',
  bootEntry(dictFor('az'), arVars, ['navGuide']).navGuide,
  dictFor('en').navGuide);
```

- [ ] **Step 2: 跑测试确认新断言失败**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：`SyntaxError` 或 `bootEntry is not a function` —— `boot-i18n.mjs` 还没导出它。

- [ ] **Step 3: 写实现**

在 `tools/lib/boot-i18n.mjs` 的 import 区加：

```js
import { fill } from './prerender.mjs';
```

并在 `bootKeys` 后面加：

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：全部 `ok`，末行 `全部通过`，退出码 0。

- [ ] **Step 5: Commit**

```bash
git add tools/lib/boot-i18n.mjs tools/lib/_test-boot-i18n.mjs
git commit -m "feat(i18n): bootEntry —— 从构建期现成的词典里摘首屏子集

刻意吃 build-pages 主循环已经算好的 dict 和 vars，而不是自己去读
assets/locales/*.json：boot 文案与预渲染文案必须逐字节一致，
对不上就会在 main.js 起来的那一刻跳一下 —— 正是这次要消掉的东西。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 生成三段脚本 `bootScripts`

把载荷和两段内联脚本拼成可插入的 HTML 字符串。这一步的全部风险在**转义**和**内联源码的正确性**上。

**Files:**
- Modify: `tools/lib/boot-i18n.mjs`（加 `bootScripts`）
- Modify: `tools/lib/_test-boot-i18n.mjs`（加断言）

**Interfaces:**
- Consumes: `assets/js/lang-pick.js` 的源码文本；`bootEntry()` 攒出来的载荷
- Produces: `bootScripts(boot: {d: object, dir: object}) => {head: string, body: string}` —— `head` 是「载荷 + A 段」，整体插到 `</head>` 前；`body` 是 B 段，插到 `</header>` 后。Task 5 用它。

- [ ] **Step 1: 写失败的测试**

把 import 那行改成：

```js
import { bootKeys, bootEntry, bootScripts } from './boot-i18n.mjs';
```

在 `console.log(failed ...)` 之前插入：

```js
console.log('bootScripts');
const s = bootScripts({ d: { en: { docTitle: 'T <b>x</b>' }, ar: { docTitle: 'ت' } }, dir: { en: 'ltr', ar: 'rtl' } });

eq('载荷里的尖括号被转义', s.head.indexOf('<b>x</b>'), -1);
eq('转义成 \\u003c', s.head.includes('\\u003cb\\u003e'), true);
eq('载荷挂在 window 上', s.head.includes('window.NW_I18N_BOOT='), true);
eq('pickLang 源码被内联进来', s.head.includes('function pickLang'), true);
eq('内联的源码里没有 export', /\bexport\b/.test(s.head), false);
eq('A 段写 data-locale', s.head.includes("'data-locale'"), true);
eq('A 段不用箭头函数', s.head.includes('=>'), false);
eq('B 段扫 data-boot', s.body.includes('[data-boot]'), true);
eq('B 段认 data-html', s.body.includes('data-html'), true);
eq('B 段认 data-i18n-attr', s.body.includes('data-i18n-attr'), true);
eq('B 段不用箭头函数', s.body.includes('=>'), false);
eq('两段都包了 try', s.head.includes('try') && s.body.includes('try'), true);
```

- [ ] **Step 2: 跑测试确认它失败**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：`bootScripts is not a function`。

- [ ] **Step 3: 写实现**

在 `tools/lib/boot-i18n.mjs` 末尾加：

```js
/**
 * 载荷的序列化。必须把 < 转义掉 —— 词典里有 <b> <em>，
 * 原样塞进 <script> 里，一个 </script> 序列就能把整段脚本提前截断。
 * blocks.mjs 里的 langHrefScript 没做这一步，因为它的值只有 URL：不要照抄它。
 */
const forScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** pickLang 的源码，去掉 export —— 内联进去的是一段没有模块系统的裸脚本 */
const pickLangSource = () =>
  readFileSync(resolve(ROOT, 'assets/js/lang-pick.js'), 'utf8').replace(/^export\s+/m, '');

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
```

注意 A 段用 `el.setAttribute('data-locale', code)` 而不是 `el.dataset.locale = code` —— 两者等价，前者在老引擎上更稳，且读起来与 `setHtmlAttrs` 的产物一致。

- [ ] **Step 4: 跑测试确认通过**

```bash
node tools/lib/_test-boot-i18n.mjs
```

预期：全部 `ok`，末行 `全部通过`，退出码 0。

- [ ] **Step 5: 确认内联出来的脚本语法真的成立**

```bash
node -e "
import('./tools/lib/boot-i18n.mjs').then(async (m) => {
  const s = m.bootScripts({ d: { en: { docTitle: 'T' } }, dir: { en: 'ltr' } });
  const src = (s.head + s.body).replace(/<\/?script>/g, '');
  new Function(src);
  console.log('两段脚本语法 OK，长度', src.length);
});
"
```

预期：打印 `两段脚本语法 OK，长度 <数字>`。`new Function` 只做语法检查，不执行 —— 抛 `SyntaxError` 就说明拼串拼错了。

- [ ] **Step 6: Commit**

```bash
git add tools/lib/boot-i18n.mjs tools/lib/_test-boot-i18n.mjs
git commit -m "feat(i18n): bootScripts —— 载荷 + 两段首帧内联脚本

分两段是因为生效时刻不同：A 段在 head 里定 lang/dir，RTL 语言
才不会看到布局从左到右翻一次；B 段要等 hero 的 DOM 存在。

载荷序列化把 < 转义成 \\u003c —— 词典里有 <b>，原样塞进 script
一个 </script> 就能截断整段。写法保守到 ES5：这两段跑在首帧之前，
是页面上唯一没有兜底的代码。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 接进 `build-pages.mjs`，只注入根页面

**Files:**
- Modify: `tools/build-pages.mjs:14-22`（import）、`:71-77`（循环前）、`:78-83`（循环内）、`:141-143`（根页面 emit）

**Interfaces:**
- Consumes: `bootKeys()`、`bootEntry()`、`bootScripts()`
- Produces: `dist/index.html` 里的 `window.NW_I18N_BOOT` + 两段脚本。Task 6 的 verify 检查读它。

- [ ] **Step 1: 加 import**

在 `tools/build-pages.mjs` 的 import 区（`blocks.mjs` 那行之后）加：

```js
import { bootKeys, bootEntry, bootScripts } from './lib/boot-i18n.mjs';
```

- [ ] **Step 2: 循环前准备容器**

把 `tools/build-pages.mjs:71-74` 那几行：

```js
  const template = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const codes = LOCALES.map((l) => l.code);
  const hrefFor = (c) => abs(langPath(c));
  let rootHtml = null;
```

改成：

```js
  const template = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const codes = LOCALES.map((l) => l.code);
  const hrefFor = (c) => abs(langPath(c));
  let rootHtml = null;

  // 域名根的首屏文案载荷。趁这个循环把每种语言的子集攒下来 ——
  // 用的是下面同一份 dict 和 vars，boot 文案与预渲染文案因此逐字节一致
  const BOOT_KEYS = bootKeys(template);
  const boot = { d: {}, dir: {} };
```

- [ ] **Step 3: 循环内攒载荷**

在 `tools/build-pages.mjs:79-80` 的 `const dict = dictFor(code);` / `const vars = pageVars(dict);` 之后、`const url = hrefFor(code);` 之前插入一行：

```js
    boot.d[code] = bootEntry(dict, vars, BOOT_KEYS);
    boot.dir[code] = dirOf(code);
```

- [ ] **Step 4: 根页面注入**

把 `tools/build-pages.mjs:141-143`：

```js
  // 域名根：内容用英文那一份，但去掉 data-locale —— 根地址是语言协商页，
  // 得让 main.js 照旧按浏览器偏好自动切，而不是被钉死在英文。
  // canonical 保持指向 /en/，所以 / 和 /en/ 不会当成两份内容互相抢排名。
  emit('/index.html', rootHtml.replace(/\sdata-locale="[^"]*"/, ''));
```

改成：

```js
  // 域名根：内容用英文那一份，但去掉 data-locale —— 根地址是语言协商页，
  // 得让 main.js 照旧按浏览器偏好自动切，而不是被钉死在英文。
  // canonical 保持指向 /en/，所以 / 和 /en/ 不会当成两份内容互相抢排名。
  //
  // 光去掉 data-locale 还不够：main.js 是 module、天生 defer，在首帧之后
  // 执行是常态，所以非英语访客总要先看一屏英文。两段内联脚本把首屏那 23 个键
  // 提前到首帧之前 —— 只有根页面需要这个，/xx/ 页面的文案本来就是静态的。
  let root = rootHtml.replace(/\sdata-locale="[^"]*"/, '');
  const scripts = bootScripts(boot);
  root = injectHead(root, scripts.head);
  root = root.replace('</header>', '</header>\n' + scripts.body);
  emit('/index.html', root);
```

`</header>` 在模板里只出现一次（hero 的收尾，`index.html:102`），字符串替换是安全的。

- [ ] **Step 5: 构建并确认载荷落地**

```bash
npm run build
```

预期：正常输出，「语言页 44 种语言 + 域名根」。

```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/index.html','utf8');
const m=/window\.NW_I18N_BOOT=(.+?);<\/script>/.exec(h);
const b=JSON.parse(m[1]);
console.log('语言数', Object.keys(b.d).length);
console.log('每种语言的键数', new Set(Object.values(b.d).map(o=>Object.keys(o).length)));
console.log('ar 的 dir', b.dir.ar, '/ en 的 dir', b.dir.en);
console.log('ar heroTitle:', b.d.ar.heroTitle);
console.log('残留占位符', /\{(n|lit|total)\}/.test(m[1]));
console.log('页面大小', (h.length/1024).toFixed(1)+'KB');
"
```

预期：语言数 `44`；键数集合是 `Set { 23 }`；`ar 的 dir rtl / en 的 dir ltr`；`ar heroTitle` 是阿拉伯语；残留占位符 `false`；页面大小约 108KB。

- [ ] **Step 6: 确认 `/xx/` 页面没被污染**

```bash
grep -c "NW_I18N_BOOT" dist/en/index.html dist/ar/index.html dist/id/index.html dist/zh/prayer-times/index.html
```

预期：四个都是 `0`。

- [ ] **Step 7: 跑既有的验证**

```bash
npm test && npm run verify
```

预期：三个测试文件全过；verify 全绿 —— 尤其是「占位符未填」那条不该被载荷触发（Task 3 已经把它们烤掉了）。

- [ ] **Step 8: 在真浏览器里确认它工作**

用 Browser pane 打开构建产物：起 `npm run preview`（`dist` 目录，4190 端口），访问 `http://localhost:4190/`，然后读页面：

- `document.documentElement.getAttribute('data-locale')` 应该是浏览器语言协商的结果
- `document.querySelector('[data-i18n="heroTitle"]').textContent` 应该已经是该语言
- 控制台无报错

- [ ] **Step 9: Commit**

```bash
git add tools/build-pages.mjs
git commit -m "feat(i18n): 域名根注入首屏文案载荷与两段内联脚本

趁生成 44 个语言页的循环把每种语言的首屏子集攒下来，用的是同一份
dict 和 vars —— boot 文案与预渲染文案因此逐字节一致。

只注入 /。/xx/ 页面的文案本来就是静态的，一个字节都不加。
根页面 brotli 从 7.4KB 涨到约 28KB，这是全语言覆盖换来零猜测的价。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 产物级检查进 `verify-dist`

单测保不住的是「标记加了但构建没扫到」这类情形 —— 页面照常出，只是那几处又开始闪。这正是 `verify-dist.mjs` 开头写的那种"不会让构建报错的问题"。

**Files:**
- Modify: `tools/verify-dist.mjs:16`（import）、`:52-59` 附近（加检查）

**Interfaces:**
- Consumes: `bootKeys()`、`dist/index.html`
- Produces: 无（终点）

- [ ] **Step 1: 加 import**

`tools/verify-dist.mjs:16` 之后加：

```js
import { bootKeys } from './lib/boot-i18n.mjs';
```

并在同文件已有的 `import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';` 基础上确认 `readFileSync` 已在（它在）。

- [ ] **Step 2: 写检查**

在 `tools/verify-dist.mjs` 的 for 循环**之后**、「6. 站点地图」那段之前，插入：

```js
  // 7. 域名根的首屏载荷。这一项失效的方式很安静：页面照常出，
  //    只是首屏那几处又开始先英文后母语 —— 没有任何东西会报错。
  const rootFile = resolve(DIST, 'index.html');
  if (!existsSync(rootFile)) {
    note('根页面不存在', 'index.html', '');
  } else {
    const rootHtml = readFileSync(rootFile, 'utf8');
    const m = /window\.NW_I18N_BOOT=(.+?);<\/script>/.exec(rootHtml);
    if (!m) {
      note('根页面缺首屏文案载荷', 'index.html', 'window.NW_I18N_BOOT');
    } else {
      let boot = null;
      try { boot = JSON.parse(m[1]); } catch { note('首屏载荷不是合法 JSON', 'index.html', ''); }
      if (boot) {
        const want = bootKeys(readFileSync(resolve(ROOT, 'index.html'), 'utf8'));
        const langs = Object.keys(boot.d || {});
        if (langs.length !== LOCALES.length) {
          note('首屏载荷语言数对不上', 'index.html', langs.length + ' / 应为 ' + LOCALES.length);
        }
        for (const code of langs) {
          const missing = want.filter((k) => boot.d[code][k] == null);
          if (missing.length) {
            note('首屏载荷缺键', 'index.html', code + ' 缺 ' + missing.join(' '));
            break;
          }
        }
        if (!boot.dir || Object.keys(boot.dir).length !== langs.length) {
          note('首屏载荷缺书写方向表', 'index.html', '');
        }
      }
    }
    // 两段脚本只该出现在根页面上
    for (const file of files) {
      if (rel(file) === 'index.html') continue;
      if (readFileSync(file, 'utf8').includes('NW_I18N_BOOT')) {
        note('首屏载荷漏进了非根页面', rel(file), '');
        break;
      }
    }
  }
```

`ROOT` 与 `LOCALES` 需要从 `./lib/site.mjs` 引入 —— 把 `tools/verify-dist.mjs:16` 的那行改成：

```js
import { ROOT, DIST, SITE, LOCALES, PENDING_PREFIXES } from './lib/site.mjs';
```

- [ ] **Step 3: 跑 verify 确认通过**

```bash
npm run build && npm run verify
```

预期：全绿，退出码 0。

- [ ] **Step 4: 故意弄坏它，确认检查真的会响**

模拟「有人在模板上加了标记，但没重新构建」—— 给折叠线以下的 `barsTitle` 打个标记，**不重新构建**，直接跑 verify：

```bash
sed -i 's/data-i18n="barsTitle"/data-i18n="barsTitle" data-boot/' index.html && node tools/verify-dist.mjs; echo "退出码 $?"
```

预期：报「首屏载荷缺键 ... 缺 barsTitle」，退出码非 0。这正是这条检查存在的理由 —— 构建本身不会对此说一个字。

- [ ] **Step 5: 恢复模板**

```bash
git checkout index.html && npm run build && npm run verify
```

预期：全绿。

- [ ] **Step 6: Commit**

```bash
git add tools/verify-dist.mjs
git commit -m "test(i18n): verify-dist 查首屏载荷的覆盖度与落点

单测保不住的是「标记加了但构建没扫到」：页面照常出，只是那几处
又开始闪，没有任何东西会报错。查三件事 —— 载荷键集合盖住模板的
data-boot、44 种语言齐全、脚本没漏进 /xx/ 和城市页。

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: 慢网真机验证

前六个任务证明的是「载荷正确、脚本落位」。这一步证明的是**用户真的不再看到英文**。这是唯一能验证"首帧"的办法 —— 没有任何静态检查能替代它。

**Files:** 无（只读验证）

**Interfaces:**
- Consumes: Task 5 产出的 `dist/index.html`
- Produces: 无（终点）

- [ ] **Step 1: 起本地预览**

```bash
npm run preview
```

预期：4190 端口起来，serve `dist/`。

- [ ] **Step 2: 印尼语 + Slow 4G，看首帧**

在 Browser pane 里：把语言偏好设成 `id-ID`，网络限速到 Slow 4G，访问 `http://localhost:4190/`，截图。

预期：**首帧的 `<h1>` 就是印尼语**，没有任何一帧是英文。

对照组：同样条件下访问 `http://localhost:4190/en/`（预渲染的英文页，不带 boot 脚本）作为"英文长什么样"的参照；要看改动前的闪烁，用 `git stash` 把改动收起来重新构建、录一遍，再 `git stash pop`。有对照才知道改动确实起了作用。

- [ ] **Step 3: 阿拉伯语，看 RTL 首帧**

语言偏好设成 `ar-SA`，重新加载，截图。

预期：首帧就是右起布局，`<html dir="rtl">`，导航栏在右边，没有从左到右翻转一次的过程。

- [ ] **Step 4: 确认 main.js 起来后没有二次跳变**

在页面上读：

```js
document.documentElement.getAttribute('data-locale')
```

再等两秒重读一次，并读 `document.querySelector('[data-i18n="heroTitle"]').textContent`。

预期：两次 `data-locale` 相同；`heroTitle` 前后一致，没有变化。控制台无报错。

- [ ] **Step 5: 确认语言选择器还能用**

在页面上把语言选择器切到别的语言。

预期：文案原地切换（根页面没有 `window.NW_LANG_HREF`，不该跳转），`localStorage` 的 `nw-lang` 被写上。刷新后停在新语言 —— 这一条同时验证了 A 段的 `saved` 分支。

- [ ] **Step 6: 隐私模式兜底**

在无痕窗口里访问 `http://localhost:4190/`。

预期：正常按浏览器语言显示，控制台无报错（`localStorage` 在部分配置下会抛，A 段的 try/catch 该吞掉它）。

- [ ] **Step 7: 记一笔实测数字，收尾**

把 Step 2 / Step 3 的截图和观察到的首帧表现补进设计稿的「代价」一节下面，然后：

```bash
git add docs/superpowers/specs/2026-08-27-boot-i18n-inline-design.md
git commit -m "docs: 补首屏内联的慢网实测结果

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## 与设计稿的一处偏离

设计稿里 `boot-i18n.mjs` 自己去读 `assets/locales/*.json` 并手写占位符替换。实现时改成**吃 `build-pages.mjs` 主循环已经算好的 `dict` 和 `vars`**（Task 3 / Task 5）。

原因：`pageVars()`（`tools/build-pages.mjs:29`）已经定义了 `n: 152`、`lit: '—'` 这套取值，而且 `renderI18n` 用同一份 `vars` 烤静态 HTML。boot 文案若走另一套替换逻辑，两边迟早会对不上 —— 那会在 `main.js` 起来的一刻跳一下，正是这次要消掉的东西。设计稿担心的循环依赖也随之消失：`boot-i18n.mjs` 不再需要 import `build-pages.mjs`。

方向、代价、验收标准都不变。
