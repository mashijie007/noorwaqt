#!/usr/bin/env node
/* live-capture.mjs — Playwright → FFmpeg → RTMP
 *
 *  把 /live/ 渲染成视频流推到 YouTube / TikTok。
 *  不依赖 X11，macOS / Linux 通用。
 *
 *  用法:
 *    node tools/live-capture.mjs \
 *      --url "http://localhost:4173/live/?city=Makkah&lang=ar&layout=16x9&clean=1" \
 *      --width 1920 --height 1080 --fps 30 \
 *      --rtmp rtmp://a.rtmp.youtube.com/live2/KEY
 *
 *  仅推本地预览（不推流）:
 *    node tools/live-capture.mjs --url "http://localhost:4173/live/?city=Makkah&layout=16x9&clean=1" --preview
 *
 *  需要:  npm i -D playwright  &&  npx playwright install chromium
 *         ffmpeg 在 PATH 中
 */

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const get = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? (args[i + 1] ?? d) : d;
};
const has = (k) => args.includes(`--${k}`);

const URL = get('url', 'http://localhost:4173/live/?city=Makkah&lang=zh&layout=16x9&clean=1');
const W = parseInt(get('width', '1920'), 10);
const H = parseInt(get('height', '1080'), 10);
const FPS = parseInt(get('fps', '30'), 10);
const RTMP = get('rtmp', null);
const PREVIEW = has('preview');

if (!RTMP && !PREVIEW) {
  console.error('需要 --rtmp <url> 或 --preview');
  console.error('示例: node tools/live-capture.mjs --url "http://localhost:4173/live/?city=Makkah&clean=1" --width 1920 --height 1080 --rtmp rtmp://a.rtmp.youtube.com/live2/KEY');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('请先安装: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: [`--window-size=${W},${H}`, '--hide-scrollbars', '--disable-gpu', '--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
console.log(`→ 打开 ${URL}  ${W}x${H} @${FPS}fps`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000); // 让首帧 prayer 计算完成

if (PREVIEW) {
  const out = `live-preview-${W}x${H}.png`;
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✓ 预览已保存: ${out}`);
  await browser.close();
  process.exit(0);
}

// ── FFmpeg 管道 ──
// 输入:  pipe:0  image2pipe png  (Playwright 每帧 screenshot)
const ffArgs = [
  '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
  '-b:v', W >= 1920 ? '4500k' : '3500k', '-maxrate', W >= 1920 ? '4500k' : '3500k',
  '-g', String(FPS * 2),
  '-f', 'flv', RTMP,
];

console.log(`→ FFmpeg: ffmpeg ${ffArgs.join(' ')}`);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
ff.on('error', (e) => { console.error('FFmpeg 启动失败:', e.message); process.exit(1); });
ff.on('close', (code) => { console.log(`FFmpeg 退出 code=${code}`); process.exit(code ?? 0); });

// ── 帧循环 ──
let running = true;
process.on('SIGINT', () => { running = false; ff.stdin.end(); browser.close().then(()=>process.exit(0)); });

const interval = 1000 / FPS;
while (running) {
  const t0 = Date.now();
  try {
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  } catch (e) {
    console.error('截图失败:', e.message);
    break;
  }
  const dt = Date.now() - t0;
  if (dt < interval) await new Promise(r => setTimeout(r, interval - dt));
}
