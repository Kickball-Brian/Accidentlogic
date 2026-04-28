#!/usr/bin/env node
/**
 * accidentlogic.com crawler.
 *
 * - Pulls page list from the Yoast sitemap (page-sitemap.xml).
 * - Fetches each page (throttled, ~1s gap) with a clear User-Agent.
 * - Saves raw HTML to _crawl/pages/<slug>/index.html (preserves URL paths).
 * - Extracts SEO metadata into _crawl/inventory.json.
 * - Downloads referenced images to _crawl/assets/ keyed off their pathname.
 *
 * Usage: node _tools/crawl.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');

const ORIGIN = 'https://accidentlogic.com';
const UA = 'AccidentLogic-Migrator (contact: brian.remavich@gmail.com)';
const OUT = path.join(__dirname, '..', '_crawl');
const PAGES_DIR = path.join(OUT, 'pages');
const ASSETS_DIR = path.join(OUT, 'assets');
const THROTTLE_MS = 1000;

fs.mkdirSync(PAGES_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xml' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(new URL(res.headers.location, url).toString()));
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers, finalUrl: url }));
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(new URL(res.headers.location, url).toString()));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugFromUrl(u) {
  const p = new URL(u).pathname.replace(/\/+$/, '');
  return p === '' ? 'index' : p.replace(/^\//, '');
}

async function getSitemapUrls() {
  const sm = await fetchText(`${ORIGIN}/page-sitemap.xml`);
  const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return urls;
}

function extractSeo($, pageUrl) {
  const title = $('title').first().text().trim();
  const desc = $('meta[name="description"]').attr('content') || '';
  const robots = $('meta[name="robots"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const h1s = $('h1').map((i, el) => $(el).text().trim()).get();
  const h2s = $('h2').map((i, el) => $(el).text().trim()).get();
  const imgs = $('img').map((i, el) => ({
    src: $(el).attr('src') || $(el).attr('data-src') || '',
    alt: $(el).attr('alt') || '',
    width: $(el).attr('width') || '',
    height: $(el).attr('height') || '',
  })).get().filter((x) => x.src);
  const links = $('a[href]').map((i, el) => $(el).attr('href')).get();
  const internal = links.filter((h) => h && (h.startsWith('/') || h.includes('accidentlogic.com')));
  const external = links.filter((h) => h && /^https?:\/\//.test(h) && !h.includes('accidentlogic.com'));
  const forms = $('form').length;
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const jsonLd = $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get();

  return {
    url: pageUrl,
    title, titleLength: title.length,
    description: desc, descriptionLength: desc.length,
    robots, canonical,
    ogTitle, ogDesc, ogImage,
    h1Count: h1s.length, h1s,
    h2Count: h2s.length, h2s: h2s.slice(0, 20),
    imgCount: imgs.length, imgs, imgsMissingAlt: imgs.filter((i) => !i.alt).length,
    linkCount: links.length, internalLinks: internal.length, externalLinks: external.length,
    forms,
    wordCount,
    jsonLdCount: jsonLd.length,
    jsonLd,
  };
}

async function downloadAsset(srcUrl) {
  try {
    const u = new URL(srcUrl, ORIGIN);
    if (!u.hostname.includes('accidentlogic.com')) return null;
    const rel = u.pathname.replace(/^\//, '');
    const dest = path.join(ASSETS_DIR, rel);
    if (fs.existsSync(dest)) return rel;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const res = await fetchBuffer(u.toString());
    if (res.status !== 200) return null;
    fs.writeFileSync(dest, res.body);
    return rel;
  } catch (e) {
    return null;
  }
}

(async () => {
  console.log('Fetching sitemap…');
  const urls = await getSitemapUrls();
  console.log(`Found ${urls.length} URLs`);

  const inventory = [];
  const allImgs = new Set();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const slug = slugFromUrl(url);
    process.stdout.write(`[${i + 1}/${urls.length}] ${url} … `);
    try {
      const res = await fetchText(url);
      const $ = cheerio.load(res.body);
      const seo = extractSeo($, url);
      seo.status = res.status;
      seo.slug = slug;

      const pageDir = path.join(PAGES_DIR, slug);
      fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(path.join(pageDir, 'raw.html'), res.body);
      fs.writeFileSync(path.join(pageDir, 'meta.json'), JSON.stringify(seo, null, 2));

      seo.imgs.forEach((im) => allImgs.add(im.src));
      inventory.push(seo);
      console.log(`OK  (title=${seo.title.length}c, words=${seo.wordCount}, imgs=${seo.imgCount})`);
    } catch (e) {
      console.log(`ERR ${e.message}`);
      inventory.push({ url, slug, status: 0, error: e.message });
    }
    await sleep(THROTTLE_MS);
  }

  console.log(`\nDownloading ${allImgs.size} unique images…`);
  let dl = 0, fail = 0;
  for (const src of allImgs) {
    const rel = await downloadAsset(src);
    if (rel) dl++; else fail++;
    if ((dl + fail) % 10 === 0) process.stdout.write('.');
    await sleep(150);
  }
  console.log(`\nAssets: ${dl} ok, ${fail} skipped/failed`);

  fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(inventory, null, 2));
  console.log(`\nWrote ${OUT}/inventory.json (${inventory.length} pages)`);
})();
