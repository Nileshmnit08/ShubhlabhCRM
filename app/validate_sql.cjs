const fs = require('fs');
const path = require('path');

let allValid = true;

for (let i = 1; i <= 20; i++) {
    const file = path.join(__dirname, '..', `30_sprint_11_2_data_onboarding_part${i}.sql`);
    if (!fs.existsSync(file)) {
        console.error(`Missing ${file}`);
        allValid = false;
        continue;
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check start and end
    if (!content.trim().startsWith('DO $$')) {
        console.error(`Part ${i}: Does not start with DO $$`);
        allValid = false;
    }
    if (!content.trim().endsWith('END $$;')) {
        console.error(`Part ${i}: Does not end with END $$;`);
        allValid = false;
    }
    
    // Check balanced IF/END IF
    // A bit naive, but it works for this generated format.
    const ifMatches = content.match(/^\s*IF\b.*?\bTHEN\b/gm) || [];
    const endIfMatches = content.match(/^\s*END IF;/gm) || [];
    
    if (ifMatches.length !== endIfMatches.length) {
        console.error(`Part ${i}: Mismatched IF/END IF blocks (${ifMatches.length} IFs, ${endIfMatches.length} END IFs)`);
        allValid = false;
    }
}

if (allValid) {
    console.log('All 20 parts passed basic validation (start/end blocks and balanced IFs).');
} else {
    console.error('Validation failed.');
}
