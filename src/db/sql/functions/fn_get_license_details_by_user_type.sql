CREATE OR REPLACE FUNCTION fn_get_license_details_by_user_type(
  p_license_id UUID,
  p_viewer_user_type INTEGER
)
RETURNS TABLE (
  id UUID,
  "licenseKey" TEXT,
  "organizationId" UUID,
  "organizationName" VARCHAR(255),
  "branchId" UUID,
  "branchName" VARCHAR(255),
  "deviceId" UUID,
  "deviceName" VARCHAR(255),
  status SMALLINT,
  "activatedAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
  -- Reseller viewers (p_viewer_user_type = 2) never see branch/device
  -- assignment at all (org-internal data, not even the raw IDs) — only the
  -- organization name, so they know which client currently holds it.
  RETURN QUERY
  SELECT
    l.id,
    l.license_key AS "licenseKey",
    l.organization_id AS "organizationId",
    o.name AS "organizationName",
    CASE WHEN p_viewer_user_type = 2 THEN NULL ELSE l.branch_id END AS "branchId",
    CASE WHEN p_viewer_user_type = 2 THEN NULL ELSE b.name END AS "branchName",
    CASE WHEN p_viewer_user_type = 2 THEN NULL ELSE l.device_id END AS "deviceId",
    CASE WHEN p_viewer_user_type = 2 THEN NULL ELSE d.name END AS "deviceName",
    l.status,
    l.activated_at AS "activatedAt",
    l.expires_at AS "expiresAt",
    l.created_at AS "createdAt",
    l.updated_at AS "updatedAt"
  FROM licenses l
  LEFT JOIN organizations o ON o.id = l.organization_id
  LEFT JOIN branches b ON b.id = l.branch_id
  LEFT JOIN devices d ON d.id = l.device_id
  WHERE l.id = p_license_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
