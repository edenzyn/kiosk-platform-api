export interface ExchangeRateTable {
  base: string;
  rates: Record<string, number>;
}

export function convertCurrencyAmount(params: {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRates: ExchangeRateTable;
}): number | null {
  const { amount, sourceCurrency, targetCurrency, exchangeRates } = params;

  if (sourceCurrency === targetCurrency) return amount;

  const rateFor = (currency: string): number | null =>
    currency === exchangeRates.base
      ? 1
      : (exchangeRates.rates[currency] ?? null);

  const sourceRate = rateFor(sourceCurrency);
  const targetRate = rateFor(targetCurrency);
  if (sourceRate === null || targetRate === null) return null;

  const amountInBase = amount / sourceRate;
  return amountInBase * targetRate;
}
