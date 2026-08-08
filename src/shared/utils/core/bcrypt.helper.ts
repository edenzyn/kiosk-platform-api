import bcrypt from "bcrypt";
import { env } from "../../../config/env";

export async function hashData(
  data: string,
  rounds: number = env.BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(data, rounds);
}

export async function compareHashedData(
  data: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(data, hash);
}
