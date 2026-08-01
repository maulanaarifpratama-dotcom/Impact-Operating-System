// src/lib/carbon/formatters.ts

/**
 * Formats carbon mass values (in kg or tons) into human-readable text.
 */
export function formatCarbonMass(
  valueKg: number,
  options?: { displayUnit?: 'kg' | 'ton' | 'auto'; precision?: number }
): string {
  const precision = options?.precision ?? 2;
  const unit = options?.displayUnit ?? (Math.abs(valueKg) >= 1000 ? 'ton' : 'kg');

  if (unit === 'ton') {
    const tons = valueKg / 1000;
    return `${tons.toLocaleString('id-ID', { maximumFractionDigits: precision })} tons CO₂e`;
  }

  return `${valueKg.toLocaleString('id-ID', { maximumFractionDigits: precision })} kg CO₂e`;
}

/**
 * Formats monetary currency amounts into IDR or USD strings.
 */
export function formatCurrency(
  amount: number,
  currency: 'IDR' | 'USD' = 'IDR'
): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `Rp ${amount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

/**
 * Formats tree count into readable text.
 */
export function formatTreesEquivalent(treeCount: number): string {
  return `${treeCount.toLocaleString('id-ID', { maximumFractionDigits: 1 })} pohon`;
}
