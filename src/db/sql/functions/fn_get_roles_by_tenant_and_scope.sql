CREATE OR REPLACE FUNCTION fn_get_roles_by_tenant_and_scope(
  p_search TEXT,
  p_organization_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  id UUID,
  "organizationId" UUID,
  "branchId" UUID,
  name VARCHAR(255),
  description TEXT,
  rank INTEGER,
  "isSystem" BOOLEAN,
  "isActive" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "updatedBy" UUID,
  "memberCount" INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.organization_id AS "organizationId",
    r.branch_id AS "branchId",
    r.name,
    r.description,
    r.rank,
    r.is_system AS "isSystem",
    r.is_active AS "isActive",
    r.created_at AS "createdAt",
    r.updated_at AS "updatedAt",
    r.created_by AS "createdBy",
    r.updated_by AS "updatedBy",
    CAST(COUNT(urm.id) AS INTEGER) AS "memberCount"
  FROM roles r
  LEFT JOIN user_roles_mapper urm
    ON r.id = urm.role_id
  WHERE
    (p_search IS NULL OR r.name ILIKE '%' || p_search || '%')
    AND (
      (
        p_branch_id IS NOT NULL
        AND p_organization_id IS NOT NULL
        AND r.branch_id = p_branch_id
        AND r.organization_id = p_organization_id
      )
      OR
      (
        p_branch_id IS NOT NULL
        AND p_organization_id IS NULL
        AND r.branch_id = p_branch_id
      )
      OR
      (
        p_branch_id IS NULL
        AND p_organization_id IS NOT NULL
        AND r.organization_id = p_organization_id
        AND r.branch_id IS NULL
      )
      OR
      (
        p_branch_id IS NULL
        AND p_organization_id IS NULL
        AND r.organization_id IS NULL
        AND r.branch_id IS NULL
      )
    )
  GROUP BY
    r.id,
    r.organization_id,
    r.branch_id,
    r.name,
    r.description,
    r.rank,
    r.is_system,
    r.is_active,
    r.created_at,
    r.updated_at,
    r.created_by,
    r.updated_by
  ORDER BY
    r.rank ASC,
    r.created_at ASC;
END;
$$ LANGUAGE plpgsql;
