import crypto, { createHash, randomInt } from "node:crypto";

export const HASH_ALPHABET_CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const ALGORITHM = "aes-256-gcm";

// ========================================
// ? HASHING
// ========================================
export function hashSha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ========================================
// ? RANDOM CODE GENERATION
// ========================================
export function createRandomReadableCode(length: number): string {
  return Array.from(
    { length },
    () => HASH_ALPHABET_CODE[randomInt(HASH_ALPHABET_CODE.length)],
  ).join("");
}

// ========================================
// ? ENCRYPTION
// ========================================
export function encryptData(text: string, base64Key: string): string {
  const key = Buffer.from(base64Key, "base64");
  const iv = crypto.randomBytes(12); // standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

// ========================================
// ? DECRYPTION
// ========================================
export function decryptData(encryptedText: string, base64Key: string): string {
  const key = Buffer.from(base64Key, "base64");
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted license key format");
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;
  if (!ivHex || !authTagHex || !encryptedDataHex) {
    throw new Error("Invalid encrypted license key components");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
