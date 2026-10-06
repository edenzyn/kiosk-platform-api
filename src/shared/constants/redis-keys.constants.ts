/**
 * Central registry of Redis key builders, one per cached concern.
 *
 * Convention: `<domain>:<resource>:<qualifier>:<id>`, all lowercase,
 * colon-delimited. Add new key builders here rather than inlining raw
 * template strings elsewhere, so every key stays namespaced, greppable,
 * and collision-free across features that share the same Redis instance.
 */
export const RedisKeys = {
  /** Marks an auth session (jti) or a device staff session as revoked ahead of its access token's natural expiry. */
  authSessionRevoked: (sessionId: string): string =>
    `auth:session:revoked:${sessionId}`,

  /** Counts wrong device admin sign-in attempts for one identity on one device. */
  deviceAdminLoginAttempts: (deviceId: string, identity: string): string =>
    `device:admin:login-attempts:${deviceId}:${identity}`,

  /** Counts wrong staff sign-in attempts for one identity on one device. */
  deviceStaffLoginAttempts: (deviceId: string, identity: string): string =>
    `device:staff:login-attempts:${deviceId}:${identity}`,
} as const;
