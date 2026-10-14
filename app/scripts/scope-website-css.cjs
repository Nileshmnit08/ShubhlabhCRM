const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('ShubhLabhWebsite/styles.css');
const destDir = path.resolve('app/src/pages/PublicWebsite');
const destPath = path.join(destDir, 'publicWebsite.css');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

let rawCss = fs.readFileSync(srcPath, 'utf8');

// Replace :root with .sl-public-website
rawCss = rawCss.replace(':root {', '.sl-public-website {');

// Replace body with .sl-public-website
rawCss = rawCss.replace(/body\s*\{/g, '.sl-public-website {');

// Replace html reset
rawCss = rawCss.replace(/html\s*\{[^}]*\}/g, '');

// Wrap the css inside .sl-public-website so all element and class rules are strictly namespaced
// We can use native CSS nesting:
// .sl-public-website {
//   ...css...
// }
// Note: Google font imports must be at the very top outside any block.
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');\n\n`;

// Let's create the scoped css
// Using CSS nesting supported by modern browsers and Vite:
const scopedCss = `${fontImport}
.sl-public-website {
${rawCss}
}
`;

fs.writeFileSync(destPath, scopedCss, 'utf8');
console.log('Successfully generated scoped publicWebsite.css at ' + destPath);
