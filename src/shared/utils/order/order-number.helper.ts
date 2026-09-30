// Crockford base32: no I, L, O or U, so codes are easy to read out and type.
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ORDER_NUMBER_PREFIX = "ORD";
const ORDER_CODE_MIN_LENGTH = 6;
const TOKEN_NUMBER_MIN_DIGITS = 3;

const toCrockfordBase32 = (value: bigint): string => {
  let remaining = value;
  let encoded = "";
  do {
    encoded = CROCKFORD_BASE32[Number(remaining % 32n)] + encoded;
    remaining /= 32n;
  } while (remaining > 0n);

  return encoded;
};

/**
 * Builds a globally unique order number from the order-number sequence,
 * e.g. ORD-260930-00A7K2 (calendar date + base32 sequence value).
 */
export const buildOrderNumber = (
  sequenceValue: bigint,
  orderDateLabel: string,
): string =>
  `${ORDER_NUMBER_PREFIX}-${orderDateLabel}-${toCrockfordBase32(
    sequenceValue,
  ).padStart(ORDER_CODE_MIN_LENGTH, "0")}`;

/** Daily pickup token for display, e.g. 7 → "007", 1204 → "1204". */
export const formatTokenNumber = (tokenNumber: number): string =>
  String(tokenNumber).padStart(TOKEN_NUMBER_MIN_DIGITS, "0");
