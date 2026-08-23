/* city-popup.js —— 点击地球光点后弹出的气泡：开关、定位、跟踪
 *
 * 不含任何文案/翻译逻辑，内容由外部注入（见 main.js 的 renderPopupHTML），
 * 避免跟城市信息卡的渲染逻辑重复一份。
 *
 * 气泡必须是 <body> 的直接子元素，不能嵌在地球所在的层级里 ——
 * 那一层的 z-index 被限制在 1，暗渐变和底部控制条分别是 2、3，
 * 嵌进去会有一大片城市的气泡被盖住看不见。position:fixed + 视口坐标，
 * 天然绕开这个坑，桌面端和移动端一套代码。
 *
 * 跟踪定位是它自己独立的 rAF 循环，只在气泡打开时才跑：关闭时这个循环
 * 整个不存在，不给地球自身的渲染循环、也不给 main.js 那个每秒重刷的
 * setInterval 添负担。
 */

export function createCityPopup({ el, globe, cities }) {
  let openCity = null;
  let renderer = () => '';
  let raf = null;

  const indexOf = (city) => cities.indexOf(city);

  function track() {
    if (!openCity) return;
    const i = indexOf(openCity);
    // 转到背面（可见性标志变 0）就该关：覆盖视角用 focus() 缓动过去、
    // 但没有触发拖拽事件的情况——那种情况下没人会主动告诉气泡该关了
    if (i < 0 || globe._proj[i * 3 + 2] <= 0) { close(); return; }

    const rect = globe.cv.getBoundingClientRect();
    const pad = 10;
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = rect.left + globe._proj[i * 3];
    let y = rect.top + globe._proj[i * 3 + 1];
    // 夹在视口范围内，不是画布范围内——移动端地球缩到很小一块（比气泡本身
    // 还窄），夹在画布边界里对气泡宽度完全不够用，会把它反而推出屏幕。
    // 真正要保证的是"用户看得见"，那是视口的事，跟画布多大无关。
    x = Math.min(Math.max(x, pad), innerWidth - pad - w);
    y = Math.min(Math.max(y, pad + h), innerHeight - pad);
    el.style.transform = `translate(${x}px, ${y - h}px)`;

    raf = requestAnimationFrame(track);
  }

  function open(city) {
    openCity = city;
    el.innerHTML = renderer(city);
    el.hidden = false;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(track);
  }

  function close() {
    if (!openCity) return;
    openCity = null;
    el.hidden = true;
    cancelAnimationFrame(raf);
  }

  function refresh() {
    if (!openCity) return;
    el.innerHTML = renderer(openCity);
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.city-popup-close')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openCity) close();
  });

  return {
    open, close, refresh,
    isOpen: () => openCity != null,
    current: () => openCity,
    setRenderer: (fn) => { renderer = fn; },
  };
}
