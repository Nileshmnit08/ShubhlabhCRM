#!/usr/bin/env node
// LH-PERSISTENCE-REPAIR-02: guard against installing an APK whose JS bundle is stale.
//
// Root cause of the Redmi data loss: an APK built right after adding the native storage
// dependency carried the previous (memory-only) JS bundle. It installed and ran without any
// error, but never touched device storage. Run this before every `adb install`:
//
//   node scripts/verify-apk-bundle.cjs android/app/build/outputs/apk/release/app-release.apk
//
// It reads assets/index.android.bundle straight out of the APK (zip) and fails unless every
// required marker is present. No dependencies; Node built-ins only.

const fs = require('fs');
const zlib = require('zlib');

const REQUIRED_MARKERS = [
  '@labourhisaab/v1/work_entries', // device storage key (LocalPersistence)
  '[LH-STORAGE] loaded entries=',  // load diagnostics (LabourHisaabContext)
  'Storage did not confirm the write.', // write read-back check (LocalPersistence)
  'Delete: not permitted for this account.', // Operator role / RLS delete check (LH-ACCESS-MODEL-02)
  'labourersDownloaded=', // shared download sync log (LH-DAILY-REGISTER-APPROVAL-01)
  '[LH-SAVE] entry=', // database-first save confirmation (LH-REALTIME-WORK-SAVE-03)
];

// Strings that must NOT be in the phone app (approval is a CRM-only action).
const FORBIDDEN_MARKERS = [
  'lh_decide_daily_register',
];

function readZipEntry(buf, wanted) {
  // End of central directory record: signature 0x06054b50, within the last 64 KiB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip/APK file.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Corrupt central directory.');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error(`Unsupported compression method ${method}.`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function main() {
  const apk = process.argv[2];
  if (!apk || !fs.existsSync(apk)) {
    console.error('Usage: node scripts/verify-apk-bundle.cjs <path-to.apk>');
    process.exit(2);
  }
  const bundle = readZipEntry(fs.readFileSync(apk), 'assets/index.android.bundle');
  if (!bundle) {
    console.error('FAIL: assets/index.android.bundle not found in the APK.');
    process.exit(1);
  }
  const missing = REQUIRED_MARKERS.filter(m => bundle.indexOf(Buffer.from(m, 'utf8')) === -1);
  const forbidden = FORBIDDEN_MARKERS.filter(m => bundle.indexOf(Buffer.from(m, 'utf8')) !== -1);
  if (forbidden.length) {
    console.error(`FAIL: bundle contains CRM-only code: ${forbidden.join(', ')}`);
    process.exit(1);
  }
  const stat = fs.statSync(apk);
  console.log(`APK: ${apk} (${(stat.size / 1048576).toFixed(1)} MB, built ${stat.mtime.toISOString()})`);
  console.log(`Bundle: ${(bundle.length / 1048576).toFixed(2)} MB`);
  if (missing.length) {
    console.error(`FAIL: bundle is missing ${missing.length} required marker(s):\n  - ${missing.join('\n  - ')}`);
    console.error('The APK does not contain the current persistence code. Rebuild (clean) before installing.');
    process.exit(1);
  }
  console.log(`OK: all ${REQUIRED_MARKERS.length} persistence markers present.`);
}

main();
