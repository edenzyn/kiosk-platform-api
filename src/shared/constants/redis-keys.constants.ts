/**
 * Central registry of Redis key builders, one per cached concern.
 *
 * Convention: `<domain>:<resource>:<qualifier>:<id>`, all lowercase,
 * colon-delimited. Add new key builders here rather than inlining raw
 * template strings elsewhere, so every key stays namespaced, greppable,
 * and collision-free across features that share the same Redis instance.
 */
export const RedisKeys = {
  /** Marks an auth session (jti) as revoked ahead of its access token's natural expiry. */
  authSessionRevoked: (sessionId: string): string =>
    `auth:session:revoked:${sessionId}`,
} as const;
