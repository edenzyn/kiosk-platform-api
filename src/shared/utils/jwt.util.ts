import jwt from "jsonwebtoken";

export function generateToken(
  payload: string | Buffer | object,
  secret: jwt.Secret,
  options?: jwt.SignOptions,
): string {
  return jwt.sign(payload, secret, options);
}

export function verifyToken<T = jwt.JwtPayload | string>(
  token: string,
  secret: jwt.Secret,
  options?: jwt.VerifyOptions,
): T {
  return jwt.verify(token, secret, options) as T;
}

export function decodeToken<T = jwt.JwtPayload | null | string>(
  token: string,
  options?: jwt.DecodeOptions,
): T {
  return jwt.decode(token, options) as T;
}
