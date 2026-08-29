/* lit-sim.js — 模拟“有人刚完成礼拜，点亮城市”的轻量泊松过程
 *
 *  不接后端。按城聚合：每座在窗口内的城市贡献 λ(t)，聚合 Λ 全局决定下一亮的时刻与选城。
 *  频率：mean 12s ±40%，高峰×1.5，冷时段×0.5，并发上限1（偶发2连击），前25s静默。
 *  动画本体由 globe.js 在 lighter 层绘制，这里只负责节律与选城。
 */

import { CITIES } from './cities.js';
import { stateAt } from './prayer.js';

const STORAGE_KEY = 'nw-live-breath'; // on/off

export function isSimEnabled(){
  try{
    const v = localStorage.getItem(STORAGE_KEY);
    if(v === '0') return false;
    if(v === '1') return true;
  }catch{}
  // 尊重系统减弱动效：默认关，需用户手动开
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}
export function setSimEnabled(on){
  try{ localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); }catch{}
}

export function attachLitSim(globe, opts={}){
  const queue = []; // {city, t0, hasRing, color, dur}
  globe._simQueue = queue;
  const recent = new Map(); // en -> last burst at
  let nextAt = performance.now() + 25000;
  let timer = null;

  function busyFactor(){
    const c = globe.counts;
    if(!c) return 1;
    const active = (c.fajr||0)+(c.dhuhr||0)+(c.asr||0)+(c.maghrib||0)+(c.isha||0);
    if(active >= 22) return 0.66; // 高峰 8s
    if(active <= 8) return 1.5; // 冷时段 18s
    return 1;
  }
  function pickCity(){
    const now = globe.time;
    const candidates = [];
    let sum = 0;
    for(const cit of CITIES){
      const s = stateAt(cit, now, globe.shadow);
      if(!s.current) continue;
      if(recent.get(cit.en) && (now - recent.get(cit.en) < 60000)) continue; // 60s内不重亮
      const winEnd = s.windowEnd || (now + 45*60000);
      const winStart = now - (s.since||0);
      const total = Math.max(1, winEnd - winStart);
      const progress = Math.min(0.98, Math.max(0, (now - winStart)/total));
      const w = 0.6 + 1.4 * progress; // 越近结束权重越高
      candidates.push({cit, w});
      sum += w;
    }
    if(!candidates.length) return null;
    let r = Math.random()*sum;
    for(const {cit,w} of candidates){ r-=w; if(r<=0) return cit; }
    return candidates[candidates.length-1].cit;
  }

  function burst(){
    if(document.hidden) return;
    if(!isSimEnabled()) return;
    if(queue.length >= 1) return; // 上限1，偶发2由scheduleDouble处理
    const city = pickCity();
    if(!city) return;
    const s = stateAt(city, globe.time, globe.shadow);
    const color = s.current ? null : null; // 由 globe 按 current 取色，这里占位
    const hasRing = Math.random() < 0.22;
    const dur = hasRing ? 1800 : 1400;
    queue.push({city, t0: performance.now(), hasRing, dur});
    recent.set(city.en, Date.now());
    // 尾迹微亮 90s，由 globe 根据 recent 判断（可选）
  }

  function schedule(){
    const base = 7000 + Math.random()*10000; // 7-17s
    const gap = base * busyFactor();
    nextAt = performance.now() + gap;
  }
  function tick(){
    if(performance.now() >= nextAt){
      burst();
      // 偶发连击：22% 概率在 2.2-3.2s 内再亮一城
      if(Math.random()<0.22){
        setTimeout(()=>{ burst(); schedule(); }, 2200+Math.random()*1000);
      } else {
        schedule();
      }
    }
    // 清理过期：dur + 200ms 缓冲
    const now = performance.now();
    for(let i=queue.length-1;i>=0;i--){
      if(now - queue[i].t0 > queue[i].dur + 300) queue.splice(i,1);
    }
  }

  // 驱动：与 globe.spin 同频，用 rAF 而非 setInterval，保证后台节流时自然暂停
  let raf = 0;
  function loop(){
    tick();
    raf = requestAnimationFrame(loop);
  }
  loop();

  // 暂停/恢复
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden) nextAt = performance.now() + 8000 + Math.random()*6000;
  });

  return {
    queue,
    burst, // 供调试：window._sim.burst()
    destroy(){ cancelAnimationFrame(raf); },
  };
}
