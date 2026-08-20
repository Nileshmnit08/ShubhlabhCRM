const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', '30_sprint_11_2_data_onboarding.sql');
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

const maxLinesPerFile = 2500;
let currentPart = 1;
let currentLines = [];

const header = `DO $$
DECLARE
  p_id UUID;
  t_id UUID;
  r_id UUID;
BEGIN`;

const footer = `END $$;`;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '-- MICRO-SPRINT 11.2 REAL TALLY DATA ONBOARDING' || line === 'DO $$' || line.startsWith('DECLARE') || line === 'p_id UUID;' || line === 't_id UUID;' || line === 'r_id UUID;' || line === 'BEGIN' || line === 'END $$;') {
        continue; 
    }
    
    // Check if we should split before this line
    if (currentLines.length >= maxLinesPerFile && line.startsWith('SELECT id INTO p_id FROM crm_parties')) {
        const outName = path.join(__dirname, '..', `30_sprint_11_2_data_onboarding_part${currentPart}.sql`);
        const finalContent = [header, ...currentLines, footer].join('\n');
        fs.writeFileSync(outName, finalContent, 'utf-8');
        console.log(`Created ${outName} (${currentLines.length} payload lines)`);
        currentPart++;
        currentLines = [];
    }
    
    currentLines.push(lines[i]);
}

if (currentLines.length > 0) {
    // Remove any trailing empty lines just in case
    while (currentLines.length > 0 && currentLines[currentLines.length - 1].trim() === '') {
        currentLines.pop();
    }
    const outName = path.join(__dirname, '..', `30_sprint_11_2_data_onboarding_part${currentPart}.sql`);
    const finalContent = [header, ...currentLines, footer].join('\n');
    fs.writeFileSync(outName, finalContent, 'utf-8');
    console.log(`Created ${outName} (${currentLines.length} payload lines)`);
}
