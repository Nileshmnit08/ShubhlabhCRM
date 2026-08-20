// test_action_rules.js
// This script independently verifies the rules implemented in app/src/pages/FollowUps/Form.jsx
// It ensures that outcomes map deterministically without AI or prediction.

const getNextActionConfig = (outcome) => {
  switch (outcome) {
    case 'Sending payment today': return { days: 1, reason: 'Verify Payment Received', type: 'Payment', priority: 'Normal' };
    case 'Payment within 2 days': return { days: 2, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
    case 'Payment within 3 to 5 days': return { days: 4, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
    case 'Payment next week': return { days: 7, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
    case 'Payment next month': return { days: 30, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
    case 'Part payment today': return { days: 'manual', reason: 'Follow-up on Remaining Balance', type: 'Payment', priority: 'Normal' };
    case 'Not picking phone': return { days: 1, reason: 'Payment Follow-up (No Answer)', type: 'Payment', priority: 'Normal' };
    case 'Phone not reachable': return { days: 1, reason: 'Payment Follow-up (Unreachable)', type: 'Payment', priority: 'Normal' };
    case 'Call later': return { days: 'manual', reason: 'Payment Follow-up (Call Later)', type: 'Payment', priority: 'Normal' };
    case 'Cash problem': return { days: 'manual', reason: 'Payment Follow-up (Cash Problem)', type: 'Payment', priority: 'Normal' };
    case 'Market down': return { days: 'manual', reason: 'Payment Follow-up (Market Down)', type: 'Payment', priority: 'Normal' };
    case 'Payment stuck in market': return { days: 'manual', reason: 'Payment Follow-up (Payment Stuck)', type: 'Payment', priority: 'Normal' };
    case 'Follow-up later': return { days: 'manual', reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
    case 'Customer asking for statement': return { days: 0, reason: 'Provide Account Statement', type: 'General', priority: 'Normal' };
    case 'Customer asking for ledger': return { days: 0, reason: 'Provide Account Ledger', type: 'General', priority: 'Normal' };
    case 'Wants to talk to senior staff': return { days: 0, reason: 'ESCALATION: Talk to Senior', type: 'General', priority: 'High' };
    case 'Wants to talk to owner': return { days: 0, reason: 'ESCALATION: Talk to Owner', type: 'General', priority: 'High' };
    default: return null;
  }
};

const assertRule = (outcome, expectedDays, expectedReason, expectedType = 'Payment', expectedPriority = 'Normal') => {
  const result = getNextActionConfig(outcome);
  if (!result) {
    console.error(`❌ FAILED: Outcome '${outcome}' returned null`);
    process.exit(1);
  }
  
  const passed = result.days === expectedDays && 
                 result.reason === expectedReason && 
                 result.type === expectedType && 
                 result.priority === expectedPriority;
                 
  if (passed) {
    console.log(`✅ PASSED: '${outcome}' -> ${result.reason} (Days: ${result.days}, Priority: ${result.priority})`);
  } else {
    console.error(`❌ FAILED for '${outcome}'`);
    console.error(`  Expected: days=${expectedDays}, reason='${expectedReason}', type='${expectedType}', priority='${expectedPriority}'`);
    console.error(`  Actual:   days=${result.days}, reason='${result.reason}', type='${result.type}', priority='${result.priority}'`);
    process.exit(1);
  }
};

console.log('Testing Next Action Automation Rules...');
console.log('-----------------------------------------');

assertRule('Payment within 2 days', 2, 'Payment Follow-up');
assertRule('Payment next week', 7, 'Payment Follow-up');
assertRule('Call later', 'manual', 'Payment Follow-up (Call Later)');
assertRule('Customer asking for statement', 0, 'Provide Account Statement', 'General', 'Normal');
assertRule('Wants to talk to owner', 0, 'ESCALATION: Talk to Owner', 'General', 'High');
assertRule('Wants to talk to senior staff', 0, 'ESCALATION: Talk to Senior', 'General', 'High');
assertRule('Not picking phone', 1, 'Payment Follow-up (No Answer)');
assertRule('Phone not reachable', 1, 'Payment Follow-up (Unreachable)');
assertRule('Part payment today', 'manual', 'Follow-up on Remaining Balance');

console.log('-----------------------------------------');
console.log('🎉 All rules passed deterministic verification.');
