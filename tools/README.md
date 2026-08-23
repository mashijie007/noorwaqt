# 站点生成器

仓库根上的 `index.html` 既是可以直接打开的开发页，也是构建模板。
生成器把运行时的 i18n 注入提前到构建期，产出 `dist/`：44 个语言页 + 1377 个城市页。

```bash
npm run build     # 生成 dist/
npm run verify    # 部署前体检：站内链接 / hreflang / 站点地图 / 占位符
npm run test      # 预渲染扫描器的自测
npm run preview   # 起服务预览 dist（4190）
npm run dev       # 起服务预览仓库根（4173）
```

`dist/` 不进版本库 —— 城市页每天重算，1300 多个文件天天变，
提交进仓库只会让 git 历史迅速膨胀。构建产物由 Actions 直接交给 Pages。

## 文件

| 文件 | 作用 |
|---|---|
| `lib/prerender.mjs` | HTML 扫描器：填 `[data-i18n]` 的内容与属性、改 `<head>`、把 `./x` 改成 `/x` |
| `lib/site.mjs` | 站点常量、路径规则、hreflang 映射、朝向角与距离计算 |
| `lib/blocks.mjs` | hreflang、JSON-LD、页脚互链 —— 两个生成器共用的部分 |
| `lib/_test-prerender.mjs` | 扫描器自测。它错了不会报错，而是安静产出坏 HTML，所以必须有 |
| `build-pages.mjs` | 44 个语言落地页 + 域名根 |
| `build-cities.mjs` | 城市礼拜时间页与城市索引页 |
| `build-sitemap.mjs` | 按语言切分的站点地图 + 索引 + robots.txt |
| `verify-dist.mjs` | 产物体检，CI 的闸门 |
| `indexnow.mjs` | 主动把变更地址推给 Bing / Yandex |
| `build.mjs` | 串起以上全部，外加静态资源拷贝 |

## URL 结构

```
/                     语言协商页（预渲染英文，canonical → /en/，hreflang x-default）
/<lang>/              44 种语言的落地页
/<lang>/prayer-times/            城市索引（按国家分组）
/<lang>/prayer-times/<city>/     城市页
/en/guide/, /zh/guide/           教法问答（手写，原样搬进 dist）
/sitemap.xml          索引，下挂 /sitemaps/*.xml
```

教法问答页不由生成器产出 —— 它们是手写的，自带 canonical 与 hreflang。
构建只做两件事：搬进 `dist/`，收进站点地图。
`discoverGuidePages()` 按目录扫描，**加一篇不用回来改生成器**。

城市页只出 `translations/seo/<code>.json` 里有文案的语言。
**加一种语言 = 往那个目录里加一个 JSON**，生成器会自己发现它。
没写文案就不生成 —— 否则只会得到一批挂着乌尔都语路径、内容却是英文的薄页面。

## 每天重建的原因

城市页写的是"今天"的礼拜时刻。Actions 每天 01:20 UTC 重建一次，
保证抓取端看到的是当天的内容。

用户这边还有第二道保险：`assets/js/city-page.js` 会拿页面里嵌的坐标
重算一遍，跟构建日对不上就就地刷新，跨月时整张时刻表都会重画。
所以就算定时任务停了几天，用户看到的时刻仍然是对的。

## 仍需手工做的事

1. **仓库 Settings → Pages → Source 改成「GitHub Actions」**。
   不改的话流水线的 deploy 步骤会失败 —— 现在的设置还是从分支目录直接伺服。
2. 根目录手写的 `robots.txt` 与 `sitemap.xml` 已被生成的那两份取代
   （17 条 → 1438 条，且含全部 hreflang）。构建不会拷贝它们，可以删掉，
   留着也只是没人读。
3. Search Console / Bing 站长工具提交 `https://www.noorwaqt.com/sitemap.xml`。
4. 想启用 IndexNow：生成一串随机字符（32 位十六进制即可），
   存到仓库 Settings → Secrets and variables → Actions → Variables，命名 `INDEXNOW_KEY`。
   校验文件由构建自动写进站点根。不配也不影响部署。
