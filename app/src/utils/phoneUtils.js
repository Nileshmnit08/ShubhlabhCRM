export const normalizeMobile = (val) => {
  if (!val) return '';
  let digits = val.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  return digits;
};

export const validateMobile = (val) => {
  return /^[6-9]\d{9}$/.test(val);
};
