#!/usr/bin/env node
/**
 * Extract clean content fragments from each crawled page.
 *
 * For each /_crawl/pages/<slug>/raw.html:
 *   - Locate [data-elementor-type="wp-page"] container.
 *   - Strip scripts/styles/header/footer/nav/forms/Elementor widgets.
 *   - Reduce wrapper divs/spans, drop class/id/data-/style attrs.
 *   - Preserve headings, paragraphs, lists, images, links, emphasis, tables.
 *   - Rewrite image src to local /images/services/<basename> for known assets.
 *   - Save to src/content/<slug>.njk for {% include %} from page templates.
 *
 * The CCPA page (slug "ccpa") is special: its <form>...</form> is preserved
 * verbatim because the user wants to keep that page's existing form intact.
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, '_crawl', 'pages');
const OUT = path.join(ROOT, 'src', 'content');
fs.mkdirSync(OUT, { recursive: true });

const KEEP_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','ul','ol','li','a','strong','em','b','i','u','br','img','blockquote','table','thead','tbody','tr','th','td','hr','figure','figcaption']);
const KEEP_ATTRS = {
  a: ['href', 'rel', 'target'],
  img: ['src', 'alt', 'width', 'height'],
};

// Map original WordPress upload paths to our cleaned local paths
const IMG_REWRITES = {
  'biker-attorney.jpg': '/images/services/biker-attorney.jpg',
  'rideshare.png': '/images/services/rideshare-icon.png',
  'pedestrian-accident2-e1765220704263.jpg': '/images/services/pedestrian-hero.jpg',
  'pedestrian.png': '/images/services/pedestrian-icon.png',
  'motorcycle-1024x684.png': '/images/services/motorcycle-icon.png',
  'commercial-vehicles3.jpg': '/images/services/commercial-hero.jpg',
  'truck.png': '/images/services/truck-icon.png',
};

function rewriteImg(src) {
  if (!src) return src;
  const base = src.split('/').pop().split('?')[0];
  if (IMG_REWRITES[base]) return IMG_REWRITES[base];
  // strip wp-content/uploads paths if remote
  if (/accidentlogic\.com/.test(src) || src.startsWith('/wp-content')) return null; // drop unknown remote
  return src;
}

function cleanNode($, el, isCcpa) {
  // Remove children that are scripts, styles, forms (unless CCPA)
  $(el).find('script,style,noscript,iframe,svg,button').remove();
  if (!isCcpa) $(el).find('form,.elementor-form,.wpforms-container,.gform_wrapper').remove();
  // Remove Elementor / WP UI wrappers we don't want by class hint
  $(el).find('.elementor-button-wrapper,.elementor-icon-list-icon,.skip-link,[role="dialog"]').remove();

  // Walk every descendant and clean attributes
  $(el).find('*').each((i, n) => {
    const tag = n.name;
    if (!KEEP_TAGS.has(tag)) {
      // Unwrap unknown tag (replace with its children)
      $(n).replaceWith($(n).contents());
      return;
    }
    const allowed = KEEP_ATTRS[tag] || [];
    for (const attr of Object.keys(n.attribs || {})) {
      if (!allowed.includes(attr)) $(n).removeAttr(attr);
    }
    if (tag === 'img') {
      const newSrc = rewriteImg($(n).attr('src'));
      if (!newSrc) { $(n).remove(); return; }
      $(n).attr('src', newSrc);
      if (!$(n).attr('alt')) $(n).attr('alt', '');
      $(n).attr('loading', 'lazy');
    }
    if (tag === 'a') {
      let href = $(n).attr('href') || '';
      // Make internal links relative
      href = href.replace(/^https?:\/\/(www\.)?accidentlogic\.com/, '');
      if (!href) $(n).removeAttr('href');
      else $(n).attr('href', href);
    }
  });
  return $(el);
}

function collapseEmpties($, root) {
  // Remove empty <p>, <li>, etc.
  let changed = true;
  while (changed) {
    changed = false;
    $(root).find('p,li,div,span,h1,h2,h3,h4,h5,h6').each((i, n) => {
      const html = $(n).html();
      if (html === null || html.trim() === '' || html.trim() === '&nbsp;') {
        $(n).remove();
        changed = true;
      }
    });
  }
}

function extract(slug) {
  const file = path.join(PAGES, slug, 'raw.html');
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  $('script,style,noscript,iframe').remove();
  // Drop the WP header / footer Elementor templates so we keep only page content
  $('[data-elementor-type="header"],[data-elementor-type="footer"]').remove();

  const wp = $('[data-elementor-type="wp-page"]').first();
  const target = wp.length ? wp : $('main, article, body').first();
  const isCcpa = slug === 'ccpa';
  cleanNode($, target, isCcpa);
  collapseEmpties($, target);

  // Pull innerHTML
  let out = $(target).html() || '';

  // Replace any tel: link (with formatted phone in body) with dynamic-phone markers
  // so phone-config.js controls the number on every page.
  out = out.replace(
    /<a([^>]*)href="tel:[^"]*"([^>]*)>([^<]*)<\/a>/gi,
    (m, pre, post, body) => `<a${pre}href="tel:+18776651553"${post} data-dynamic-phone-tel><span data-dynamic-phone>${body.trim() || '877-665-1553'}</span></a>`
  );
  // Strip stray (833) 200-7101 plain-text occurrences? Leave to manual review.

  // Squeeze whitespace runs
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return out;
}

const SERVICE_SLUGS = new Set(['rideshare-accidents','pedestrian-accidents','motorcycle-injury','commercial-vehicles']);
const LEGAL_SLUGS = new Set(['privacy-policy','terms-conditions','ccpa-policy']);

const SLUGS = [
  'index','rideshare-accidents','pedestrian-accidents','motorcycle-injury','commercial-vehicles',
  'privacy-policy','terms-conditions','ccpa-policy','ccpa','opt-out',
  'thank-you','thank-you-int','cm-thank-you',
];

for (const slug of SLUGS) {
  let html = extract(slug);
  if (!html) { console.log('SKIP', slug); continue; }
  if (SERVICE_SLUGS.has(slug)) {
    // Service page templates render their own H1 + subhead from services.json,
    // so strip the original leading H1 (and the H5 subhead that follows it).
    html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    html = html.replace(/^\s*<h5[^>]*>[\s\S]*?<\/h5>\s*/i, '');
  }
  if (LEGAL_SLUGS.has(slug)) {
    // Legal templates render their own H1; strip the leading h1/h2 from content
    // (Yoast titles often duplicate the page heading) and demote any further
    // H1s in the body to H2 so each page has exactly one H1.
    html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    html = html.replace(/^\s*<h2[^>]*>[\s\S]*?<\/h2>\s*/i, '');
    html = html.replace(/<h1>/gi, '<h2>').replace(/<\/h1>/gi, '</h2>');
  }
  fs.writeFileSync(path.join(OUT, `${slug}.njk`), html + '\n');
  console.log(`Wrote src/content/${slug}.njk  (${html.length} chars)`);
}
