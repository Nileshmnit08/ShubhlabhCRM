/**
 * Shubhlabh CRM Normalizer
 * Used exclusively for identity resolution matching.
 * Never modifies the raw source payload.
 */

export function normalizeIdentity(str) {
  if (!str) return '';

  let normalized = str.toUpperCase();

  // Strip Tally specific tags
  normalized = normalized.replace(/\(OLD\)/g, '');

  // Common abbreviation expansion
  const abbreviations = {
    '\\bCO\\b': 'COMPANY',
    '\\bIND\\b': 'INDUSTRIES',
    '\\bENT\\b': 'ENTERPRISE',
    '\\bENTERPRESE\\b': 'ENTERPRISE', // Spelling variation commonly seen
    '\\bTREDING\\b': 'TRADING',
    '\\bINDECIRES\\b': 'INDUSTRIES',
    '\\bINDESTRES\\b': 'INDUSTRIES'
  };

  for (const [abbr, expansion] of Object.entries(abbreviations)) {
    const regex = new RegExp(abbr, 'g');
    normalized = normalized.replace(regex, expansion);
  }

  // Remove punctuation, slashes, hyphens, and keep only alphanumerics
  normalized = normalized.replace(/[^A-Z0-9]/g, '');

  return normalized.trim();
}
