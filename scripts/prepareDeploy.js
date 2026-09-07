const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT_DIR, 'src', 'site');
const SOURCE_DATA_PATH = path.join(ROOT_DIR, 'data', 'packedEvents.json');
const TARGET_DATA_DIR = path.join(SITE_DIR, 'data');
const TARGET_DATA_PATH = path.join(TARGET_DATA_DIR, 'packedEvents.json');
const GLOBALS_SOURCE_PATH = path.join(SITE_DIR, 'globals.js');
const APP_SOURCE_PATH = path.join(SITE_DIR, 'app.js');
const MINIFIED_APP_PATH = path.join(SITE_DIR, 'app.min.js');
const STYLE_SOURCE_PATH = path.join(SITE_DIR, 'style.css');
const MINIFIED_STYLE_PATH = path.join(SITE_DIR, 'style.min.css');
const HEADERS_PATH = path.join(SITE_DIR, '_headers');
const VERSION_PATH = path.join(SITE_DIR, 'version.js');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');

if (!fs.existsSync(SOURCE_DATA_PATH)) {
  console.error('Missing packed events file:', SOURCE_DATA_PATH);
  process.exit(2);
}

fs.mkdirSync(TARGET_DATA_DIR, { recursive: true });
const packedEvents = JSON.parse(fs.readFileSync(SOURCE_DATA_PATH, 'utf8'));
fs.writeFileSync(TARGET_DATA_PATH, JSON.stringify(packedEvents), 'utf8');
const { version } = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
const appBundle = [fs.readFileSync(GLOBALS_SOURCE_PATH, 'utf8'), `window.APP_VERSION = ${JSON.stringify(version)};`, fs.readFileSync(APP_SOURCE_PATH, 'utf8')].join('\n');
const minifiedApp = esbuild.transformSync(appBundle, {
  minify: true,
  target: 'es2020',
}).code;
fs.writeFileSync(MINIFIED_APP_PATH, minifiedApp, 'utf8');
const minifiedStyle = esbuild.transformSync(fs.readFileSync(STYLE_SOURCE_PATH, 'utf8'), {
  loader: 'css',
  minify: true,
}).code;
fs.writeFileSync(MINIFIED_STYLE_PATH, minifiedStyle, 'utf8');
fs.writeFileSync(VERSION_PATH, `window.APP_VERSION = ${JSON.stringify(version)};\n`, 'utf8');

fs.writeFileSync(HEADERS_PATH, ['/', '  Cache-Control: no-store, no-cache, must-revalidate, max-age=0', '  CDN-Cache-Control: no-store', '', '/index.html', '  Cache-Control: no-store, no-cache, must-revalidate, max-age=0', '  CDN-Cache-Control: no-store', '', '/app.js', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/app.min.js', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/style.css', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/style.min.css', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/icons.css', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/data/packedEvents.json', '  Cache-Control: public, max-age=300, stale-while-revalidate=86400', '', '/*.svg', '  Cache-Control: public, max-age=86400', '', '/sitemap.xml', '  Content-Type: application/xml; charset=UTF-8', ''].join('\n'), 'utf8');
fs.appendFileSync(HEADERS_PATH, ['/version.js', '  Cache-Control: no-store, no-cache, must-revalidate, max-age=0', '  CDN-Cache-Control: no-store', ''].join('\n'), 'utf8');

console.log('Copied', path.relative(ROOT_DIR, SOURCE_DATA_PATH), 'to', path.relative(ROOT_DIR, TARGET_DATA_PATH));
console.log('Wrote', path.relative(ROOT_DIR, VERSION_PATH));
console.log('Wrote', path.relative(ROOT_DIR, HEADERS_PATH));
