CREATE OR REPLACE FUNCTION fn_get_permissions_by_scope_and_tenant(
  p_entity_id UUID,
  p_entity_type SMALLINT,
  p_organization_id UUID,
  p_branch_id UUID,
  p_scope SMALLINT
)
RETURNS TABLE (
  id UUID,
  key VARCHAR(255),
  description VARCHAR(255),
  "isActive" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "updatedBy" UUID,
  assigned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.key,
    p.description,
    p.is_active AS "isActive",
    p.created_at AS "createdAt",
    p.updated_at AS "updatedAt",
    p.created_by AS "createdBy",
    p.updated_by AS "updatedBy",
    CASE
      WHEN p_entity_type = 1 THEN
        EXISTS (
          -- Direct user assignment
          SELECT 1 FROM permission_mapper pm
          WHERE pm.permission_id = p.id
            AND pm.entity_type = 1
            AND pm.entity_id = p_entity_id
            AND pm.is_active = true
            AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
            AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
        ) OR EXISTS (
          -- Inherited via user roles
          SELECT 1 FROM permission_mapper pm
          INNER JOIN user_roles_mapper urm ON urm.role_id = pm.entity_id
          INNER JOIN roles r ON r.id = urm.role_id
          WHERE pm.permission_id = p.id
            AND pm.entity_type = 2
            AND urm.user_id = p_entity_id
            AND pm.is_active = true
            AND r.is_active = true
            AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
            AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
        )
      WHEN p_entity_type = 2 THEN
        EXISTS (
          -- Role assignment
          SELECT 1 FROM permission_mapper pm
          WHERE pm.permission_id = p.id
            AND pm.entity_type = 2
            AND pm.entity_id = p_entity_id
            AND pm.is_active = true
            AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
            AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
        )
      ELSE FALSE
    END AS assigned
  FROM permissions p
  WHERE
    p.is_active = true
    AND (p.scope = p_scope OR p.scope = 5); -- Match requested scope or COMMON (5)
END;
$$ LANGUAGE plpgsql;
