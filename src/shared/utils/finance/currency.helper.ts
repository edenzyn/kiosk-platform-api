export const MAX_CURRENCY_FRACTION_DIGITS = 2;

const fractionDigitsCache = new Map<string, number>();

export function getCurrencyFractionDigits(currencyCode: string): number {
  const cached = fractionDigitsCache.get(currencyCode);
  if (cached !== undefined) return cached;

  let digits = MAX_CURRENCY_FRACTION_DIGITS;
  try {
    digits =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits ??
      MAX_CURRENCY_FRACTION_DIGITS;
  } catch {
    digits = MAX_CURRENCY_FRACTION_DIGITS;
  }

  const capped = Math.min(digits, MAX_CURRENCY_FRACTION_DIGITS);
  fractionDigitsCache.set(currencyCode, capped);
  return capped;
}

export function toMinorUnits(amount: string, currencyCode: string): number {
  return Math.round(
    Number(amount) * 10 ** getCurrencyFractionDigits(currencyCode),
  );
}

export function fromMinorUnits(
  minorUnits: number,
  currencyCode: string,
): string {
  const digits = getCurrencyFractionDigits(currencyCode);
  return (minorUnits / 10 ** digits).toFixed(digits);
}
