const testCases = [
  {
    desc: 'Requirement with quantity 1 (Default)',
    r: { id: 1, party_id: 101, created_at: '2026-10-05', product_type: 'General Requirement', quantity: 1, unit: 'Bags', status: 'New', notes: 'Urgent' },
    ri: { id: 11, requirement_id: 1, product_name: 'Diamond (50 kg)', quantity: 1, unit: 'Bags' }
  },
  {
    desc: 'Requirement with quantity 10/20/50',
    r: { id: 2, party_id: 102, created_at: '2026-10-05', product_type: 'General Requirement', quantity: 1, unit: 'Bags', status: 'New' },
    ri: { id: 12, requirement_id: 2, product_name: 'Diamond (50 kg)', quantity: 20, unit: 'Bags' }
  },
  {
    desc: 'Different weights',
    r: { id: 3, party_id: 103, created_at: '2026-10-05', product_type: 'General Requirement', quantity: 1, unit: 'Bags', status: 'New' },
    ri: { id: 13, requirement_id: 3, product_name: 'Gori (40 kg)', quantity: 50, unit: 'Bags' }
  },
  {
    desc: 'Legacy requirement (No items)',
    r: { id: 4, party_id: 104, created_at: '2026-10-05', product_type: 'Premium Mix', quantity: 100, unit: 'MT', status: 'New' },
    ri: null
  }
];

console.log("=== VALIDATION LOGIC RUN ===");

testCases.forEach(tc => {
  const r = tc.r;
  const ri = tc.ri;
  
  // SQL Logic translation to JS
  const title = (ri && ri.product_name) ? ri.product_name : r.product_type;
  
  const qty = (ri && ri.quantity !== null && ri.quantity !== undefined) ? ri.quantity : r.quantity;
  const unit = (ri && ri.unit) ? ri.unit : r.unit;
  
  let totalStr = '';
  if (ri && ri.product_name) {
    const match = ri.product_name.match(/\((\d+)\s*kg\)/);
    if (match) {
      const weight = parseInt(match[1], 10);
      totalStr = ` | Total: ${qty * weight} kg`;
    }
  }
  
  const notesStr = (r.notes) ? ` | Notes: ${r.notes}` : '';
  const description = `Qty: ${qty} ${unit}${totalStr}${notesStr}`;
  
  console.log(`\nTest Case: ${tc.desc}`);
  console.log(`Input 'requirements':`, r);
  console.log(`Input 'requirement_items':`, ri);
  console.log(`--- Resulting Timeline Event ---`);
  console.log(`Title: ${title}`);
  console.log(`Description: ${description}`);
  
  // Validation Assertions
  if (tc.desc.includes('quantity 1 (Default)')) {
    if (qty !== 1 || !description.includes('Total: 50 kg')) throw new Error("Validation Failed for Qty 1");
  }
  if (tc.desc.includes('quantity 10/20/50')) {
    if (qty !== 20 || !description.includes('Total: 1000 kg')) throw new Error("Validation Failed for Qty 20");
    if (qty === 1) throw new Error("Default 1 appeared incorrectly.");
  }
  if (tc.desc.includes('Different weights')) {
    if (qty !== 50 || !description.includes('Total: 2000 kg')) throw new Error("Validation Failed for Different Weights");
  }
});
console.log("\nAll Validations Passed Successfully.");
