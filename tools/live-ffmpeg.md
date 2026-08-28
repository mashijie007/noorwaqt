# NoorWaqt Live — FFmpeg 推流指南

```
                  NoorWaqt Prayer Engine
                           │
                           ▼
                ┌─────────────────────┐
                │  Live Render Core   │  ← /live/?city=Makkah&lang=ar&clean=1
                │  当前时间 / 下一番 / 倒计时 / 五番 / Hijri / 城市
                └──────────┬──────────┘
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
        YouTube 版本               TikTok 版本
          16:9                     9:16
               │                       │
               ▼                       ▼
            FFmpeg                  FFmpeg
               │                       │
               ▼                       ▼
         YouTube Live              TikTok LIVE
```

---

## 1. Live Render Core 地址

本地预览:

```
http://localhost:4173/live/?city=Makkah&lang=zh&layout=16x9
http://localhost:4173/live/?city=Jakarta&lang=id&layout=9x16
```

线上 (部署后):

```
https://www.noorwaqt.com/live/?city=makkah&lang=ar&layout=16x9&clean=1
https://www.noorwaqt.com/live/?city=jakarta&lang=id&layout=9x16&clean=1
```

URL 参数:

| 参数 | 说明 | 默认 |
|------|------|------|
| `city` | 城市英文名或 slug (`Makkah`, `jakarta`, `kuala-lumpur`…) | `Makkah` |
| `lang` | 语言代码，支持 44 种 (`zh`, `en`, `ar`, `id`, `ur`…) | `zh` |
| `layout` | `16x9` (YouTube 横屏 1920×1080) / `9x16` (TikTok 竖屏 1080×1920) / `auto` | `16x9` |
| `clean` | `1` 隐藏控制条，OBS Browser Source 用 | `0` |
| `asr` | `1`=标准 `2`=哈乃斐 | `1` |

> OBS Browser Source：URL 填 `.../live/?city=Makkah&lang=ar&layout=16x9&clean=1`，
> 宽 1920 高 1080 (或 1080×1920)，CSS 留空，关闭滚动条。

---

## 2. FFmpeg 推流 — YouTube 16:9

### 2.1 用 Chrome Headless + X11 抓屏 (Linux)

```bash
# 1. 起一个无头 Chrome 定格在 1920×1080
google-chrome \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=1920,1080 --hide-scrollbars \
  --autoplay-policy=no-user-gesture-required \
  "https://www.noorwaqt.com/live/?city=Makkah&lang=ar&layout=16x9&clean=1" &

# 2. FFmpeg 抓 X11 并推 RTMP
ffmpeg -y \
  -f x11grab -video_size 1920x1080 -framerate 30 -i :0.0 \
  -f pulse -ac 2 -i default \
  -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv "rtmp://a.rtmp.youtube.com/live2/YOUR_YOUTUBE_KEY"
```

macOS 用 `avfoundation`：

```bash
ffmpeg -f avfoundation -video_device_index 1 -framerate 30 -i "1:none" \
  -c:v libx264 -preset veryfast -b:v 4500k -f flv rtmp://a.rtmp.youtube.com/live2/KEY
```

### 2.2 用 Playwright 捕获 (推荐，无需 X11)

```bash
node tools/live-capture.mjs --url "https://www.noorwaqt.com/live/?city=Makkah&lang=ar&layout=16x9&clean=1" \
  --width 1920 --height 1080 --fps 30 \
  --rtmp rtmp://a.rtmp.youtube.com/live2/YOUR_YOUTUBE_KEY
```

脚本会用 Playwright 打开页面，按帧截图 → 管道进 FFmpeg → RTMP。

---

## 3. FFmpeg 推流 — TikTok 9:16

TikTok LIVE 通常需要竖屏 1080×1920，码率略低：

```bash
# Chrome 竖屏
google-chrome \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=1080,1920 --hide-scrollbars \
  "https://www.noorwaqt.com/live/?city=Jakarta&lang=id&layout=9x16&clean=1" &

ffmpeg -y \
  -f x11grab -video_size 1080x1920 -framerate 30 -i :0.0 \
  -c:v libx264 -preset veryfast -b:v 3500k -maxrate 3500k -pix_fmt yuv420p -g 60 \
  -f flv "rtmp://rtmp.tiktok.com/live/YOUR_TIKTOK_KEY"
# TikTok 的 RTMP 地址以直播间创建后给出的为准
```

Playwright 版本:

```bash
node tools/live-capture.mjs --url "https://www.noorwaqt.com/live/?city=Jakarta&lang=id&layout=9x16&clean=1" \
  --width 1080 --height 1920 --fps 30 \
  --rtmp rtmp://rtmp.tiktok.com/live/YOUR_TIKTOK_KEY
```

> 同时推双平台：开两个进程，一个 16:9 推 YouTube，一个 9:16 推 TikTok，
> 共用同一个 Prayer Engine，只是布局不同。

---

## 4. OBS 方案 (无需 FFmpeg 手写)

1. OBS → 来源 → Browser Source
2. URL: `https://www.noorwaqt.com/live/?city=Makkah&lang=en&layout=16x9&clean=1`
   - 宽度 1920 高度 1080 (YouTube) 或 1080×1920 (TikTok)
   - 勾选 “Shutdown source when not visible” 关闭
3. OBS → 设置 → 推流 → 填 YouTube / TikTok 的 RTMP 服务器与串流密钥
4. 开始推流 — Live Render Core 会每秒刷新倒计时，无需其他操作

---

## 5. 本地自检

```bash
npm run dev          # http://localhost:4173/live/
node tools/build.mjs # 构建到 dist/live/
node tools/verify-dist.mjs
```

---

## 6. 故障排查

| 现象 | 原因 |
|------|------|
| 时刻差 1 分钟 | 检查 `asr` 参数与城市 method 是否与 App 一致；引擎与官网同源，不应有差 |
| Hijri 差一天 | 乌姆库拉为推算历，实际以当地新月为准属正常 |
| 字体回落 | 离线推流机需安装 Noto Sans SC / Amiri，或让 Chrome 联网加载 Google Fonts |
| 倒计时卡住 | 检查 `clean=1` 时 JS 是否被 OBS 拦截；Browser Source 需启用 “Enable JavaScript” |
