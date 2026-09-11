import fs from 'fs';
import path from 'path';

const distPath = path.resolve(process.cwd(), 'dist/index.html');
const standaloneDistPath = path.resolve(process.cwd(), 'dist/standalone.html');
const standaloneRootPath = path.resolve(process.cwd(), 'standalone.html');
const standalonePublicPath = path.resolve(process.cwd(), 'public/standalone.html');
const heraldPath = path.resolve(process.cwd(), 'herald-index.html');

if (!fs.existsSync(distPath)) {
  console.error('dist/index.html does not exist!');
  process.exit(1);
}

let html = fs.readFileSync(distPath, 'utf8');

// Find all script tags in dist/index.html
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log(`Found ${scriptMatches.length} script tags in dist/index.html`);

// Identify the main application bundle script
let bundleScript = '';
for (const script of scriptMatches) {
  if (script.length > 500 || script.includes('createRoot') || script.includes('mountApp')) {
    bundleScript = script;
    break;
  }
}

if (!bundleScript && scriptMatches.length > 0) {
  bundleScript = scriptMatches[scriptMatches.length - 1];
}

if (!bundleScript) {
  console.error('Could not find bundle script in dist/index.html');
  process.exit(1);
}

// Extract style tags
const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) || [];
const combinedStyles = styleMatches.join('\n');

const finalHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=600, height=600, initial-scale=1.0, user-scalable=no" />
  <title>MRBD Path Tracker</title>
  <meta name="description" content="Meta Ray-Ban Display Flash Element Tower Defense game with 600x600 fixed viewport, D-pad flow, and temple swipe controls." />
  <meta property="og:title" content="MRBD Path Tracker" />
  <meta property="og:description" content="Meta Ray-Ban Display Flash Element Tower Defense game with 600x600 fixed viewport, D-pad flow, and temple swipe controls." />
  <meta property="og:type" content="website" />
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#000000" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="mrbd-app" content="true" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 600px;
      height: 600px;
      background-color: #000000 !important;
      color: #ffffff;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    #root {
      width: 600px;
      height: 600px;
      overflow: hidden;
      position: relative;
      background-color: #000000 !important;
    }
  </style>
  ${combinedStyles}
</head>
<body class="bg-black text-white antialiased overflow-hidden select-none" style="background-color:#000000; margin:0; padding:0; width:600px; height:600px; overflow:hidden;">
  <!-- Clean React Root Container -->
  <div id="root"></div>

  <!-- Inlined App Bundle placed AFTER #root to guarantee DOM is ready -->
  ${bundleScript}
</body>
</html>`;

fs.writeFileSync(distPath, finalHtml);
fs.writeFileSync(standaloneDistPath, finalHtml);
fs.writeFileSync(standaloneRootPath, finalHtml);
fs.writeFileSync(standalonePublicPath, finalHtml);
fs.writeFileSync(heraldPath, finalHtml);

console.log(
  `Successfully generated standalone bundles (${Math.round(finalHtml.length / 1024)} KB) for:`
);
console.log(`- ${distPath}`);
console.log(`- ${standaloneDistPath}`);
console.log(`- ${standaloneRootPath}`);
console.log(`- ${standalonePublicPath}`);
console.log(`- ${heraldPath}`);
