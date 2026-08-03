CREATE OR REPLACE FUNCTION fn_get_permissions_by_tenant(
  p_entity_id UUID,
  p_entity_type SMALLINT,
  p_organization_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  id UUID,
  key VARCHAR(255),
  description VARCHAR(255),
  "isActive" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "updatedBy" UUID
) AS $$
BEGIN
  IF p_entity_type = 1 THEN
    -- Entity is USER: get direct permissions + permissions from assigned roles
    RETURN QUERY
    -- Direct user permissions
    SELECT DISTINCT
      p.id,
      p.key,
      p.description,
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      p.created_by AS "createdBy",
      p.updated_by AS "updatedBy"
    FROM permissions p
    INNER JOIN permission_mapper pm ON p.id = pm.permission_id
    WHERE
      pm.entity_type = 1 -- PermissionEntityType.USER
      AND pm.entity_id = p_entity_id
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

    -- Role permissions assigned to the user
    SELECT DISTINCT
      p.id,
      p.key,
      p.description,
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      p.created_by AS "createdBy",
      p.updated_by AS "updatedBy"
    FROM permissions p
    INNER JOIN permission_mapper pm ON p.id = pm.permission_id
    INNER JOIN user_roles_mapper urm ON urm.role_id = pm.entity_id
    INNER JOIN roles r ON r.id = urm.role_id
    WHERE
      pm.entity_type = 2 -- PermissionEntityType.ROLE
      AND urm.user_id = p_entity_id
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

  ELSIF p_entity_type = 2 THEN
    -- Entity is ROLE: return permissions assigned to the role
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.key,
      p.description,
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      p.created_by AS "createdBy",
      p.updated_by AS "updatedBy"
    FROM permissions p
    INNER JOIN permission_mapper pm ON p.id = pm.permission_id
    WHERE
      pm.entity_type = 2 -- PermissionEntityType.ROLE
      AND pm.entity_id = p_entity_id
      AND p.is_active = true
      AND (
        (p_organization_id IS NOT NULL AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL))
        OR (p_organization_id IS NULL AND pm.organization_id IS NULL)
      )
      AND (
        (p_branch_id IS NOT NULL AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL))
        OR (p_branch_id IS NULL AND pm.branch_id IS NULL)
      );
  END IF;
END;
$$ LANGUAGE plpgsql;
