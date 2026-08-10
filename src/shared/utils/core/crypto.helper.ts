import { createHash, randomInt } from "node:crypto";

const ALPHABET_CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function hashSha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function createRandomReadableCode(length: number): string {
  return Array.from(
    { length },
    () => ALPHABET_CODE[randomInt(ALPHABET_CODE.length)],
  ).join("");
}
