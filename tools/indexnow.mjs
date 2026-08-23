/* indexnow.mjs —— 把变更的 URL 主动推给搜索引擎
 *
 *   INDEXNOW_KEY=<key> node tools/indexnow.mjs
 *
 * IndexNow 是 Bing / Yandex / Seznam 共用的免费接口：站点根上放一个
 * <key>.txt 证明域名归你，然后就能主动通报"这些地址变了"，
 * 不用干等爬虫自己回来。Google 不参与，它那边只能靠 sitemap 和自然抓取。
 *
 * 没设 INDEXNOW_KEY 就安静跳过 —— 这一步是锦上添花，不该让构建失败。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { SITE, DIST, emit } from './lib/site.mjs';

const KEY = process.env.INDEXNOW_KEY?.trim();
const HOST = new URL(SITE.origin).host;

/** 把 key 落成站点根上的校验文件。没有它，接口一律拒收 */
export function writeKeyFile() {
  if (!KEY) return null;
  emit('/' + KEY + '.txt', KEY);
  return KEY;
}

/** 从生成好的站点地图里取回全部 URL —— 单独维护一份清单迟早会和实际产物对不上 */
function urlsFromSitemaps() {
  const dir = resolve(DIST, 'sitemaps');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.xml')) continue;
    const xml = readFileSync(resolve(dir, f), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) out.push(m[1]);
  }
  return [...new Set(out)];
}

async function submit(urls) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: SITE.origin + '/' + KEY + '.txt',
      urlList: urls,
    }),
  });
  return res.status;
}

export async function ping() {
  if (!KEY) { console.log('IndexNow：未设 INDEXNOW_KEY，跳过'); return; }

  const urls = urlsFromSitemaps();
  if (!urls.length) { console.log('IndexNow：站点地图里没有 URL，跳过'); return; }

  // 接口单次上限一万条，这里仍分批发，一批出错不至于把整次提交拖垮
  const BATCH = 5000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    try {
      const status = await submit(chunk);
      console.log('IndexNow：提交 ' + chunk.length + ' 条 → HTTP ' + status);
    } catch (e) {
      console.warn('IndexNow：这一批没发出去（' + e.message + '），继续');
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeKeyFile();
  await ping();
}
