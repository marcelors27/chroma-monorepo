export const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, "");

  if (digits.length !== 14) return false;
  if (/(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i += 1) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  const firstCheck = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[12], 10) !== firstCheck) return false;

  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i += 1) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  remainder = sum % 11;
  const secondCheck = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(digits[13], 10) === secondCheck;
};
