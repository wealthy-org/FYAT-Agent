const DECIMAL_SEPARATOR = ".";

/** Pola angka desimal positif dengan maksimum `decimals` digit pecahan. */
export function amountPattern(decimals: number): RegExp {
  return new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
}

/**
 * "2.5" (6 desimal) → 2_500_000n
 * Input HARUS sudah lolos `amountPattern`; selain itu akan melempar error.
 */
export function parseUnits(value: string, decimals: number): bigint {
  if (!amountPattern(decimals).test(value)) {
    throw new RangeError(`Invalid amount: "${value}"`);
  }

  const [whole = "0", fraction = ""] = value.split(DECIMAL_SEPARATOR);
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/** 2_500_000n (6 desimal) → "2.5". Dipakai oleh Flow dan Code Preview. */
export function formatUnits(units: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = units / base;
  const fraction = (units % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}${DECIMAL_SEPARATOR}${fraction}` : whole.toString();
}