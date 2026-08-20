CREATE OR REPLACE FUNCTION fn_get_license_history_by_user_type(
  p_license_id UUID,
  p_target_entity_types SMALLINT[],
  p_viewer_user_type INTEGER
)
RETURNS TABLE (
  id UUID,
  "licenseId" UUID,
  "eventType" SMALLINT,
  "targetEntityType" SMALLINT,
  "previousStatus" SMALLINT,
  "newStatus" SMALLINT,
  "previousExpiresAt" TIMESTAMPTZ,
  "newExpiresAt" TIMESTAMPTZ,
  "transactionId" UUID,
  remarks TEXT,
  "performedBy" UUID,
  "performedByName" VARCHAR(255),
  "performedByEmail" VARCHAR(255),
  "createdAt" TIMESTAMPTZ
) AS $$
BEGIN
  -- Reseller viewers (p_viewer_user_type = 2) never see an actor identity,
  -- since only their own actions ever appear on their side. Normal-user
  -- viewers (p_viewer_user_type = 1) see real names for their own org's
  -- staff, but a reseller-performed action is masked to a generic
  -- "Reseller" label rather than the reseller's real identity.
  RETURN QUERY
  SELECT
    lh.id,
    lh.license_id AS "licenseId",
    lh.event_type AS "eventType",
    lh.target_entity_type AS "targetEntityType",
    lh.previous_status AS "previousStatus",
    lh.new_status AS "newStatus",
    lh.previous_expires_at AS "previousExpiresAt",
    lh.new_expires_at AS "newExpiresAt",
    lh.transaction_id AS "transactionId",
    lh.remarks,
    lh.performed_by AS "performedBy",
    CASE
      WHEN p_viewer_user_type = 2 THEN NULL
      WHEN u.user_type = 2 THEN 'Reseller'
      ELSE u.name
    END AS "performedByName",
    CASE
      WHEN p_viewer_user_type = 2 THEN NULL
      WHEN u.user_type = 2 THEN NULL
      ELSE u.email
    END AS "performedByEmail",
    lh.created_at AS "createdAt"
  FROM license_history lh
  LEFT JOIN users u ON u.id = lh.performed_by
  WHERE lh.license_id = p_license_id
    AND lh.target_entity_type = ANY(p_target_entity_types)
  ORDER BY lh.created_at DESC;
END;
$$ LANGUAGE plpgsql;
