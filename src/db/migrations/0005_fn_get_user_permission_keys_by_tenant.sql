CREATE OR REPLACE FUNCTION fn_get_user_permission_keys_by_tenant(
  p_user_id UUID,
  p_organization_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  key VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  -- Direct user permissions
  SELECT DISTINCT p.key
  FROM permissions p
  INNER JOIN permission_mapper pm ON p.id = pm.permission_id
  WHERE
    pm.entity_type = 1 -- PermissionEntityType.USER
    AND pm.entity_id = p_user_id
    AND p.is_active = true
    AND (
      (p_organization_id IS NOT NULL AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL))
      OR (p_organization_id IS NULL AND pm.organization_id IS NULL)
    )
    AND (
      (p_branch_id IS NOT NULL AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL))
      OR (p_branch_id IS NULL AND pm.branch_id IS NULL)
    )

  UNION

  -- Role permissions
  SELECT DISTINCT p.key
  FROM permissions p
  INNER JOIN permission_mapper pm ON p.id = pm.permission_id
  INNER JOIN user_roles_mapper urm ON urm.role_id = pm.entity_id
  INNER JOIN roles r ON r.id = urm.role_id
  WHERE
    pm.entity_type = 2 -- PermissionEntityType.ROLE
    AND urm.user_id = p_user_id
    AND p.is_active = true
    AND r.is_active = true
    AND (
      (p_organization_id IS NOT NULL AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL))
      OR (p_organization_id IS NULL AND pm.organization_id IS NULL)
    )
    AND (
      (p_branch_id IS NOT NULL AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL))
      OR (p_branch_id IS NULL AND pm.branch_id IS NULL)
    );
END;
$$ LANGUAGE plpgsql;
