/* og-card.js —— 城市页的链接预览图（1200×630）
 *
 * 分享链接时聊天软件会抓 og:image 展开成预览卡。这批图由构建期用真浏览器
 * 渲染出来（见 tools/build-og.mjs），走的是和用户屏幕上同一套 globe.js，
 * 所以不会画歪，也不会因为哪天改了地球渲染就悄悄漂移。
 *
 * ── 为什么图上不写礼拜时刻 ──────────────────────────────
 * 这是这张卡最重要的一个决定。WhatsApp / Telegram 会把 og:image 缓存很久，
 * 一条几周前分享的链接，预览里仍然是那天抓到的那张图。礼拜时刻每天挪一两分钟，
 * 一个月就能差出小半个钟头 —— 而这是一个礼拜应用，预览里挂着一个错的时刻，
 * 比不写时刻糟糕得多。
 *
 * 所以图上只放不会过期的东西：城市名、所在国家、以它为中心的地球、
 * 朝向角与到麦加的距离。真正的今日时刻走 og:description ——
 * 那是纯文本，抓取端每次重抓都会更新，成本也低。
 */
import { Globe } from './globe.js';
import { qiblaBearing, distanceToMakkah } from './cities.js';

export const OG_W = 1200;
export const OG_H = 630;

const SANS = "'Noto Sans SC', system-ui, sans-serif";
const NASKH = "'Amiri', 'Noto Naskh Arabic', serif";

/** 地球压在右侧，右边略微出框 —— 看起来是从画面外转进来的，而不是贴了张圆图。
 *  中心放在 930：再往左会被文字区那层暗渐变压掉一大块，白渲染了。 */
const GLOBE_SIZE = 720;
const GLOBE_CX = 930;

function paintBackdrop(g) {
  const bg = g.createLinearGradient(0, 0, OG_W, OG_H);
  bg.addColorStop(0, '#062b23');
  bg.addColorStop(0.55, '#04120f');
  bg.addColorStop(1, '#071a17');
  g.fillStyle = bg;
  g.fillRect(0, 0, OG_W, OG_H);
}

/** 文字区的暗渐变。收在 640 之内：地球左缘大约在 570，
 *  铺得太宽会把刚点亮的那半个球又抹黑回去 */
function paintScrim(g) {
  const scrim = g.createLinearGradient(0, 0, 640, 0);
  scrim.addColorStop(0, 'rgba(4,16,14,0.92)');
  scrim.addColorStop(0.6, 'rgba(4,16,14,0.7)');
  scrim.addColorStop(1, 'rgba(4,16,14,0)');
  g.fillStyle = scrim;
  g.fillRect(0, 0, 640, OG_H);
}

/** 离屏地球。整批 152 座城市共用一个实例，省掉一百多次建画布 */
let host = null, globe = null;
function offscreenGlobe(size) {
  if (globe) return globe;
  host = document.createElement('div');
  host.style.cssText =
    `position:fixed;left:-9999px;top:0;width:${size}px;height:${size}px;pointer-events:none`;
  const cv = document.createElement('canvas');
  host.appendChild(cv);
  document.body.appendChild(host);
  // interactive:false 很关键 —— 否则会给一个永远不会被看见的画布绑上指针事件
  globe = new Globe(cv, { interactive: false, zoom: 0.98 });
  return globe;
}

/**
 * 该城当地的太阳正午（UTC 时间戳）。
 *
 * 卡片上不写时刻，地球的光照因此是纯装饰。按「此刻」渲染的话，
 * 有一半城市会落在夜面上 —— 整张图黑成一片，看不出是地球。
 * 统一按当地正午渲染：城市永远落在被照亮的一面，152 张卡的明暗一致，
 * 而每座城市脚下的陆地形状不同，图与图之间照样区分得开。
 *
 * 忽略均时差（最多十几分钟），装饰用途上看不出来。
 */
function solarNoon(lon, base = Date.now()) {
  const d = new Date(base);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return day + (12 - lon / 15) * 3600e3;
}

function renderGlobe(city, ts, size) {
  const g = offscreenGlobe(size);
  g.time = ts;
  g.mode = 'prayer';
  g.shadow = 1;
  g.lon0 = city.lon;
  // 高纬度城市把视角压回 ±55°，否则地球会转到只剩一个极点
  g.lat0 = Math.max(-55, Math.min(55, city.lat));
  // 标记环。整张卡讲的就是这一座城，不标出来的话，图上只是一片分不清谁是谁的光点
  g.selected = city;
  g._statesAt = -1; g._sunAt = -1;   // 换城市后强制重算光照与状态
  g.draw();
  return g.cv;
}

/**
 * 站点级的预览图：44 个语言首页用，也是没有城市页那些语言的兜底。
 * 和城市卡同一套构图，只是地球用默认视角、不标任何一座城。
 */
export function drawOgSiteCard(cityCount, countryCount) {
  const cv = document.createElement('canvas');
  cv.width = OG_W; cv.height = OG_H;
  const g = cv.getContext('2d');

  paintBackdrop(g);

  const glb = offscreenGlobe(GLOBE_SIZE);
  glb.time = Date.now();
  glb.mode = 'prayer';
  glb.shadow = 1;
  glb.lon0 = 45; glb.lat0 = 18;      // 与站点首屏同一个默认视角
  glb.selected = null;
  glb._statesAt = -1; glb._sunAt = -1;
  glb.draw();
  g.drawImage(glb.cv, GLOBE_CX - GLOBE_SIZE / 2, OG_H / 2 - GLOBE_SIZE / 2, GLOBE_SIZE, GLOBE_SIZE);

  paintScrim(g);

  const x = 76;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';

  g.fillStyle = '#34d399';
  g.font = `600 24px ${SANS}`;
  g.letterSpacing = '4px';
  g.fillText('NOORWAQT', x, 96);
  g.letterSpacing = '0px';

  g.fillStyle = '#e8f5f0';
  g.font = `700 68px ${SANS}`;
  g.fillText('Global prayer times', x, 190);

  g.fillStyle = '#a8c5bb';
  g.font = `400 30px ${SANS}`;
  g.fillText('Watch the light of prayer sweep the earth', x, 244);

  g.strokeStyle = 'rgba(126,231,190,0.22)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, 300); g.lineTo(x + 560, 300); g.stroke();

  g.fillStyle = '#a8c5bb';
  g.font = `500 26px ${SANS}`;
  g.fillText('Fajr · Dhuhr · Asr · Maghrib · Isha', x, 348);

  const nf = new Intl.NumberFormat('en');
  stat(g, x, 414, 'CITIES', nf.format(cityCount));
  stat(g, x + 300, 414, 'COUNTRIES', nf.format(countryCount));

  g.fillStyle = '#6e8f85';
  g.font = `400 26px ${SANS}`;
  g.fillText('noorwaqt.com', x, 590);

  return cv;
}

/** 一行小标签 + 一行大数值 */
function stat(g, x, y, label, value) {
  g.fillStyle = '#6e8f85';
  g.font = `500 22px ${SANS}`;
  g.letterSpacing = '2px';
  g.fillText(label, x, y);
  g.letterSpacing = '0px';

  g.fillStyle = '#e8f5f0';
  g.font = `600 40px ${SANS}`;
  g.fillText(value, x, y + 50);
}

/**
 * 画一座城市的预览图。
 * @param {object} city  cities.js 里的一条
 * @param {string} country 国家名（英文，构建期传进来）
 * @param {number} ts 用哪个时刻的光照，默认此刻
 */
export function drawOgCard(city, country, ts = solarNoon(city.lon)) {
  const cv = document.createElement('canvas');
  cv.width = OG_W; cv.height = OG_H;
  const g = cv.getContext('2d');

  paintBackdrop(g);
  const gl = renderGlobe(city, ts, GLOBE_SIZE);
  if (gl) g.drawImage(gl, GLOBE_CX - GLOBE_SIZE / 2, OG_H / 2 - GLOBE_SIZE / 2, GLOBE_SIZE, GLOBE_SIZE);
  paintScrim(g);

  const x = 76;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';

  g.fillStyle = '#34d399';
  g.font = `600 24px ${SANS}`;
  g.letterSpacing = '4px';
  g.fillText('NOORWAQT', x, 96);
  g.letterSpacing = '0px';

  // 城市名。字数多的城市（Bandar Seri Begawan）要自动缩字号，不能让它出框
  let size = 76;
  g.font = `700 ${size}px ${SANS}`;
  while (g.measureText(city.en).width > 600 && size > 42) {
    size -= 4;
    g.font = `700 ${size}px ${SANS}`;
  }
  g.fillStyle = '#e8f5f0';
  g.fillText(city.en, x, 200);

  // 阿文名：阿拉伯字母系在全球穆斯林里的辨识度最高，
  // 而卡片是语言中立的（152 座城市各一张，不随界面语言变）
  if (city.ar && city.ar !== city.en) {
    g.fillStyle = '#a8c5bb';
    g.font = `400 44px ${NASKH}`;
    g.fillText(city.ar, x, 262);
  }

  g.fillStyle = '#6e8f85';
  g.font = `400 28px ${SANS}`;
  g.fillText(country, x, 312);

  g.strokeStyle = 'rgba(126,231,190,0.22)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, 356); g.lineTo(x + 560, 356); g.stroke();

  // 五番拜只列名字不列时刻：名字不会过期，时刻会
  g.fillStyle = '#a8c5bb';
  g.font = `500 26px ${SANS}`;
  g.fillText('Fajr · Dhuhr · Asr · Maghrib · Isha', x, 404);

  // 麦加自己这一张没有「朝向」可言：人就在克尔白跟前。
  // 角度和距离要一起挡掉 —— 只挡距离会留下一个「QIBLA 0.0°」，更奇怪
  const km = Math.round(distanceToMakkah(city.lat, city.lon));
  if (km > 5) {
    stat(g, x, 470, 'QIBLA', qiblaBearing(city.lat, city.lon).toFixed(1) + '°');
    stat(g, x + 300, 470, 'TO MAKKAH', new Intl.NumberFormat('en').format(km) + ' km');
  }

  g.fillStyle = '#6e8f85';
  g.font = `400 26px ${SANS}`;
  g.fillText('noorwaqt.com', x, 590);

  return cv;
}
