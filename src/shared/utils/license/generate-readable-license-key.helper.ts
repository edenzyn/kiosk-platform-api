import * as crypto from "crypto";
import { HASH_ALPHABET_CODE } from "../core/crypto.helper";

export function generateReadableLicenseKey(): string {
  const generateSegment = (length: number) => {
    let result = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      const byte = randomBytes[i];
      if (byte !== undefined) {
        result += HASH_ALPHABET_CODE.charAt(byte % HASH_ALPHABET_CODE.length);
      }
    }
    return result;
  };
  return `LIC-${generateSegment(5)}-${generateSegment(5)}-${generateSegment(5)}`;
}
