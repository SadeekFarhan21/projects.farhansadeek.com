/**
 * Calculate fan price from base price (20% markup).
 * base_price_cents is what the creator earns.
 * fan_price_cents is what the fan pays.
 */
export function calculateFanPrice(basePriceCents: number): number {
  return Math.round(basePriceCents * 1.2);
}

/**
 * Calculate platform fee from a fan payment.
 */
export function calculatePlatformFee(fanPaidCents: number, basePriceCents: number): number {
  return fanPaidCents - basePriceCents;
}

/**
 * Format cents to a dollar string, e.g. 1200 → "$12.00"
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format cents to a compact dollar string, e.g. 1200 → "$12"
 */
export function formatCentsCompact(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
