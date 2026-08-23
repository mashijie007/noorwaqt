/* consent.js — 统计分析的同意条
 *
 * Firebase Analytics 会写下标识符、把 IP 交给 Google，属于「非必要」追踪。
 * 所以在用户点下「同意」之前，一行 Firebase 代码都不加载 —— 不是加载完再
 * 关掉，是根本不发那两个 gstatic 请求。这样页面上关于隐私的说法才站得住。
 *
 * 选择存在 localStorage：
 *   granted —— 加载分析，window.track 变成真正的上报函数
 *   denied  —— 永不加载，window.track 保持空函数
 *   未选择  —— 显示同意条
 * 页脚留了一个入口（#consent-manage），随时可以把同意条再叫出来改主意。
 *
 * 同意条的文案走 data-i18n，由 main.js 的 applyLang 统一翻译，44 种语言通用。
 */

const KEY = 'nw-consent';

const FIREBASE = {
  apiKey: 'AIzaSyAu3jdUQRC1ApxUTo-Wg_XSryzDL1WQAOE',
  authDomain: 'prayer-app-beta.firebaseapp.com',
  projectId: 'prayer-app-beta',
  storageBucket: 'prayer-app-beta.firebasestorage.app',
  messagingSenderId: '187276729560',
  appId: '1:187276729560:web:7f41bf4a760e87a4c74bad',
  measurementId: 'G-VRM9DCM286',
};

const NOOP = () => {};

/** localStorage 在隐私模式 / 禁用 Cookie 的浏览器里会直接抛错，一律当作「没选过」 */
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* 记不住就下次再问 */ } };

// 同一个会话里只加载一次；重复点「同意」不会再发一遍请求
let loading = null;

function loadAnalytics() {
  if (loading) return loading;
  loading = (async () => {
    const [{ initializeApp }, { getAnalytics, logEvent }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js'),
    ]);
    const analytics = getAnalytics(initializeApp(FIREBASE));
    window.track = (name, params) => logEvent(analytics, name, params || {});
  })().catch((e) => {
    console.warn('Analytics unavailable:', e);
    window.track = NOOP;
  });
  return loading;
}

/**
 * 撤回同意。Firebase 一旦加载进来就没法从这个页面里卸载，
 * 所以这里做两件力所能及的事：切断上报，并清掉 GA 已经写下的 Cookie。
 * 真正的彻底清除发生在下一次刷新 —— 那时它压根不会被加载。
 */
function revoke() {
  window.track = NOOP;
  const host = location.hostname;
  // 逐级向上试父域：GA 的 Cookie 通常写在 .noorwaqt.com 上，而不是当前子域
  const domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const d of domains) {
      document.cookie = `${name}=; max-age=0; path=/${d ? '; domain=' + d : ''}`;
    }
  }
}

export function initConsent() {
  const bar = document.getElementById('consent');
  if (!bar) return;

  const close = () => { bar.hidden = true; };
  const open = () => { bar.hidden = false; };

  const decide = (choice) => {
    write(choice);
    close();
    if (choice === 'granted') loadAnalytics(); else revoke();
  };

  bar.querySelector('#consent-allow')?.addEventListener('click', () => decide('granted'));
  bar.querySelector('#consent-deny')?.addEventListener('click', () => decide('denied'));
  document.getElementById('consent-manage')?.addEventListener('click', (e) => {
    e.preventDefault();
    open();
    bar.querySelector('#consent-allow')?.focus();
  });

  const saved = read();
  if (saved === 'granted') loadAnalytics();
  else if (saved !== 'denied') open();
}

initConsent();
