# 首屏文案内联：消除根页面的语言闪烁

日期：2026-08-27
状态：已批准，待实现

## 问题

域名根 `/` 是语言协商页。构建时特意删掉了 `data-locale`（`tools/build-pages.mjs:143`），让 `main.js` 的 `detectLang()` 按 `navigator.languages` 自动切语言。逻辑本身是对的，但用户看到的是先英文、后母语。

两个原因叠在一起：

1. **网络往返**。`applyLang()` 第一行是 `await loadLocale(lang)`（`assets/js/main.js:63`），要现去 `fetch('/assets/locales/id.json')`。44 份词典没有一份被 preload，移动网络上这一趟轻松几百毫秒。
2. **脚本时机**。`main.js` 是 `<script type="module">`（`index.html:369`），天生 defer，在首帧之后执行是常态。**所以哪怕词典是现成的，只要换文案这件事还挂在 `main.js` 上，就仍会先画一帧英文。**

只解决第 1 条不够。设计必须同时解决第 2 条。

## 不做什么

- **不内联全量词典**。44 份全量合计 430KB，塞进渲染关键路径不可接受。
- **不做服务端 `Accept-Language` 重定向**。站点部署在 GitHub Pages（仓库根有 `CNAME`），没有服务端。
- **不动 `/xx/` 语言页**。它们的文案是预渲染的静态 HTML，`data-locale` 把语言钉死，本来就不闪。这个改动一个字节都不加到它们头上。
- **不动城市页**。城市页加载的是 `city-page.js`（`tools/build-cities.mjs:107`），不走 `main.js` 这条路。

## 三个已定的决定

| 决定 | 选择 | 理由 |
|---|---|---|
| 首屏键清单怎么定义 | 模板里打 `data-boot` 标记，构建扫 DOM | 清单和标记在同一处，改模板的人顺手加。写死在构建脚本里的数组会漂。 |
| 内联覆盖多少语言 | 全部 44 种 | +21.3KB brotli，零猜测零维护。Top-N 方案省 15KB，但要拿真实流量分布来定名单，否则是拍脑袋。 |
| 替换在什么时机执行 | 两段式：head 定 lang/dir，`</header>` 后换文案 | 真正零闪。RTL 语言（ar/fa/ur/ks/ps）首帧就是右起，不会看到布局从左到右翻过去。 |

## 硬约束：占位符必须在构建期烤掉

`tools/verify-dist.mjs:55` 会扫整份 HTML 里没填上的 `{n}` `{total}` 占位符，命中就让流水线停下。而词典里：

```
heroLive => "<b>{n}</b> مدينة داخل وقت صلاة الآن"
litPill  => "أضأتَ <b>{lit}</b>/{total} مدينة"
```

44 份词典原样内联，`npm run verify` 当场红。

所以这几个键的占位符在**构建期**就替换成 `pageVars()`（`tools/build-pages.mjs:30`）现成算出来的那份值，跟 `/xx/` 语言页用的是同一份：`{n}` → 构建期的 `CITIES.length`（当前 152）、`{total}` → 同样是 `CITIES.length`（152）、`{lit}` → `—`（访客自己的本地点亮记录，静态页替不出真实值，用破折号占位）。运行时因此不需要占位符替换引擎，`main.js` 起来后会用真实数字覆盖。

## 首屏范围

折叠线取 `index.html:102` 的 `</header>` —— hero 是整屏高的 header，导航栏、hero 文案、时间轴控件全在里面，边界干净、不随视口变。

共 22 个键：

- **导航**（6）：`navGlobal` `navRamadan` `navWomen` `navGuide` `navPrivacy` `navDownload`
- **hero**（11）：`heroEyebrow` `heroTitle` `heroLead` `heroLive` `litPill` `litShareAria` `heroCta` `heroCta2` `heroHintDrag` `heroHintTap` `heroHintTime`
- **时间轴**（4）：`timeLead` `timeTitle` `timePlay` `timeNow`
- **文档头**（1）：`docTitle`

前 21 个在模板里打 `data-boot`。后 1 个不是 DOM 元素，用构建脚本里的显式常量 `EXTRA = ['docTitle']`。

`docDesc`（`<meta name="description">`）本来也在这份清单里，实现完之后又拿掉了：这个 meta 不会被渲染，爬虫和分享预览抓取的是服务端发出的原始 HTML、不会执行 boot 脚本，而它们真正读到的描述来自 `canonical` 指向的 `/xx/` 页——那份本来就是预渲染好的静态文案。为它多付 4.78KB brotli（占根页面体积的 16%）换不到任何读者，所以删了。

部分语言缺 `navGuide`、`heroEyebrow`。这些键不会被跳过 —— `dictFor()`（`tools/lib/site.mjs:90`）本来就是 `{...EN, ...}` 合并出来的，载荷里装的直接就是英文基线那一份，与运行时 `t()` 的回落结果一致。`bootEntry` 里 `dict[k] == null` 的跳过分支只对真正整个词典都没有的键生效。

## 组件

### ① `assets/js/lang-pick.js`（新增，约 20 行）

把 `main.js:40`–49 的语言协商逻辑（含 zh 繁简分支）抽成纯函数：

```js
export function pickLang(codes, saved, prefs) { ... }
```

不碰 DOM、不碰 localStorage、不碰 `navigator`，三个入参全由调用方给。**这是为了让它有两个消费者而不产生第二份拷贝**：

- `main.js` 正常 `import`
- 构建期读同一个文件的源码文本、去掉 `export ` 前缀，内联进 boot 脚本

纯函数也让它可以单独测。

### ② `assets/js/main.js`（改 1 处）

`detectLang()` 中间那段循环换成 `pickLang(LOCALES.map(l => l.code), localStorage.getItem('nw-lang'), navigator.languages)`。行为不变，其余分支原样保留。

### ③ `index.html`（加约 21 处标记）

在上面列的 21 个元素上加 `data-boot` 属性。纯标记，不改结构、不改现有的 `data-i18n` / `data-html` / `data-i18n-attr`。

### ④ `tools/lib/boot-i18n.mjs`（新增）

一个模块，三件事：

1. **扫键**：从模板 HTML 里正则抓所有带 `data-boot` 的元素的 `data-i18n` / `data-i18n-attr` 键，并上 `EXTRA`。
2. **建载荷**：对 44 份 locale JSON 各取这个键子集，缺键跳过，烤掉 `{n}`/`{lit}`/`{total}`。产出 `{ d: {code: {key: val}}, dir: {code: 'rtl'|'ltr'} }`。`dir` 从 `LOCALES` 取，A 段首帧要用。
3. **出脚本**：返回三段可插入的 HTML 字符串（载荷、A 段、B 段）。

### ⑤ `tools/build-pages.mjs`（改 1 处）

在 `emit('/index.html', ...)`（第 143 行）那次调用上，除了现有的删 `data-locale`，再插入三段脚本、落在两个锚点上。两个锚点在模板里各只出现一次，字符串替换是安全的：

| 位置 | 内容 |
|---|---|
| `</head>` 前 | `<script>window.NW_I18N_BOOT = {...}</script>` + A 段 |
| `</header>` 后（`index.html:102`） | B 段 |

**A 段**：`pickLang(Object.keys(NW_I18N_BOOT.d), localStorage.getItem('nw-lang'), navigator.languages)` → 设 `document.documentElement.lang`（BCP-47 形式）、`dir`、`document.title`、`meta[name=description]`，并把结果写进 `document.documentElement.dataset.locale`。

**B 段**：遍历 `[data-boot]`，按 `data-i18n` 取值填 `textContent`，有 `data-html` 走 `innerHTML`，有 `data-i18n-attr` 按 `attr:key` 设属性 —— 与 `applyLang()`（`main.js:73`–81）的规则逐条对齐。

A 段、B 段都是 classic 内联脚本（不是 module），同步执行。载荷那段是纯赋值。

### ⑥ 运行时衔接

根页面加载顺序变成：

1. head：载荷 + A 段 → `<html lang/dir>` 就位，title/description 就位，`dataset.locale` 就位
2. 解析 hero
3. `</header>` 后：B 段 → 首屏 21 处标记（22 个键，另含不在 DOM 上的 `docTitle`）就位。**首帧画出来就是母语。**
4. `main.js`（module）：`detectLang()` 读到 A 段写的 `dataset.locale`，命中现有的第一分支（`main.js:35`），拿到同一个语言 —— 不会二次跳变
5. `applyLang()` 照旧 `await` 全量词典，回来后整页再渲染一遍。首屏那 22 个键**大多数**值完全相同，视觉上什么都不发生；但 `heroLive`（`#live-count`）不在此列——它的 `{n}` 在构建期烤成了静态的 152（见上面「硬约束」），`applyLang()` 回来后会被换成当下真实处在礼拜时间内的城市数，所以这个数字会在首帧之后跳一下。**这不是本次改动引入的新行为**：`{n}` → 152 这个烤法在 `pageVars()` 里对所有语言页一直如此，根页面预渲染出的静态 HTML 在这次改动之前就已经写死 152，用户早就会看到它被 `main.js` 的真实统计覆盖——本次改动只是让更多语言的访客在首帧就看到这同一个（会跳的）152，不多带来新的跳变，也没有把它消掉。

语言选择器**会**受影响：根页面复用的是英文页那份 head 注入，`window.NW_LANG_HREF` 是存在的（绝对地址，如 `https://www.noorwaqt.com/id/`），所以在根页面切语言会跳转到对应的 `/xx/` 页，而不是原地走 `applyLang()`（`main.js:879`）。这是既有行为，本次改动没有触碰它——细节见下面「实测结果」一节。

## 错误处理

两段脚本各自包 try/catch，吞掉一切。

- 脚本抛错 → 页面停在英文静态 HTML，`main.js` 异步纠正 —— **就是今天的行为**
- localStorage 在隐私模式下会抛 → 吞掉，退到 `navigator.languages`
- `pickLang` 返回不在载荷里的语言码 → B 段查不到该语言的字典，直接不动 DOM，留给 `applyLang()`

**这个改动没有比现状更差的下界。**

## 未决但不阻塞

首屏 22 个键是按「hero header 之内」划的，不是按真实视口量的。折叠线以下第一屏边缘的内容（`barsTitle` / `barsNote`）在矮屏上可能露出来一点并闪一下。先不处理。

真要补，**不是**加个 `data-boot` 标记就完事——`bootKeys()` 现在把 `</header>` 当成硬边界：B 段是插在 `</header>` 之后同步执行的一段 classic 脚本，`querySelectorAll('[data-boot]')` 那一刻只能看见解析到 `</header>` 为止的 DOM，标在它之后的元素会被 `bootKeys()` 扫进载荷、却永远不会被 B 段填上——这种情况现在会在构建期直接抛错（`tools/lib/boot-i18n.mjs` 的 `bootKeys`）。所以要扩首屏范围，真正要做的是**把 `</header>` 这个边界本身往下挪**（比如把 hero 之后想要一起解决闪烁的那块内容也纳进同一个 `<header>`，或者把 B 段的注入锚点换成新的边界），让"载荷里有哪些键"和"B 段这时候能看见哪些元素"继续对齐——这两者由同一个边界定义，不能只改其中一半。

## 测试

实际落地的测试分在两个新文件里，都跑在 `npm test`（不依赖构建）：

**`tools/lib/_test-boot-i18n.mjs`**（新增）

- `bootKeys`：标记识别、属性顺序不敏感、去重、`EXTRA` 追加不重复；`</header>` 是硬边界——之前的 `data-boot` 正常扫入，之后的直接抛错（不是静默漏掉）
- 真模板扫出 22 个键（21 处 `data-boot` + `EXTRA` 的 `docTitle`），`docDesc` 不在其中
- `bootEntry`：只取要的键、构建期的值填占位符、HTML 不转义、缺键跳过；真词典（`ar`）跑一遍，缺译文的键回落英文基线
- `bootScripts`：载荷里的 `<`/`>` 被转义、`pickLang` 源码被内联且不留 `export`、A 段不再碰 `meta[name="description"]`、两段都是 ES5（无箭头函数）、都包了 `try`
- 生成脚本的 `new Function` 语法检查——只证明脚本能解析
- **在合成的最小 DOM 壳里执行两段真实生成的脚本**（不依赖 `dist/`，直接喂 `bootScripts()` 一份合成载荷）：浏览器偏好选中语言、`localStorage.getItem` 抛异常（隐私模式）时协商仍然成立、`saved` 覆盖浏览器偏好、不支持的偏好回落 `en`、`zh-TW` 协商出的 `zh_Hant` 在 `lang` 属性上转成 BCP-47 的 `zh-Hant`；并断言 `document.documentElement.lang`/`dir`/`data-locale`、`document.title`、`data-html` 元素的 `innerHTML`、纯文本元素的 `textContent`、`data-i18n-attr` 元素的属性全部落地正确——这是唯一真正跑过脚本逻辑而不只是语法的测试

**`tools/lib/_test-lang-pick.mjs`**（新增）

`pickLang` 纯函数的单元断言：zh-TW → `zh_Hant`、zh-CN → `zh`、`saved` 优先于 `prefs`、全不匹配 → `en`

**`tools/verify-dist.mjs`**（改，只能对已构建的 `dist/` 跑）

- 根页面含 `window.NW_I18N_BOOT`，44 个语言码、`dir` 表都齐全，载荷键集合 ⊇ 模板 `data-boot` 键集合
- B 段（`[data-boot]`）确实注入到了根页面
- 两段脚本只出现在根页面，没有漏进任何一个 `/xx/` 语言页

**人工**

Chrome DevTools 网络降到 Slow 4G，浏览器语言设成印尼语，开 `/`，录一段慢放看首帧。再用阿拉伯语跑一遍看 RTL 首帧布局。

## 代价

| | 现在 | 之后（实测，含 `docDesc` 移出载荷后） |
|---|---|---|
| 根页面 brotli | 7.4KB | 24.9KB |
| 载荷原始大小 | — | 63.4KB |
| 影响范围 | — | 仅 `/`，`/xx/` 和城市页不变 |

英文访客白付这 17.5KB —— 他们一个字节都用不上。这是全覆盖方案换来零猜测、零维护所付的价。

## 实测结果（2026-08-27）

构建产物：根页面 **98.2KB 原始（100521 字节） / 24.9KB brotli（25520 字节）**。载荷 44 种语言 × 22 个键齐全，`dir` 表 44 条，无占位符残留。（这份数字是 `docDesc` 从载荷里删掉之后测的——早先包含 `docDesc` 时是 114.9KB 原始 / 29.5KB brotli；`docDesc` 单独占了约 4.78KB brotli，因为 `<meta name="description">` 不会被渲染、爬虫读的是服务端发出的原始 HTML 而不会执行 boot 脚本，付这笔钱换不到任何读者，所以删了。）

**机制成立的直接证据。** 服务端发出的 `/` 是 `<html lang="en">`，hero 静态文案是 "Right now, across the world, Muslims are praying."；浏览器渲染出来的 DOM 是中文。`data-locale` 在根页面只可能由 A 段写上（构建时被剥掉了），实测为 `zh`，与 `navigator.languages = ['zh-CN', ...]` 协商结果一致。B 段确认落在 `</header>` 之后。

**四条路径在 Node 的 DOM 壳里跑过真实生成的脚本**（浏览器里造不出隐私模式，所以把脚本原样抽出来执行；这套验证后来被固化进了 `tools/lib/_test-boot-i18n.mjs`，直接喂 `bootScripts()` 一份合成载荷，不再依赖 `dist/index.html` 已经构建好）：

| 场景 | 结果 |
|---|---|
| 浏览器偏好 `id-ID` | `lang=id` `dir=ltr`，标题/hero/导航/aria 全部印尼语 |
| `localStorage` 抛异常 + 偏好 `ar-SA` | `lang=ar` `dir=rtl`，阿拉伯语 —— **隐私模式下不受影响** |
| 保存值 `ur` 压过偏好 `fr-FR` | `lang=ur` `dir=rtl`，乌尔都语 |
| 偏好 `pt-BR`（不支持） | 回落 `en` |

`data-i18n-attr` 那条规则也一并验证：分享按钮的 `aria-label` 在各语言下都被正确设值。控制台无报错。（`docDesc` 删除之后 A 段不再碰 `meta[name="description"]`，这条不再是验证范围。）

**没能验证的一件事。** 首帧截图。执行环境的浏览器面板不合成画面，截不到图 —— 所以"用户眼睛看到的第一帧就是母语"这一条，目前是由机制推出来的，不是看出来的。慢网 + 真机的目视对照仍待补。

**一处与原计划的预期不符（既有行为，非本次改动引入）。** 计划里写"根页面没有 `window.NW_LANG_HREF`，切语言应当原地切换"。实际上根页面的 head 注入沿用英文页那一份，`NW_LANG_HREF` 是在的，而且里面是**绝对地址**（`https://www.noorwaqt.com/id/`）。所以在根页面切语言会跳到对应的 `/xx/` 页 —— 本地预览时会直接跳出 localhost 跳到线上站。这在这次改动之前就是如此，改动没有触碰它。


## 改动清单

新增 4 个：

- `assets/js/lang-pick.js`
- `tools/lib/boot-i18n.mjs`
- `tools/lib/_test-lang-pick.mjs` —— `pickLang` 的单元断言
- `tools/lib/_test-boot-i18n.mjs` —— `bootKeys` / `bootEntry` / `bootScripts` 的单元断言，含在合成 DOM 壳里执行生成脚本那组

改 5 个：

- `index.html` —— 加约 21 处 `data-boot`
- `assets/js/main.js` —— `detectLang()` 改调 `pickLang`；`applyLang()` 里的 `localStorage.setItem` 补上 try/catch（隐私模式会抛）
- `tools/build-pages.mjs` —— 根页面 emit 处插入两段脚本（两个锚点：`</head>` 前、`</header>` 后）
- `tools/verify-dist.mjs` —— 加首屏载荷的体检：语言数、`dir` 表、键集合、B 段是否注入、两段脚本有没有漏进非根页面
- `package.json` —— `test` 脚本挂上两个新测试文件
