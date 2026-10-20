/* nav-items.mjs —— 长文页顶部导航的条目清单
 *
 * 问答页和起名页共用一条导航。单独放一个文件，是因为「哪些栏目存在」
 * 这件事将来还会变（下一个栏目一加，三种语言 × 两个生成器 = 六处要改），
 * 而两个生成器都只想知道「给我这门语言的导航」。
 *
 * 只有确实出了这门语言译文的栏目才会出现在导航里：导航指到 404，
 * 比少一个入口糟得多。各栏目的语言集合在这里登记。
 */

/** 栏目 → 有哪些语言。与 tools/guides/*.mjs、tools/names/*.mjs 的文件对应 */
const SECTIONS = {
  guide: ['zh', 'en', 'id'],
  names: ['zh', 'en', 'id'],
};

/**
 * @param lang    当前页的语言
 * @param ui      当前语言的 ui 文案，要有 navHome / navGuide / navNames
 * @param current 当前所在栏目：'guide' | 'names' | undefined
 */
export function navItems(lang, ui, current) {
  const items = [{ href: '/', label: ui.navHome }];

  if (SECTIONS.guide.includes(lang)) {
    items.push({ href: `/${lang}/guide/`, label: ui.navGuide, current: current === 'guide' });
  }
  if (SECTIONS.names.includes(lang)) {
    items.push({ href: `/${lang}/names/`, label: ui.navNames, current: current === 'names' });
  }

  return items;
}

/** 某个栏目出了哪些语言。生成器算 hreflang 时用 */
export const langsOf = (section) => SECTIONS[section].slice();
