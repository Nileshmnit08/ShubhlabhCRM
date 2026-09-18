const { execSync } = require('child_process');

// Current time in ms
const now = Date.now();

// 1. Incoming answered call (type 1)
const time1 = now - 300000; // 5 mins ago
execSync(`adb shell content insert --uri content://call_log/calls --bind number:s:+919876543210 --bind type:i:1 --bind date:l:${time1} --bind duration:i:120 --bind new:i:1`);
console.log('Inserted incoming call');

// 2. Outgoing answered call (type 2)
const time2 = now - 200000; // 3 mins ago
execSync(`adb shell content insert --uri content://call_log/calls --bind number:s:+919876543210 --bind type:i:2 --bind date:l:${time2} --bind duration:i:45 --bind new:i:1`);
console.log('Inserted outgoing call');

// 3. Missed incoming call (type 3)
const time3 = now - 100000; // 1 min ago
execSync(`adb shell content insert --uri content://call_log/calls --bind number:s:+919876543211 --bind type:i:3 --bind date:l:${time3} --bind duration:i:0 --bind new:i:1`);
console.log('Inserted missed call');
