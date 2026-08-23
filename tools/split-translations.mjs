/* split-translations.mjs — 把 _incoming.json 里的多语言文案拆成单文件
 *
 *   node tools/split-translations.mjs
 *
 * _incoming.json 形如 { "fr": {...}, "ru": {...} }，
 * 拆分后合并进 tools/translations/<code>.json（已有的键会被覆盖）。
 * 拆完即删 _incoming.json，避免它被误当成某个语言的文案。
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, 'translations');
const IN = resolve(DIR, '_incoming.json');

if (!existsSync(IN)) { console.error('没有找到 _incoming.json'); process.exit(1); }

const en = JSON.parse(readFileSync(resolve(DIR, 'en.json'), 'utf8'));
const enKeys = new Set(Object.keys(en));
const incoming = JSON.parse(readFileSync(IN, 'utf8'));

// 占位符和内联标签必须原样保留，翻译时最容易丢的就是这两样
const tokensOf = (s) => (String(s).match(/\{[a-z]+\}|<\/?[a-z]+>/gi) || []).sort().join(',');

let problems = 0;
for (const [loc, dict] of Object.entries(incoming)) {
  const file = resolve(DIR, `${loc}.json`);
  const cur = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  for (const [k, v] of Object.entries(dict)) {
    if (!enKeys.has(k)) { console.warn(`  ! ${loc}: 未知键 ${k}`); problems++; continue; }
    if (tokensOf(v) !== tokensOf(en[k])) {
      console.warn(`  ! ${loc}.${k}: 占位符不一致 期望[${tokensOf(en[k])}] 实际[${tokensOf(v)}]`);
      problems++;
    }
    cur[k] = v;
  }
  writeFileSync(file, JSON.stringify(cur, null, 1) + '\n');
  const missing = [...enKeys].filter((k) => !cur[k]);
  console.log(`  ${loc.padEnd(8)} ${String(Object.keys(cur).length).padStart(3)}/${enKeys.size} 键` +
    (missing.length ? `  缺 ${missing.length}` : '  完整'));
}
rmSync(IN);
console.log(problems ? `\n有 ${problems} 处问题，请检查` : '\n占位符校验通过');
