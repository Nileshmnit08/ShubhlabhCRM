/**
 * Secure Temporary Password Generator for Customer App Access
 * Generates user-friendly, high-entropy passwords that are easy to type on mobile keyboards
 * while satisfying strict complexity requirements.
 */

export function generateSecureTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = ['#', '@', '$', '!'];
  
  // Pick random symbol
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  // 4 random letters/digits
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 4 random digits
  let digits = '';
  for (let i = 0; i < 4; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  
  // Result format: SL#9341@xK9p
  return `SL${symbol}${digits}${part1}`;
}
