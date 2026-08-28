#!/usr/bin/env node
/* check-live.mjs — 本地一键校验 Live Render Core
 *
 *  不依赖浏览器：只验引擎 + 静态资源是否齐全
 *  要做完整渲染校验，跑:  node tools/check-live.mjs --browser
 *
 *  用法:
 *    node tools/check-live.mjs
 *    node tools/check-live.mjs --browser   # 需已 npx playwright install chromium
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => console.log(`✗ ${m}`);
let bad = 0;

function check(path, label){
  const full = resolve(ROOT, path);
  if (existsSync(full)) ok(`${label} → ${path}`);
  else { fail(`缺失 ${label} → ${path}`); bad++; }
}

console.log('── 静态资源 ──');
check('live/index.html', 'Live 页面');
check('assets/css/live.css', 'Live 样式 16:9/9:16');
check('assets/js/live.js', 'Live 引擎');
check('assets/js/prayer.js', 'Prayer Engine');
check('assets/js/hijri.js', 'Hijri');
check('assets/js/cities.js', 'Cities 152');
check('tools/live-ffmpeg.md', 'FFmpeg 指南');
check('tools/live-capture.mjs', 'FFmpeg 捕获脚本');

console.log('\n── 引擎自检 ──');
try {
  const { CITIES } = await import('../assets/js/cities.js');
  const { stateAt, todayFor } = await import('../assets/js/prayer.js');
  const { hijri } = await import('../assets/js/hijri.js');
  const city = CITIES.find(c=>c.en==='Makkah');
  const now = Date.now();
  const st = stateAt(city, now, 1);
  const times = todayFor(city, now, 1);
  const h = hijri(now);
  if (!st.next) throw new Error('stateAt 无 next');
  if (!times.fajr) throw new Error('todayFor 无 fajr');
  if (!h.y) throw new Error('hijri 异常');
  ok(`Makkah 引擎 OK — 下一番 ${st.next.name} 倒计时 ${Math.round(st.untilNext/1000)}s, Hijri ${h.y}-${h.m}-${h.d}`);
  // 再验一个竖屏城市
  const jk = CITIES.find(c=>c.en==='Jakarta');
  const st2 = stateAt(jk, now, 1);
  ok(`Jakarta 引擎 OK — 下一番 ${st2.next?.name} 时区 ${jk.tz}`);
} catch(e){
  fail(`引擎异常: ${e.message}`);
  bad++;
}

console.log('\n── HTML 内容 ──');
try {
  const html = readFileSync(resolve(ROOT,'live/index.html'),'utf8');
  const checks = [
    ['Live Render Core', 'Live Render Core 注释'],
    ['id="clock"', '当前时间'],
    ['id="countdown"', '倒计时'],
    ['id="prayerList"', '五番列表'],
    ['id="hijriDate"', 'Hijri'],
    ['id="cityName"', '城市'],
    ['layout-16x9', '16:9 布局'],
  ];
  // 9:16 布局在 CSS/JS 中定义，不在 HTML 静态值里
  const css = readFileSync(resolve(ROOT,'assets/css/live.css'),'utf8');
  if (css.includes('layout-9x16')) ok('9:16 布局 (CSS)'); else { fail('缺 9:16 布局'); bad++; }
  for(const [needle,label] of checks){
    if(html.includes(needle)) ok(label);
    else { fail(`HTML 缺 ${label} (${needle})`); bad++; }
  }
} catch(e){ fail(`读 live/index.html 失败: ${e.message}`); bad++; }

if (process.argv.includes('--browser')) {
  console.log('\n── 浏览器渲染 (playwright) ──');
  try {
    const { chromium } = await import('playwright');
    // 起临时服务器
    const { spawn } = await import('node:child_process');
    const srv = spawn('node', ['tools/dev-server.mjs', '--root=dist', '4199'], { stdio: 'inherit' });
    await new Promise(r=>setTimeout(r, 1200));
    const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
    async function shot(url,w,h,label){
      const ctx = await browser.newContext({ viewport:{width:w,height:h} });
      const page = await ctx.newPage();
      const errs=[];
      page.on('pageerror', e=>errs.push(e.message));
      await page.goto(url, { waitUntil:'domcontentloaded', timeout:15000 });
      await page.waitForTimeout(2500);
      if(errs.length) throw new Error(errs.join('|'));
      const clock = await page.textContent('#clock');
      if(!clock || clock.includes('--')) throw new Error(`${label} clock 未渲染: ${clock}`);
      console.log(`✓ ${label} 渲染 OK — ${clock} ${await page.textContent('#cityName')} ${await page.textContent('#nextName')}`);
      await ctx.close();
    }
    await shot('http://localhost:4199/live/?city=Makkah&lang=zh&layout=16x9', 1920,1080, '16:9 YouTube');
    await shot('http://localhost:4199/live/?city=Jakarta&lang=id&layout=9x16', 1080,1920, '9:16 TikTok');
    await browser.close();
    srv.kill();
    ok('浏览器双布局均渲染成功');
  } catch(e){
    fail(`浏览器校验失败: ${e.message}`);
    console.log('提示: 先执行 npm install && npx playwright install chromium && node tools/build.mjs');
    bad++;
    try { (await import('node:child_process')).execSync('pkill -f "dev-server.*4199"'); } catch {}
  }
}

console.log(`\n${bad? `✗ ${bad} 项未通过` : '✓ 全部通过 — 本地可推流'}`);
process.exit(bad?1:0);
