const nunjucks = require('nunjucks');
const fs = require('fs');
const path = require('path');

const env = nunjucks.configure(path.join(__dirname, 'src'), {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
  noCache: true,
});

// Globals available to every template
const siteData = require('./src/data/site.json');
const phoneData = require('./src/data/phones.json');
const servicesData = require('./src/data/services.json');
const faqsData = require('./src/data/faqs.json');
env.addGlobal('site', siteData);
env.addGlobal('phones', phoneData);
env.addGlobal('services', servicesData);
env.addGlobal('faqs', faqsData);

const distDir = path.join(__dirname, 'dist');
const distCssDir = path.join(distDir, 'css');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distCssDir)) fs.mkdirSync(distCssDir, { recursive: true });

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.gitkeep' || entry.name === '.DS_Store') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// Copy CSS
const cssSrc = path.join(__dirname, 'css', 'main.css');
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, path.join(distCssDir, 'main.css'));
  console.log('Copied: css/main.css');
}

// Copy images
copyDirRecursive(path.join(__dirname, 'images'), path.join(distDir, 'images'));
console.log('Copied: images/');

// Copy static root files if present
['form.min.js', 'sitemap.xml', 'robots.txt', '.htaccess', 'phone-config.js', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest'].forEach((f) => {
  const src = path.join(__dirname, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, f));
    console.log(`Copied: ${f}`);
  }
});

// Pages: [template, output path]
const pages = [
  ['templates/index.njk',                 'index.html'],
  ['templates/rideshare-accidents.njk',   'rideshare-accidents/index.html'],
  ['templates/pedestrian-accidents.njk',  'pedestrian-accidents/index.html'],
  ['templates/motorcycle-injury.njk',     'motorcycle-injury/index.html'],
  ['templates/commercial-vehicles.njk',   'commercial-vehicles/index.html'],
  ['templates/privacy-policy.njk',        'privacy-policy/index.html'],
  ['templates/terms-conditions.njk',      'terms-conditions/index.html'],
  ['templates/ccpa-policy.njk',           'ccpa-policy/index.html'],
  ['templates/ccpa.njk',                  'ccpa/index.html'],
  ['templates/opt-out.njk',               'opt-out/index.html'],
  ['templates/thank-you.njk',             'thank-you/index.html'],
  ['templates/thank-you-int.njk',         'thank-you-int/index.html'],
  ['templates/cm-thank-you.njk',          'cm-thank-you/index.html'],
  ['templates/404.njk',                   '404.html'],
];

pages.forEach(([templatePath, outputFile]) => {
  const outputPath = path.join(distDir, outputFile);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const html = nunjucks.render(templatePath);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`Built: ${outputFile}`);
});

console.log('Build complete.');
