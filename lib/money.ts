/**
 * Türk Lirası biçimleyici. Sayıları daima iki ondalık hane ile TRY para biriminde biçimler.
 */
export function formatTL(value: number): string {
  return value.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}