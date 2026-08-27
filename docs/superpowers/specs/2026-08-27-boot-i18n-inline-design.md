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

所以这两个键的占位符在**构建期**就替换成静态 HTML 现在显示的那几个值：`{n}` → `—`、`{lit}` → `0`、`{total}` → 构建期的 `CITIES.length`（当前 152）。运行时因此不需要占位符替换引擎，`main.js` 起来后会用真实数字覆盖。

## 首屏范围

折叠线取 `index.html:102` 的 `</header>` —— hero 是整屏高的 header，导航栏、hero 文案、时间轴控件全在里面，边界干净、不随视口变。

共 23 个键：

- **导航**（6）：`navGlobal` `navRamadan` `navWomen` `navGuide` `navPrivacy` `navDownload`
- **hero**（11）：`heroEyebrow` `heroTitle` `heroLead` `heroLive` `litPill` `litShareAria` `heroCta` `heroCta2` `heroHintDrag` `heroHintTap` `heroHintTime`
- **时间轴**（4）：`timeLead` `timeTitle` `timePlay` `timeNow`
- **文档头**（2）：`docTitle` `docDesc`

前 21 个在模板里打 `data-boot`。后 2 个不是 DOM 元素，用构建脚本里的显式常量 `EXTRA = ['docTitle', 'docDesc']`。

部分语言缺 `navGuide`、`heroEyebrow`，构建期直接跳过该键，运行时照旧回落 EN（`assets/js/i18n.js:38` 的 `{...EN, ...dict}` 已覆盖）。

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
3. `</header>` 后：B 段 → 首屏 23 处文案就位。**首帧画出来就是母语。**
4. `main.js`（module）：`detectLang()` 读到 A 段写的 `dataset.locale`，命中现有的第一分支（`main.js:35`），拿到同一个语言 —— 不会二次跳变
5. `applyLang()` 照旧 `await` 全量词典，回来后整页再渲染一遍。首屏那 23 个键的值完全相同，视觉上什么都不发生；变的是折叠线以下的内容。

语言选择器不受影响：根页面没有 `window.NW_LANG_HREF`，切语言照旧走原地 `applyLang()`（`main.js:879`）。

## 错误处理

两段脚本各自包 try/catch，吞掉一切。

- 脚本抛错 → 页面停在英文静态 HTML，`main.js` 异步纠正 —— **就是今天的行为**
- localStorage 在隐私模式下会抛 → 吞掉，退到 `navigator.languages`
- `pickLang` 返回不在载荷里的语言码 → B 段查不到该语言的字典，直接不动 DOM，留给 `applyLang()`

**这个改动没有比现状更差的下界。**

## 未决但不阻塞

首屏 23 个键是按「hero header 之内」划的，不是按真实视口量的。折叠线以下第一屏边缘的内容（`barsTitle` / `barsNote`）在矮屏上可能露出来一点并闪一下。先不处理 —— 真要补，加个 `data-boot` 标记即可，载荷跟着涨几 KB，不需要改任何逻辑。

## 测试

**`tools/lib/_test-prerender.mjs`**

- 根页面含 `NW_I18N_BOOT`，且 44 个语言码齐全
- 模板里每个 `data-boot` 键都出现在载荷里
- 载荷里不含 `{n}` `{lit}` `{total}` 残留
- `/en/`、`/ar/` 等语言页**不含** boot 脚本（防止误伤预渲染页）
- `pickLang` 纯函数的单元断言：zh-TW → `zh_Hant`、zh-CN → `zh`、`saved` 优先于 `prefs`、全不匹配 → `en`

**`tools/verify-dist.mjs`**

加一条：载荷键集合 ⊇ 模板 `data-boot` 键集合。防止有人加了标记但构建没扫到 —— 那正是会静默失效、且不会让构建报错的情形，与这个文件开头写的初衷一致。

**人工**

Chrome DevTools 网络降到 Slow 4G，浏览器语言设成印尼语，开 `/`，录一段慢放看首帧。再用阿拉伯语跑一遍看 RTL 首帧布局。

## 代价

| | 现在 | 之后 |
|---|---|---|
| 根页面 brotli | 7.4KB | 28.4KB |
| 载荷原始大小 | — | 74.6KB |
| 影响范围 | — | 仅 `/`，`/xx/` 和城市页不变 |

英文访客白付这 20KB —— 他们一个字节都用不上。这是全覆盖方案换来零猜测、零维护所付的价。

## 改动清单

新增 2 个：

- `assets/js/lang-pick.js`
- `tools/lib/boot-i18n.mjs`

改 5 个：

- `index.html` —— 加约 21 处 `data-boot`
- `assets/js/main.js` —— `detectLang()` 改调 `pickLang`
- `tools/build-pages.mjs` —— 根页面 emit 处插入三段脚本（两个锚点）
- `tools/lib/_test-prerender.mjs` —— 加断言
- `tools/verify-dist.mjs` —— 加一条检查
