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
  scope SMALLINT,
  "isPrivileged" BOOLEAN,
  "isActive" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "createdBy" UUID,
  "updatedBy" UUID,
  assigned BOOLEAN,
  "isViaRole" BOOLEAN      -- true when assigned via role
) AS $$
BEGIN
  IF p_entity_type = 1 THEN
    -- User context: check direct assignment AND role inheritance.
    RETURN QUERY
    WITH
    direct_assigned AS (
      SELECT DISTINCT pm.permission_id
      FROM permission_mapper pm
      WHERE pm.entity_id = p_entity_id
        AND pm.entity_type = 1
        AND pm.is_active = true
        AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
        AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
    ),
    role_inherited AS (
      SELECT DISTINCT pm.permission_id
      FROM permission_mapper pm
      INNER JOIN user_roles_mapper urm ON urm.role_id = pm.entity_id
      INNER JOIN roles r ON r.id = urm.role_id
      WHERE urm.user_id = p_entity_id
        AND pm.entity_type = 2
        AND pm.is_active = true
        AND r.is_active = true
        AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
        AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
    )
    SELECT
      p.id,
      p.key,
      p.description,
      p.scope,
      (p.is_privileged = true AND p.scope = p_scope) AS "isPrivileged",
      p.is_active    AS "isActive",
      p.created_at   AS "createdAt",
      p.updated_at   AS "updatedAt",
      p.created_by   AS "createdBy",
      p.updated_by   AS "updatedBy",
      (da.permission_id IS NOT NULL OR ri.permission_id IS NOT NULL) AS assigned,
      (da.permission_id IS NULL AND ri.permission_id IS NOT NULL) AS "isViaRole"
    FROM permissions p
    LEFT JOIN direct_assigned da ON da.permission_id = p.id
    LEFT JOIN role_inherited  ri ON ri.permission_id = p.id
    WHERE
      p.is_active = true
      AND (
        p.scope = p_scope
        OR p.scope = 5 -- COMMON
        OR (p_scope = 2 AND p.scope = 3) -- ORG scope shows ORG, BRANCH, and COMMON
        OR (p_scope = 1 AND p.scope IN (2, 3, 4)) -- PLATFORM scope shows ALL
      );

  ELSIF p_entity_type = 2 THEN
    -- Role context: only direct assignment, no role_inherited needed.
    RETURN QUERY
    WITH
    direct_assigned AS (
      SELECT DISTINCT pm.permission_id
      FROM permission_mapper pm
      WHERE pm.entity_id = p_entity_id
        AND pm.entity_type = 2
        AND pm.is_active = true
        AND (pm.organization_id = p_organization_id OR pm.organization_id IS NULL)
        AND (pm.branch_id = p_branch_id OR pm.branch_id IS NULL)
    )
    SELECT
      p.id,
      p.key,
      p.description,
      p.scope,
      (p.is_privileged = true AND p.scope = p_scope) AS "isPrivileged",
      p.is_active    AS "isActive",
      p.created_at   AS "createdAt",
      p.updated_at   AS "updatedAt",
      p.created_by   AS "createdBy",
      p.updated_by   AS "updatedBy",
      (da.permission_id IS NOT NULL)  AS assigned,
      FALSE AS "isViaRole"
    FROM permissions p
    LEFT JOIN direct_assigned da ON da.permission_id = p.id
    WHERE
      p.is_active = true
      AND (
        p.scope = p_scope
        OR p.scope = 5 -- COMMON
        OR (p_scope = 2 AND p.scope = 3) -- ORG scope shows ORG, BRANCH, and COMMON
        OR (p_scope = 1 AND p.scope IN (2, 3, 4)) -- PLATFORM scope shows ALL
      );
  END IF;
END;
$$ LANGUAGE plpgsql;
