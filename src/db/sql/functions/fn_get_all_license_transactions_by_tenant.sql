CREATE OR REPLACE FUNCTION fn_get_all_license_transactions_by_tenant(
  p_organization_id UUID,
  p_branch_id UUID,
  p_reseller_id UUID,
  p_page INTEGER,
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  "userId" UUID,
  "performedByName" VARCHAR(255),
  "subtotalAmount" NUMERIC(10, 2),
  "discountAmount" NUMERIC(10, 2),
  "discountPercentage" NUMERIC(5, 2),
  "totalAmount" NUMERIC(10, 2),
  currency VARCHAR(10),
  "paymentStatus" SMALLINT,
  "transactionAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ,
  "itemCount" INTEGER,
  "totalCount" BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lt.id,
    lt.created_by AS "userId",
    u.name AS "performedByName",
    lt.subtotal_amount AS "subtotalAmount",
    lt.discount_amount AS "discountAmount",
    lt.discount_percentage AS "discountPercentage",
    lt.total_amount AS "totalAmount",
    lt.currency,
    lt.payment_status AS "paymentStatus",
    lt.transaction_at AS "transactionAt",
    lt.created_at AS "createdAt",
    (
      SELECT COUNT(*)::int
      FROM license_transaction_items lti_count
      WHERE lti_count.transaction_id = lt.id
    ) AS "itemCount",
    COUNT(*) OVER ()::bigint AS "totalCount"
  FROM license_transactions lt
  LEFT JOIN users u ON u.id = lt.created_by
  WHERE
    (
      p_reseller_id IS NOT NULL
      AND (
        lt.created_by = p_reseller_id
        OR EXISTS (
          SELECT 1
          FROM license_transaction_items lti
          INNER JOIN license_reseller_mapper lrm
            ON lrm.license_id = lti.license_id
          WHERE lti.transaction_id = lt.id
            AND lrm.reseller_id = p_reseller_id
        )
      )
    )
    OR (
      p_reseller_id IS NULL
      AND (
        (
          p_organization_id IS NOT NULL
          AND lt.organization_id = p_organization_id
          AND (p_branch_id IS NULL OR lt.branch_id = p_branch_id)
        )
        OR EXISTS (
          SELECT 1
          FROM license_transaction_items lti
          INNER JOIN licenses l ON l.id = lti.license_id
          WHERE lti.transaction_id = lt.id
            AND (p_organization_id IS NULL OR l.organization_id = p_organization_id)
            AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
        )
        OR (
          p_organization_id IS NOT NULL
          AND u.organization_id = p_organization_id
          AND (p_branch_id IS NULL OR u.branch_id = p_branch_id)
        )
      )
    )
  ORDER BY lt.created_at DESC
  LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;
