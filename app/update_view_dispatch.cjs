const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/View.jsx', 'utf8');

const regex1 = /\/\/\s*Intercept 'Dispatched' status[\s\S]*?return;\s*\}/;
content = content.replace(regex1, '// Intercept removed');

const regex2 = /setStatusNote\(''\);/;
content = content.replace(regex2, 'setStatusNote(\'\');\n      if (newStatus === \'Dispatched\') {\n         setShowDispatchModal(true);\n      }');

fs.writeFileSync('src/pages/Requirements/View.jsx', content);
console.log('Done');
