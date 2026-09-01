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

/**
 * 地球的视觉参数。
 *
 * 抽出来是为了能并排比较不同的方案（见 tools/globe-lab/）—— 这些数字之间
 * 是互相牵扯的：陆地提亮一档，城市的光就得跟着压，否则晨昏线会被糊掉。
 * 散在 draw() 里逐个试，改一处看不出全局，得整套一起换。
 *
 * 默认值就是站上现在跑的那一套。传 opts.theme 只覆盖你写的那几个键。
 */
export const THEME = {
  /** 大气辉光。起点必须紧贴球面并迅速衰减，否则会变成一圈套在地球外的绿环 */
  halo: {
    from: 0.995, to: 1.14,
    stops: [[0, 'rgba(52,211,153,0.13)'], [0.28, 'rgba(16,185,129,0.05)'],
      [0.62, 'rgba(16,185,129,0.015)'], [1, 'rgba(16,185,129,0)']],
  },
  /** 球体本身。高光偏左上，模拟一个球该有的受光 */
  body: {
    hx: -0.3, hy: -0.35, hr: 0.05,
    stops: [[0, '#0d2b26'], [0.65, '#08201d'], [1, '#04120f']],
  },
  /**
   * 陆地点阵。shades 由暗到亮四档，对应夜 / 晨昏 / 昼 / 正午。
   *
   * 这四个数动过一轮又调了回来，记一笔省得后人重走：
   * 陆地是 7701 个格点，纬向步进 1.25° —— 720px 的球上点距约 8.1px，点本身只有 2px。
   * 稀疏 + 高对比 + 规则网格，是看久了会让人生理不适的那种构型（密集恐惧）。
   * 所以亮端不要再往上推：把 shades[3] 推到近白色并不会让晨昏线更清楚，
   * 只会把网格本身放大。真要强调分界，该压的是 shades[0]（让夜侧陆地融进球体底色），
   * 不是提 shades[3]。
   *
   * 想比较别的取法，tools/globe-lab/ 里存着七套参数和一块对比板。
   */
  land: {
    dot: 0.0042,
    shades: ['rgba(20,62,55,0.5)', 'rgba(34,96,82,0.72)',
      'rgba(62,150,124,0.9)', 'rgba(96,196,158,1)'],
  },
  /** 城市之光。glow 是光晕精灵的透明度曲线，size/alpha/core 是每座城市的尺寸与亮度 */
  city: {
    glow: [[0, 1], [0.25, 0.55], [0.6, 0.14], [1, 0]],
    size: [0.045, 0.055],     // R 的倍数：底 + 随亮度增加的部分
    alpha: [0.35, 0.65],
    core: [1.1, 1.5],         // 中心实心点的半径（像素）
    idle: { alpha: 0.30, color: 'rgba(150,190,175,1)', size: 1.8 },
  },
  /** 球体边缘的一圈细光 */
  limb: { color: 'rgba(110,220,180,0.20)', width: 1 },
  /** 经纬网：赤道与南北回归线（±23.44°），随黄道倾角一起倾斜 */
  graticule: {
    lines: [0, 23.44, -23.44],
    color: 'rgba(110,220,180,0.18)',
    width: 0.85,
    dash: [4,6],
    equatorColor: 'rgba(110,220,180,0.30)',
    equatorWidth: 1.05,
  },
};

const mergeTheme = (over) => {
  if (!over) return THEME;
  const out = {};
  for (const k in THEME) {
    out[k] = over[k] && typeof THEME[k] === 'object' && !Array.isArray(THEME[k])
      ? { ...THEME[k], ...over[k] } : (k in over ? over[k] : THEME[k]);
  }
  return out;
};

/**
 * 柔边陆地点的精灵。
 *
 * 陆地默认画成硬边方块：便宜，但 8.1px 的点距配 2px 的点，是一张扎眼的规则网格。
 * 换成柔边光斑、尺寸放到超过点距，相邻的斑互相渗透融成雾状陆地，网格感随之消失。
 * 代价是每帧 7701 次 drawImage，比 fillRect 贵 —— 所以做成可选，不是默认。
 */
function makeSoftDot(rgba) {
  const m = /rgba?\(([^)]+)\)/.exec(rgba);
  const [r, g0, b, a = 1] = (m ? m[1].split(',') : [0, 0, 0, 1]).map(Number);
  const S = 32, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgba(${r},${g0},${b},${a})`);
  grad.addColorStop(0.45, `rgba(${r},${g0},${b},${a * 0.55})`);
  grad.addColorStop(1, `rgba(${r},${g0},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return cv;
}

/** 预渲染光晕精灵，避免每帧为每座城市新建渐变 */
function makeGlow(rgb, curve) {
  const S = 64, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const [r, gg, b] = rgb;
  for (const [at, a] of curve) grad.addColorStop(at, `rgba(${r},${gg},${b},${a})`);
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
    // 黄道倾角：地球自转轴相对于黄道面的倾斜，23.44° 为真实值
    // 设为 0 可回退到旧版垂直自转
    this.tilt = opts.tilt ?? (23.44 * D);
    this.mode = 'prayer';             // 'prayer' | 'fasting'
    this.shadow = 1;                  // 晡礼影长倍数
    this.time = Date.now();
    this.selected = null;
    this.onSelect = opts.onSelect || (() => {});
    this.onInteract = opts.onInteract || (() => {});
    this.onMiss = opts.onMiss || (() => {});
    this.isLit = opts.isLit || (() => false);
    this.interactive = opts.interactive !== false;

    this.theme = mergeTheme(opts.theme);
    this.landSprite = this.theme.land.style === 'soft'
      ? this.theme.land.shades.map(makeSoftDot) : null;
    this.glow = {};
    for (const k in PRAYER_COLOR) this.glow[k] = makeGlow(PRAYER_COLOR[k], this.theme.city.glow);
    this.glow.fasting = makeGlow(FAST_COLOR, this.theme.city.glow);

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
    // 黄道倾角：23.44° 固定倾斜，轴在惯性系中不动，地球绕该倾斜轴自转
    // 正确顺序：先绕 Y（lon0，自转）→ 再绕 Z（tilt，固定黄道倾角）→ 再绕 X（lat0，视仰角）
    // 之前 tilt→Y 会使轴随 lon0 一起转，看着晕
    const tilt = this.tilt || 0;
    const ct = Math.cos(tilt), st = Math.sin(tilt);

    // 1. 球体本身 + 大气辉光
    // 光晕必须紧贴球体边缘并迅速衰减。起点若离球面太远、透明度若给太高，
    // 画出来就是一圈实心绿环，像个甜甜圈套在地球外面，而不是大气层。
    const T = this.theme;
    const halo = g.createRadialGradient(cx, cy, R * T.halo.from, cx, cy, R * T.halo.to);
    for (const [at, c] of T.halo.stops) halo.addColorStop(at, c);
    g.fillStyle = halo;
    g.beginPath(); g.arc(cx, cy, R * T.halo.to, 0, 7); g.fill();

    const body = g.createRadialGradient(
      cx + R * T.body.hx, cy + R * T.body.hy, R * T.body.hr, cx, cy, R);
    for (const [at, c] of T.body.stops) body.addColorStop(at, c);
    g.fillStyle = body;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();

    // 经纬网。画在陆地之下：它属于底图，压在点阵上会把陆地搅浑。
    //
    // 逐点采样而不是套椭圆公式：倾斜的正交投影下，纬线确实是椭圆，
    // 经线却是被转过一个角度的椭圆，两者要分别推导，还得单独处理正视时
    // 短轴退化成 0 的情形。采样几十个点连起来，背面直接剔除，一套代码管两种线。
    if (T.graticule) {
      const { step, color, width, lines, dash, equatorColor, equatorWidth } = T.graticule;

      // 球面 (纬,经) → 屏幕坐标；z <= 0 是背面（Y→tilt→X 顺序，轴固定）
      const project = (lat, lon) => {
        const cl = Math.cos(lat), x = cl * Math.sin(lon), y = Math.sin(lat), z = cl * Math.cos(lon);
        const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
        const xt = x1 * ct + y * st, yt = -x1 * st + y * ct, zt = z1;
        const z2 = yt * sb + zt * cb;
        return { x: cx + xt * R, y: cy - (yt * cb - zt * sb) * R, vis: z2 > 0 };
      };
      const stroke = (pts) => {
        let pen = false;
        g.beginPath();
        for (const p of pts) {
          if (!p.vis) { pen = false; continue; }
          if (pen) g.lineTo(p.x, p.y); else { g.moveTo(p.x, p.y); pen = true; }
        }
        g.stroke();
      };

      const N = 96;
      if (Array.isArray(lines) && lines.length){
        // 仅赤道与回归线：赤道稍亮实线，回归线细虚线
        for(const latDeg of lines){
          const lat = latDeg * D;
          const isEquator = Math.abs(latDeg) < 0.01;
          g.strokeStyle = isEquator ? (equatorColor || color) : color;
          g.lineWidth = isEquator ? (equatorWidth || width) : width;
          if(dash && !isEquator) g.setLineDash(dash); else g.setLineDash([]);
          stroke(Array.from({ length: N + 1 }, (_, i) => project(lat, (i / N) * 360 * D)));
        }
        g.setLineDash([]);
      } else if(step){
        const S = step * D;
        for (let lat = -60 * D; lat <= 60 * D + 1e-9; lat += S) {
          g.strokeStyle = color; g.lineWidth = width; g.setLineDash([]);
          stroke(Array.from({ length: N + 1 }, (_, i) => project(lat, (i / N) * 360 * D)));
        }
        for (let lon = 0; lon < 360 * D - 1e-9; lon += S) {
          g.strokeStyle = color; g.lineWidth = width; g.setLineDash([]);
          stroke(Array.from({ length: N + 1 }, (_, i) => project((-90 + (i / N) * 180) * D, lon)));
        }
      }
    }

    // 2. 陆地点阵。按昼夜明暗分档批量绘制，减少 fillStyle 切换
    const sun = this._sun;
    const dot = Math.max(0.7, R * T.land.dot);
    const buckets = [[], [], [], []];
    for (let i = 0; i < LAND_COUNT; i++) {
      const x = LAND[i * 3], y = LAND[i * 3 + 1], z = LAND[i * 3 + 2];
      // Y→tilt→X
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const xt = x1 * ct + y * st, yt = -x1 * st + y * ct, zt = z1;
      const z2 = yt * sb + zt * cb;
      if (z2 <= 0.02) continue;                       // 背面剔除
      // 高纬度剔除。等面积网格上纬度越高、一行绕的圈越小，投影后会挤成一道道同心弧，
      // 所以极冠一带不画。阈值 0.97 = 南北纬 75.93°：格陵兰、北极圈、南极洲边缘都在里面。
      // 掩码本身只到 ±84°，所以真正被切掉的是 75.9°~84° 那一圈 —— 既没有城市，
      // 也正是同心弧最密的地方。全球 7490 个陆地点里剔掉 347 个（4.6%），
      // 旧阈值剔的是 1119 个（14.9%）。
      //
      // 原来是 0.9 / -0.87（±64°/−60°），南极洲整块和格陵兰大半都被切掉了 ——
      // 「反正没人烟」这个理由对南极成立，但地球看着缺一块。放宽到 75° 后
      // 首屏视角的代价只有球缘那一圈点阵略密，实测四档对比后选的这一档。
      //
      // 判据必须是 y，不能是 yt。y 就是 sin(地理纬度)，切出来是一顶固定的地理极冠。
      // yt 是倾斜 23.44° 之后的屏幕竖向，算式 -x1*st + y*ct 里混进了经度，
      // 帽子会跟着地球一起转 —— 那样正面可见的陆地点会被剔掉 8%~24%，数量随转角
      // 在 389~745 之间摆动，最深吃到北纬 41°，同一块陆地转过去再转回来会一亮一灭。
      // 下面的 y2 / lit 仍用 yt，那是投影和昼夜，本来就该在倾斜后的坐标里算。
      if (y > 0.97 || y < -0.97) continue;
      const y2 = yt * cb - zt * sb;
      const lit = xt * sun[0] + yt * sun[1] + zt * sun[2];
      const k = lit > 0.25 ? 3 : lit > 0 ? 2 : lit > -0.18 ? 1 : 0;
      const arr = buckets[k];
      arr.push(cx + xt * R, cy - y2 * R);
    }
    // 昼夜对比拉开一些，晨昏线才看得出来
    const shades = T.land.shades;
    for (let k = 0; k < 4; k++) {
      const arr = buckets[k];
      if (!arr.length) continue;
      if (this.landSprite) {
        // 柔边：斑比点距大，相邻的互相渗透，融成连续的陆地而不是一张网格
        const sp = this.landSprite[k];
        for (let i = 0; i < arr.length; i += 2) {
          g.drawImage(sp, arr[i] - dot / 2, arr[i + 1] - dot / 2, dot, dot);
        }
        continue;
      }
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
      const xt = x1 * ct + v[1] * st, yt = -x1 * st + v[1] * ct, zt = z1;
      const z2 = yt * sb + zt * cb;
      const p = i * 3;
      if (z2 <= 0) { this._proj[p + 2] = 0; continue; }
      const y2 = yt * cb - zt * sb;
      const sx = cx + xt * R, sy = cy - y2 * R;
      this._proj[p] = sx; this._proj[p + 1] = sy; this._proj[p + 2] = 1;

      const active = fasting ? s.fasting : !!s.current;
      const edge = Math.min(1, z2 * 4);              // 靠近球体边缘时淡出
      if (!active) {
        g.globalAlpha = T.city.idle.alpha * edge;
        g.fillStyle = T.city.idle.color;
        const s2 = T.city.idle.size;
        g.fillRect(sx - s2 / 2, sy - s2 / 2, s2, s2);
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
      const size = R * (T.city.size[0] + T.city.size[1] * intensity);
      g.globalAlpha = (T.city.alpha[0] + T.city.alpha[1] * intensity) * edge;
      g.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);

      g.globalAlpha = edge;
      const rgb = fasting ? FAST_COLOR : PRAYER_COLOR[s.current];
      g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const r = T.city.core[0] + T.city.core[1] * intensity;
      g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
      if (this.isLit(c)) drawLitRing(sx, sy, edge);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    // 3.5 模拟完成点亮（A+B）：pulse + 单环 ripple，lighter 层，节律由 lit-sim 控制
    if(this._simQueue && this._simQueue.length){
      g.globalCompositeOperation = 'lighter';
      const nowEff = performance.now();
      for(const it of this._simQueue){
        const idx = CITIES.indexOf(it.city);
        if(idx<0) continue;
        if(this._proj[idx*3+2]<=0) continue;
        const sx=this._proj[idx*3], sy=this._proj[idx*3+1];
        const v=it.city.vec;
        const x1=v[0]*ca - v[2]*sa, z1=v[0]*sa + v[2]*ca;
        const xt=x1*ct + v[1]*st, yt=-x1*st + v[1]*ct, zt=z1;
        const z2=yt*sb + zt*cb;
        const edge=Math.min(1, z2*4);
        if(edge<=0.05) continue;
        const s=fasting? this._fast[idx] : this._states[idx];
        const cur = s && (fasting? 'fasting' : s.current);
        const rgb = cur ? (fasting? FAST_COLOR : PRAYER_COLOR[cur] || FAST_COLOR) : FAST_COLOR;
        const p=Math.min(1, Math.max(0, (nowEff - it.t0)/it.dur));
        if(p>=1) continue;
        // 缓动：outQuart
        const ease = 1 - Math.pow(1-p, 4);
        const easeIn = p*p;
        // A 脉动：核心与光晕同步胀亮后回落
        const pulse = 1 - p;
        const size = R * (T.city.size[0] + T.city.size[1] * (0.45 + 0.55*pulse)) * (1 + 0.18*ease*0.6);
        g.globalAlpha = (0.35 + 0.55*pulse) * edge * (1 - easeIn*0.3);
        const spr = this.glow[cur] || this.glow.fasting || this.glow.isha;
        if(spr) g.drawImage(spr, sx - size/2, sy - size/2, size, size);
        g.globalAlpha = edge * (0.9 * (1 - easeIn));
        g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        const r = (T.city.core[0] + T.city.core[1] * (0.55 + 0.35*pulse)) * (1 + 0.22*ease);
        g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
        // B 单环
        if(it.hasRing){
          const rp = Math.min(1, (nowEff - it.t0)/it.dur);
          const rr = 4 + 22 * rp;
          const ra = 0.85 * Math.pow(1 - rp, 1.2) * edge;
          if(ra>0.02){
            g.globalCompositeOperation='source-over';
            g.globalAlpha = ra;
            g.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`;
            g.lineWidth = 1.25 * (1 - rp*0.3);
            g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.stroke();
            g.globalCompositeOperation='lighter';
          }
        }
      }
      g.globalCompositeOperation='source-over';
      g.globalAlpha=1;
    }

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
    g.strokeStyle = T.limb.color; g.lineWidth = T.limb.width;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  }
}
