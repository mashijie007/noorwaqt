/* lit-cities.js —— 「点亮」的本地记录
 *
 * 纯客户端、个人本地：你点过哪些城市，只存在你自己的浏览器里，不联网、
 * 不跨访客。跨访客的「全球有多少人点亮了这座城市」是完全不同的一件事，
 * 需要接后端，属于下一期。
 *
 * 只有真的点了才算数：地理定位算出来的那个临时城市对象、按时区猜的默认
 * 城市，都绕开这个模块——见 main.js 里 selectCity() 和 #locate 的处理。
 */
import { CITIES } from './cities.js';

const KEY = 'nw-lit-cities';
const MKEY = 'nw-lit-milestones';
const MILESTONES = [0.25, 0.5, 0.75, 1];

export const LIT_TOTAL = CITIES.length;

const VALID = new Set(CITIES.map((c) => c.en));

/** localStorage 在隐私模式下会直接抛错，一律当作「还没点过 / 没弹过」 */
const readSet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const writeSet = (key, set) => {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* 记不住就下次再算 */ }
};

let lit = readSet(KEY);
let shown = readSet(MKEY);

export function isLit(city) {
  return lit.has(city.en);
}

/** 真正新点亮才返回 true；已经点过、或者不是 CITIES 里的真实城市，一律 false */
export function lightCity(city) {
  if (!city || !VALID.has(city.en) || lit.has(city.en)) return false;
  lit.add(city.en);
  writeSet(KEY, lit);
  return true;
}

export function litCount() {
  return lit.size;
}

/**
 * 在 lightCity() 返回 true 之后调用。跨过 25/50/75/100% 门槛时返回那个
 * 分数，每个门槛一辈子只弹一次（哪怕是老用户一次性点过好几座城市，
 * 一口气跨过两个门槛，这里也只报当次跨过的最高一个，不连环弹）。
 */
export function checkMilestone() {
  const frac = lit.size / LIT_TOTAL;
  let hit = null;
  for (const m of MILESTONES) {
    if (frac >= m && !shown.has(String(m))) hit = m;
  }
  if (hit == null) return null;
  shown.add(String(hit));
  writeSet(MKEY, shown);
  return hit;
}
