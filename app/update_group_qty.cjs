const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/List.jsx', 'utf8');

const regex = /group\.total_qty \+= Number\(req\.required_quantity\) \|\| 0;/;
const replacement = `
      if (req.requirement_items && req.requirement_items.length > 0) {
        group.total_qty += req.requirement_items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
      } else {
        group.total_qty += Number(req.required_quantity) || 0;
      }
`;
if (content.match(regex)) {
  content = content.replace(regex, replacement.trim());
  fs.writeFileSync('src/pages/Requirements/List.jsx', content);
  console.log('Group total_qty logic updated.');
}
