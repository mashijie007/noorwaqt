/* lang-pick.js —— 语言协商。纯函数，不碰 DOM、localStorage、navigator。
 *
 * 必须是纯的，因为它有三个消费者：
 *   1. main.js 正常 import
 *   2. 构建期把这个文件的源码当文本读出来、去掉 export，内联进根页面的 boot 脚本
 *   3. tools/lib/_test-lang-pick.mjs 直接调
 * 写死两份拷贝迟早会漂，而漂的后果是首帧和 main.js 挑出两种不同的语言 ——
 * 用户看到的是连闪两次，比什么都不做更糟。
 *
 * 同理：这里不许 import 任何东西。它会被内联成一段没有模块系统的裸脚本。
 */

/**
 * @param {string[]} codes  支持的语言码（LOCALES 的 code 集合）
 * @param {string|null} saved  上次的选择（localStorage 的 nw-lang），没有就传 null
 * @param {string[]} prefs  浏览器偏好（navigator.languages）
 * @returns {string} 语言码，兜底 'en'
 */
export function pickLang(codes, saved, prefs) {
  if (saved && codes.indexOf(saved) >= 0) return saved;

  var list = prefs || [];
  for (var i = 0; i < list.length; i++) {
    var l = String(list[i]).toLowerCase();
    // 中文要先分繁简：zh-TW / zh-HK / zh-MO / zh-Hant 都归繁体
    if (l.indexOf('zh') === 0) return /hant|tw|hk|mo/.test(l) ? 'zh_Hant' : 'zh';
    var base = l.split('-')[0];
    for (var j = 0; j < codes.length; j++) {
      if (codes[j] === base || codes[j].split('_')[0] === base) return codes[j];
    }
  }
  return 'en';
}
