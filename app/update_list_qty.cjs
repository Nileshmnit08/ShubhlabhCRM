const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/List.jsx', 'utf8');

// The replacement for the flat view requirement item
const flatViewQtyRegex = /<span style=\{\{fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var\(--text-primary\)'\}\}>\{req\.required_quantity\}<\/span>/;
const newFlatViewQty = `<span style={{fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)'}}>{req.requirement_items?.length > 0 ? req.requirement_items.reduce((acc, i) => acc + (i.quantity || 0), 0) : req.required_quantity}</span>`;
if (content.match(flatViewQtyRegex)) {
  content = content.replace(flatViewQtyRegex, newFlatViewQty);
  console.log('Flat view quantity updated.');
}

const flatViewUnitRegex = /<span className="text-muted" style=\{\{fontSize: '0\.9rem'\}\}>\{req\.unit\} \(Est\.\)<\/span>/;
const newFlatViewUnit = `<span className="text-muted" style={{fontSize: '0.9rem'}}>{req.requirement_items?.length > 0 ? req.requirement_items[0].unit : req.unit}</span>`;
if (content.match(flatViewUnitRegex)) {
  content = content.replace(flatViewUnitRegex, newFlatViewUnit);
  console.log('Flat view unit updated.');
}

const isPartiallyDispatchedRegex = /const isPartiallyDispatched = req\.dispatch_progress === 'Partially Dispatched' && req\.total_dispatched_quantity > 0;/g;
const newIsPartiallyDispatched = `
            const actualTotalRequired = req.requirement_items?.length > 0 ? req.requirement_items.reduce((acc, i) => acc + (i.quantity || 0), 0) : req.required_quantity;
            const actualPending = Math.max(0, actualTotalRequired - (req.total_dispatched_quantity || 0));
            const isPartiallyDispatched = (req.total_dispatched_quantity > 0 && actualPending > 0);
`;
if (content.match(isPartiallyDispatchedRegex)) {
  content = content.replace(isPartiallyDispatchedRegex, newIsPartiallyDispatched.trim());
  console.log('isPartiallyDispatched logic updated.');
}

const flatViewPendingRegex = /<strong style=\{\{color: '#B45309'\}\}>Pending: \{req\.pending_quantity\}<\/strong>/;
const newFlatViewPending = `<strong style={{color: '#B45309'}}>Pending: {actualPending}</strong>`;
if (content.match(flatViewPendingRegex)) {
  content = content.replace(flatViewPendingRegex, newFlatViewPending);
  console.log('Flat view pending quantity updated.');
}

// Fix desktop view qty column
const tableQtyRegex = /<td style=\{\{padding: '12px', fontWeight: 500\}\}>\{req\.required_quantity\} \{req\.unit\}<\/td>/;
const newTableQty = `<td style={{padding: '12px', fontWeight: 500}}>{req.requirement_items?.length > 0 ? req.requirement_items.reduce((acc, i) => acc + (i.quantity || 0), 0) : req.required_quantity} {req.requirement_items?.length > 0 ? req.requirement_items[0].unit : req.unit}</td>`;
if (content.match(tableQtyRegex)) {
  content = content.replace(tableQtyRegex, newTableQty);
  console.log('Desktop view qty updated.');
}

fs.writeFileSync('src/pages/Requirements/List.jsx', content);
