const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/View.jsx', 'utf8');

// 1. Update the query
const queryRegex = /app_users:assigned_to \(\s*email\s*\)\s*\`\)/;
if (queryRegex.test(content)) {
  content = content.replace(queryRegex, 'app_users:assigned_to ( email ),\n          requirement_items (*)\n        `)');
  console.log('Query updated.');
} else {
  console.log('Query not found.');
}

// 2. Add calculations before the return statement
const calcTarget = /if \(!req\) return <div style=\{\{padding: '3rem', textAlign: 'center'\}\}>Not Found<\/div>;\s+return \(/s;

if (calcTarget.test(content)) {
  const calcString = `if (!req) return <div style={{padding: '3rem', textAlign: 'center'}}>Not Found</div>;

  const requirementItems = req.requirement_items || [];
  let totalWeightKg = 0;
  let canCalculateWeight = true;

  if (requirementItems.length > 0) {
    requirementItems.forEach(item => {
      let itemWeight = 0;
      // Extract weight from product_name (e.g., "8000 (50 kg)")
      const match = item.product_name?.match(/\\((\\d+(?:\\.\\d+)?)\\s*kg\\)/i);
      if (match && match[1]) {
        itemWeight = parseFloat(match[1]);
      }

      if (item.unit === 'Bags' && itemWeight > 0 && item.quantity) {
        totalWeightKg += item.quantity * itemWeight;
        item._parsedWeight = itemWeight; // Cache for render
      } else if (item.unit === 'MT' && item.quantity) {
        totalWeightKg += item.quantity * 1000;
      } else {
        canCalculateWeight = false;
      }
    });
  } else {
    canCalculateWeight = false;
  }

  const orderIdShort = req.demand_ref || (req.id ? req.id.substring(0, 8).toUpperCase() : 'N/A');
  const orderDate = req.created_at ? new Date(req.created_at).toLocaleDateString() : '';

  return (`

  content = content.replace(calcTarget, calcString);
  console.log('Calculations updated.');
} else {
  console.log('Calculations target not found.');
}

// 3. Replace the Demand Details card with Order Summary card
const uiTarget = /\{\/\* Requirement Details \*\/\}.*?(?=\s*\{\/\* Dispatch Summary Card \*\/\})/s;

if (uiTarget.test(content)) {
  const uiString = `{/* Order Summary */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--primary)'}}>
            ORDER SUMMARY
            <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>
              Order #{orderIdShort}
            </span>
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
              <span className="text-muted" style={{fontSize: '0.9rem'}}>Date:</span>
              <span style={{fontWeight: 600}}>{orderDate}</span>
            </div>

            <h4 style={{fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>
              PRODUCTS
            </h4>

            {requirementItems.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {requirementItems.map((item, idx) => (
                  <div key={item.id || idx} style={{paddingBottom: '0.5rem', borderBottom: idx < requirementItems.length - 1 ? '1px solid var(--border)' : 'none'}}>
                    <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{item.category || 'Product'}</div>
                    <div style={{fontSize: '1.05rem', marginTop: '2px'}}>{item.product_name}</div>
                    
                    {item.unit === 'Bags' && item._parsedWeight ? (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                        <span>{item._parsedWeight} kg × {item.quantity} Bags</span>
                        <strong style={{color: 'var(--text-primary)'}}>Total: {(item._parsedWeight * item.quantity).toLocaleString()} kg</strong>
                      </div>
                    ) : (
                      <div style={{marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                        {item.quantity} {item.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Fallback to legacy single product if no items exist
              <div style={{paddingBottom: '0.5rem'}}>
                <div style={{fontWeight: 600, fontSize: '0.9rem'}}>General</div>
                <div style={{fontSize: '1.05rem', marginTop: '2px'}}>{req.product_type || 'N/A'}</div>
                <div style={{marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                  {req.quantity} {req.unit}
                </div>
              </div>
            )}

            {canCalculateWeight && totalWeightKg > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)'}}>
                <span style={{fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)'}}>TOTAL ORDER WEIGHT</span>
                <span style={{fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)'}}>{totalWeightKg.toLocaleString()} kg</span>
              </div>
            )}

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Target Rate (Estimate)</label>
                <div>{req.expected_rate ? \`₹\${req.expected_rate}\` : 'Not specified'}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Expected Date</label>
                <div>{req.expected_date ? new Date(req.expected_date).toLocaleDateString() : 'ASAP'}</div>
              </div>
            </div>

            {req.notes && (
              <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px'}}>
                <label className="text-muted" style={{fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem'}}>Initial Notes</label>
                <p style={{margin: 0}}>{req.notes}</p>
              </div>
            )}
          </div>
        </div>`;

  content = content.replace(uiTarget, uiString);
  console.log('UI updated.');
} else {
  console.log('UI target not found.');
}

fs.writeFileSync('src/pages/Requirements/View.jsx', content);
