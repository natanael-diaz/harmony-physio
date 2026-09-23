/**
 * NHS number modulus-11 check digit validation.
 *
 * NHS numbers are exactly 10 digits. The check digit (position 9) is derived
 * from the first 9 digits using a weighted sum modulo 11. A result of 10 is
 * invalid; a result of 11 maps to check digit 0.
 *
 * Reference: NHS Data Dictionary — NHS Number
 * https://www.datadictionary.nhs.uk/attributes/nhs_number.html
 */
export function validateNhsNumber(raw: string): boolean {
  const digits = raw.replace(/\s/g, "");
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  if (checkDigit === 11) return Number(digits[9]) === 0;
  if (checkDigit === 10) return false;
  return Number(digits[9]) === checkDigit;
}
