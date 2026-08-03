CREATE OR REPLACE FUNCTION fn_get_roles_by_tenant(
  p_search TEXT,
  p_organization_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  branch_id UUID,
  name VARCHAR(255),
  description TEXT,
  rank INTEGER,
  is_system BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  member_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
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
    r.updated_by,
    CAST(COUNT(urm.id) AS INTEGER) AS member_count
  FROM roles r
  LEFT JOIN user_roles_mapper urm ON r.id = urm.role_id
  LEFT JOIN branches b ON r.branch_id = b.id
  WHERE
    (p_search IS NULL OR r.name ILIKE '%' || p_search || '%')
    AND (
      (p_branch_id IS NOT NULL AND r.branch_id = p_branch_id)
      OR (p_branch_id IS NULL AND p_organization_id IS NOT NULL AND (r.organization_id = p_organization_id OR b.organization_id = p_organization_id))
      OR (p_branch_id IS NULL AND p_organization_id IS NULL AND r.organization_id IS NULL AND r.branch_id IS NULL)
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
    r.updated_by;
END;
$$ LANGUAGE plpgsql;
