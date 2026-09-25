const fs = require('fs');
let content = fs.readFileSync('src/pages/Requirements/View.jsx', 'utf8');

// The replacement for the Dispatch Summary Card
const dispatchRegex = /\{\/\* Dispatch Summary Card \*\/\}.*?(?=\s*\{\/\* Update Status Panel \*\/\})/s;

const newDispatchSummary = `{/* Dispatch Summary Card */}
        {(dispatchSummary || req.status === 'Won' || req.status === 'Dispatched') && (
          <div className="glass-panel" style={{padding: '1.5rem', border: '1px solid var(--border)'}}>
            <h3 style={{marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              Dispatch Summary
              {dispatchSummary && dispatchSummary.total_dispatched_quantity > 0 && (
                <span className={\`badge \${dispatchSummary.dispatch_progress === 'Fully Dispatched' ? 'badge-success' : dispatchSummary.dispatch_progress === 'Partially Dispatched' ? 'badge-warning' : 'badge-active'}\`}>
                  {dispatchSummary.dispatch_progress}
                </span>
              )}
            </h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {!dispatchSummary || dispatchSummary.total_dispatched_quantity === 0 ? (
                <div style={{padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)'}}>
                  No dispatch recorded
                </div>
              ) : (
                <>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label className="text-muted" style={{fontSize: '0.85rem'}}>Required</label>
                      <div style={{fontWeight: 600, fontSize: '1.1rem'}}>
                        {requirementItems.length > 0 ? requirementItems.reduce((acc, i) => acc + (i.quantity || 0), 0) : req.quantity} {requirementItems.length > 0 ? requirementItems[0].unit : req.unit}
                      </div>
                    </div>
                    <div>
                      <label className="text-muted" style={{fontSize: '0.85rem'}}>Dispatched</label>
                      <div style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--success)'}}>
                        {dispatchSummary.total_dispatched_quantity} {requirementItems.length > 0 ? requirementItems[0].unit : req.unit}
                      </div>
                    </div>
                    <div>
                      <label className="text-muted" style={{fontSize: '0.85rem'}}>Pending</label>
                      <div style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--warning)'}}>
                        {Math.max(0, (requirementItems.length > 0 ? requirementItems.reduce((acc, i) => acc + (i.quantity || 0), 0) : req.quantity) - dispatchSummary.total_dispatched_quantity)} {requirementItems.length > 0 ? requirementItems[0].unit : req.unit}
                      </div>
                    </div>
                  </div>

                  {dispatchSummary.latest_dispatch_date && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem'}}>
                      <div>
                        <label className="text-muted" style={{fontSize: '0.85rem'}}>Latest Dispatch Date</label>
                        <div>{new Date(dispatchSummary.latest_dispatch_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <label className="text-muted" style={{fontSize: '0.85rem'}}>Latest Vehicle</label>
                        <div>{dispatchSummary.latest_truck_number || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                 <button className="btn btn-primary" onClick={() => setShowDispatchModal(true)} style={{flex: 1, justifyContent: 'center'}}>
                   <Plus size={16} /> Add Dispatch
                 </button>
                 <Link to={\`/dispatches/list?requirement_id=\${req.id}\`} className="btn btn-secondary" style={{flex: 1, justifyContent: 'center'}}>
                   View All Dispatches
                 </Link>
              </div>
            </div>
          </div>
        )}`;

if (content.match(dispatchRegex)) {
  content = content.replace(dispatchRegex, newDispatchSummary);
  fs.writeFileSync('src/pages/Requirements/View.jsx', content);
  console.log('View.jsx Dispatch Summary updated.');
} else {
  console.log('Dispatch Summary regex not found.');
}
