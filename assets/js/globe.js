/* globe.js — 全球礼拜地图的画布渲染器
 *
 * 正交投影（就是"从太空看地球"的那种投影）。
 * 陆地用点阵而不是多边形：既避开了球面裁剪的麻烦，又正好贴合 NoorWaqt
 * 的品牌意象 —— 每一座进入礼拜时间的城市，都是地球上亮起的一束光（Noor）。
 */
import { LAND, LAND_COUNT } from './land.js';
import { CITIES } from './cities.js';
import { stateAt, subsolarPoint, fastingAt } from './prayer.js';

const D = Math.PI / 180;

/** 五番礼拜的光色：从拂晓的冷蓝，走到正午的金，再落进夜的紫 */
export const PRAYER_COLOR = {
  fajr:    [110, 168, 255],
  dhuhr:   [255, 215, 110],
  asr:     [255, 159,  90],
  maghrib: [255, 107, 107],
  isha:    [167, 139, 250],
};
const FAST_COLOR = [126, 231, 190];   // 斋戒模式：翡翠绿

/** 刚进入某番礼拜的这段时间里，光最亮（宣礼刚响的那一刻） */
const FLASH_MS = 20 * 60e3;

/** 预渲染光晕精灵，避免每帧为每座城市新建渐变 */
function makeGlow(rgb) {
  const S = 64, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const [r, gg, b] = rgb;
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.25, `rgba(${r},${gg},${b},0.55)`);
  grad.addColorStop(0.6, `rgba(${r},${gg},${b},0.14)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return cv;
}

export class Globe {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.lon0 = opts.lon0 ?? 45;      // 视线中心经度
    this.lat0 = opts.lat0 ?? 18;      // 视线中心纬度（略微俯视）
    this.zoom = opts.zoom ?? 0.86;    // 球半径占画布短边的比例
    this.spin = opts.spin ?? 1.1;     // 自转角速度（度/秒）
    this.mode = 'prayer';             // 'prayer' | 'fasting'
    this.shadow = 1;                  // 晡礼影长倍数
    this.time = Date.now();
    this.selected = null;
    this.onSelect = opts.onSelect || (() => {});
    this.onInteract = opts.onInteract || (() => {});
    this.onMiss = opts.onMiss || (() => {});
    this.isLit = opts.isLit || (() => false);
    this.interactive = opts.interactive !== false;

    this.glow = {};
    for (const k in PRAYER_COLOR) this.glow[k] = makeGlow(PRAYER_COLOR[k]);
    this.glow.fasting = makeGlow(FAST_COLOR);

    this._proj = new Float32Array(CITIES.length * 3); // 每座城市的 x,y,可见性
    this._states = new Array(CITIES.length);
    this._fast = new Array(CITIES.length);
    this._statesAt = -1;
    this._sun = null;
    this._sunAt = -1;

    this._resize();
    // ResizeObserver 的回调是渲染生命周期的一部分：页面不合成时（后台标签页、
    // 某些嵌入式视图）它一次都不会投递，画布就会卡在旧尺寸上。
    // window 的 resize / orientationchange 不受这一限制，用来兜底。
    this._onWinResize = () => this._resize();
    addEventListener('resize', this._onWinResize);
    addEventListener('orientationchange', this._onWinResize);
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas.parentElement || canvas);
    // 字体/样式加载完成后尺寸可能还会变一次，补测一遍
    addEventListener('load', () => this._resize(), { once: true });
    if (this.interactive) this._bindPointer();
  }

  destroy() {
    this._ro.disconnect();
    removeEventListener('resize', this._onWinResize);
    removeEventListener('orientationchange', this._onWinResize);
    this._raf && cancelAnimationFrame(this._raf);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = (this.cv.parentElement || this.cv).getBoundingClientRect();
    const w = Math.max(1, box.width), h = Math.max(1, box.height);
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.dpr = dpr; this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.R = (Math.min(w, h) / 2) * this.zoom;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── 交互 ──────────────────────────────────────────
  _bindPointer() {
    const cv = this.cv;
    let dragging = false, moved = 0, lx = 0, ly = 0;

    const down = (e) => {
      dragging = true; moved = 0;
      lx = e.clientX; ly = e.clientY;
      cv.setPointerCapture?.(e.pointerId);
      this.userSpun = true; this.onInteract();
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      this.lon0 -= (dx / this.R) * 60;
      this.lat0 = Math.max(-72, Math.min(72, this.lat0 + (dy / this.R) * 60));
      e.preventDefault();
    };
    const up = (e) => {
      if (dragging && moved < 6) this._pick(e);   // 位移够小才算点击，不算拖拽
      dragging = false;
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move, { passive: false });
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { dragging = false; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.55, Math.min(1.9, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
      this._resize(); this.onInteract();
    }, { passive: false });
  }

  _pick(e) {
    const r = this.cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = 26 * 26;
    for (let i = 0; i < CITIES.length; i++) {
      if (this._proj[i * 3 + 2] <= 0) continue;
      const dx = this._proj[i * 3] - px, dy = this._proj[i * 3 + 1] - py;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = CITIES[i]; }
    }
    if (best) { this.selected = best; this.onSelect(best); }
    else this.onMiss();
  }

  /** 把某座城市转到正面（带缓动） */
  focus(city) {
    this.selected = city;
    this._target = { lon: city.lon, lat: Math.max(-60, Math.min(60, city.lat)) };
    this.userSpun = true;
  }

  // ── 状态缓存 ──────────────────────────────────────
  // 152 座城市 × 三天时刻表不便宜，但礼拜状态一分钟内不会变，缓存即可。
  //
  // 这一步刻意不放在渲染循环里：后台标签页会暂停 requestAnimationFrame，
  // 若统计数据依赖 draw() 才更新，用户切回来时统计条会是空的，
  // 首屏在画布尚未绘制时也会显示 0。数据与渲染必须能各走各的。
  refreshStates(force = false) {
    if (force) this._statesAt = -1;
    this._ensureStates();
    return this.counts;
  }

  _ensureStates() {
    const bucket = Math.floor(this.time / 30e3);
    if (bucket === this._statesAt) return;
    this._statesAt = bucket;
    const c = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, idle: 0, fasting: 0 };
    for (let i = 0; i < CITIES.length; i++) {
      // 礼拜状态始终计算：斋戒模式下统计条仍要显示五番分布，不能变成空条。
      // 两者共用同一份 timeline 缓存，第二次调用几乎不花时间。
      const s = stateAt(CITIES[i], this.time, this.shadow);
      this._states[i] = s;
      if (s.current) c[s.current]++; else c.idle++;
      if (this.mode === 'fasting') {
        const f = fastingAt(CITIES[i], this.time, this.shadow);
        this._fast[i] = f;
        if (f.fasting) c.fasting++;
      }
    }
    this.counts = c;
  }

  _ensureSun() {
    const bucket = Math.floor(this.time / 60e3);
    if (bucket === this._sunAt) return;
    this._sunAt = bucket;
    const s = subsolarPoint(this.time);
    const p = s.lat * D, l = s.lon * D, cp = Math.cos(p);
    this._sun = [cp * Math.sin(l), Math.sin(p), cp * Math.cos(l)];
  }

  // ── 渲染 ──────────────────────────────────────────
  start() {
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(100, t - last) / 1000; last = t;
      if (this._target) {
        // 缓动到目标视角；经度走最短弧，不绕远路
        let dl = ((this._target.lon - this.lon0 + 540) % 360) - 180;
        const da = this._target.lat - this.lat0;
        if (Math.abs(dl) < 0.15 && Math.abs(da) < 0.15) { this._target = null; }
        else { this.lon0 += dl * Math.min(1, dt * 4); this.lat0 += da * Math.min(1, dt * 4); }
      } else if (!this.userSpun) {
        this.lon0 += this.spin * dt;
      }
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  draw() {
    const g = this.ctx, R = this.R, cx = this.cx, cy = this.cy;
    this._ensureStates(); this._ensureSun();
    g.clearRect(0, 0, this.w, this.h);

    const a = this.lon0 * D, b = this.lat0 * D;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);

    // 1. 球体本身 + 大气辉光
    // 光晕必须紧贴球体边缘并迅速衰减。起点若离球面太远、透明度若给太高，
    // 画出来就是一圈实心绿环，像个甜甜圈套在地球外面，而不是大气层。
    const halo = g.createRadialGradient(cx, cy, R * 0.995, cx, cy, R * 1.14);
    halo.addColorStop(0, 'rgba(52,211,153,0.13)');
    halo.addColorStop(0.28, 'rgba(16,185,129,0.05)');
    halo.addColorStop(0.62, 'rgba(16,185,129,0.015)');
    halo.addColorStop(1, 'rgba(16,185,129,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(cx, cy, R * 1.14, 0, 7); g.fill();

    const body = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R);
    body.addColorStop(0, '#0d2b26');
    body.addColorStop(0.65, '#08201d');
    body.addColorStop(1, '#04120f');
    g.fillStyle = body;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();

    // 2. 陆地点阵。按昼夜明暗分档批量绘制，减少 fillStyle 切换
    const sun = this._sun;
    const dot = Math.max(0.7, R * 0.0042);
    const buckets = [[], [], [], []];
    for (let i = 0; i < LAND_COUNT; i++) {
      const x = LAND[i * 3], y = LAND[i * 3 + 1], z = LAND[i * 3 + 2];
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const z2 = y * sb + z1 * cb;
      if (z2 <= 0.02) continue;                       // 背面剔除
      // 高纬度的点在等面积网格上仍会挤成一道道同心弧，投影后尤其明显。
      // 那一带本来也几乎没有人烟，压暗即可，顺带把视线让给有人的纬度带。
      if (y > 0.9 || y < -0.87) continue;
      const y2 = y * cb - z1 * sb;
      // 太阳高度角的余弦：>0 是白昼，<0 是黑夜，晨昏线自然浮现
      const lit = x * sun[0] + y * sun[1] + z * sun[2];
      const k = lit > 0.25 ? 3 : lit > 0 ? 2 : lit > -0.18 ? 1 : 0;
      const arr = buckets[k];
      arr.push(cx + x1 * R, cy - y2 * R);
    }
    // 昼夜对比拉开一些，晨昏线才看得出来
    const shades = ['rgba(20,62,55,0.5)', 'rgba(34,96,82,0.72)', 'rgba(62,150,124,0.9)', 'rgba(96,196,158,1)'];
    for (let k = 0; k < 4; k++) {
      const arr = buckets[k];
      if (!arr.length) continue;
      g.fillStyle = shades[k];
      for (let i = 0; i < arr.length; i += 2) g.fillRect(arr[i] - dot / 2, arr[i + 1] - dot / 2, dot, dot);
    }

    // 3. 城市之光
    const fasting = this.mode === 'fasting';
    // 「已点亮」标记：静止的白色小圆环，跟下面会脉动的选中环区分开。
    // 循环整体在 'lighter' 混合模式下，标记必须局部切回 'source-over'
    // 画完再切回去 —— 漏了切回去，当帧后面所有城市的光晕都会不对。
    const drawLitRing = (sx, sy, edge) => {
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.85 * edge;
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.1;
      g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.stroke();
      g.globalCompositeOperation = 'lighter';
    };
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < CITIES.length; i++) {
      const c = CITIES[i], v = c.vec;
      const s = fasting ? this._fast[i] : this._states[i];
      if (!s) continue;
      const x1 = v[0] * ca - v[2] * sa, z1 = v[0] * sa + v[2] * ca;
      const z2 = v[1] * sb + z1 * cb;
      const p = i * 3;
      if (z2 <= 0) { this._proj[p + 2] = 0; continue; }
      const y2 = v[1] * cb - z1 * sb;
      const sx = cx + x1 * R, sy = cy - y2 * R;
      this._proj[p] = sx; this._proj[p + 1] = sy; this._proj[p + 2] = 1;

      const active = fasting ? s.fasting : !!s.current;
      const edge = Math.min(1, z2 * 4);              // 靠近球体边缘时淡出
      if (!active) {
        g.globalAlpha = 0.30 * edge;
        g.fillStyle = 'rgba(150,190,175,1)';
        g.fillRect(sx - 0.9, sy - 0.9, 1.8, 1.8);
        if (this.isLit(c)) drawLitRing(sx, sy, edge);
        continue;
      }

      // 宣礼刚响时最亮，随后落回一个稳定的底光
      let intensity;
      if (fasting) {
        intensity = 0.55 + 0.35 * (1 - Math.abs(s.progress - 0.5) * 2);
      } else {
        const f = Math.max(0, 1 - s.since / FLASH_MS);
        intensity = 0.45 + 0.55 * f * f;
      }
      const key = fasting ? 'fasting' : s.current;
      const sprite = this.glow[key];
      const size = R * (0.045 + 0.055 * intensity);
      g.globalAlpha = (0.35 + 0.65 * intensity) * edge;
      g.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);

      g.globalAlpha = edge;
      const rgb = fasting ? FAST_COLOR : PRAYER_COLOR[s.current];
      g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const r = 1.1 + 1.5 * intensity;
      g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
      if (this.isLit(c)) drawLitRing(sx, sy, edge);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    // 4. 选中城市的标记环
    if (this.selected) {
      const i = CITIES.indexOf(this.selected);
      if (i >= 0 && this._proj[i * 3 + 2] > 0) {
        const sx = this._proj[i * 3], sy = this._proj[i * 3 + 1];
        const pulse = 1 + 0.12 * Math.sin(this.time / 400 + performance.now() / 400);
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(sx, sy, 9 * pulse, 0, 7); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.25)';
        g.beginPath(); g.arc(sx, sy, 15 * pulse, 0, 7); g.stroke();
      }
    }

    // 5. 球体边缘的一圈细光
    g.strokeStyle = 'rgba(110,220,180,0.20)'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  }
}
