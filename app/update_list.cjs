const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/List.jsx', 'utf8');

// 1. Update the query
content = content.replace(
  /\.from\('v_board_requirements'\)\s*\.select\('\*'\)/,
  `.from('v_board_requirements')\n        .select('*, requirement_items(*)')`
);

// 2. Update grouping logic for products
// find: group.products.add(req.product_type);
const groupLogic = `      if (req.requirement_items && req.requirement_items.length > 0) {
        req.requirement_items.forEach(item => group.products.add(item.product_name));
      } else if (req.product_type) {
        group.products.add(req.product_type);
      }`;
content = content.replace(/group\.products\.add\(req\.product_type\);/, groupLogic);

// 3. Update the table column in expanded view
// find: >{req.product_type}</Link></td>
const replaceLink = `>{req.requirement_items?.length > 0 ? req.requirement_items.map(i => i.product_name).join(', ') : req.product_type}</Link></td>`;
content = content.replace(/>\{req\.product_type\}<\/Link><\/td>/g, replaceLink);

// 4. Update the card title in flat view
// find: <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)'}}>{req.product_type}</h3>
const replaceCardTitle = `<h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)'}}>{req.requirement_items?.length > 0 ? req.requirement_items.map(i => i.product_name).join(', ') : req.product_type}</h3>`;
content = content.replace(/<h3 style=\{\{margin: 0, fontSize: '1\.1rem', color: 'var\(--text-primary\)'\}\}>\{req\.product_type\}<\/h3>/g, replaceCardTitle);

fs.writeFileSync('src/pages/Requirements/List.jsx', content);
console.log('List.jsx updated successfully');
