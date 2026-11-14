// Builds the web assets for the native app: copies ../bike-navigator.html to www/index.html
// and bundles Leaflet locally, so the app shell loads even without a network connection.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const www = path.join(root, 'www');
const leafletDist = path.join(root, 'node_modules', 'leaflet', 'dist');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'leaflet'), { recursive: true });

let html = fs.readFileSync(path.join(root, '..', 'bike-navigator.html'), 'utf8');

const cdn = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/[\d.]+\/leaflet\.min\.(css|js)/g;
const found = html.match(cdn) || [];
if (found.length !== 2) {
  throw new Error('Expected exactly 2 Leaflet CDN references in bike-navigator.html, found ' + found.length);
}
html = html.replace(cdn, (m, ext) => 'leaflet/leaflet.' + ext);
fs.writeFileSync(path.join(www, 'index.html'), html);

fs.copyFileSync(path.join(leafletDist, 'leaflet.js'), path.join(www, 'leaflet', 'leaflet.js'));
fs.copyFileSync(path.join(leafletDist, 'leaflet.css'), path.join(www, 'leaflet', 'leaflet.css'));
fs.cpSync(path.join(leafletDist, 'images'), path.join(www, 'leaflet', 'images'), { recursive: true });

console.log('www/ is ready:', fs.readdirSync(www).join(', '));
