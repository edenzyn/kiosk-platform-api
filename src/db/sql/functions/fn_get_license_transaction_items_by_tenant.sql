CREATE OR REPLACE FUNCTION fn_get_license_transaction_items_by_tenant(
  p_transaction_id UUID,
  p_organization_id UUID,
  p_branch_id UUID,
  p_reseller_id UUID
)
RETURNS TABLE (
  "itemId" UUID,
  "licenseId" UUID,
  "licenseKey" TEXT,
  "deviceType" SMALLINT,
  "pricingPlanId" UUID,
  "planName" VARCHAR(255),
  "actionType" SMALLINT,
  "durationDays" INTEGER,
  "baseUnitPrice" NUMERIC(10, 2),
  "discountPercentage" NUMERIC(5, 2),
  "unitPrice" NUMERIC(10, 2),
  "itemCreatedAt" TIMESTAMPTZ,
  "transactionId" UUID,
  "userId" UUID,
  "performedByName" VARCHAR(255),
  "subtotalAmount" NUMERIC(10, 2),
  "discountAmount" NUMERIC(10, 2),
  "transactionDiscountPercentage" NUMERIC(5, 2),
  "totalAmount" NUMERIC(10, 2),
  currency VARCHAR(10),
  "paymentStatus" SMALLINT,
  "paymentProvider" SMALLINT,
  "paymentReference" VARCHAR(255),
  "failureReason" TEXT,
  "transactionAt" TIMESTAMPTZ,
  "transactionCreatedAt" TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lti.id AS "itemId",
    lti.license_id AS "licenseId",
    l.license_key AS "licenseKey",
    l.device_type AS "deviceType",
    lti.pricing_plan_id AS "pricingPlanId",
    lti.plan_name AS "planName",
    lti.action_type AS "actionType",
    lti.duration_days AS "durationDays",
    lti.base_unit_price AS "baseUnitPrice",
    lti.discount_percentage AS "discountPercentage",
    lti.unit_price AS "unitPrice",
    lti.created_at AS "itemCreatedAt",
    lt.id AS "transactionId",
    lt.created_by AS "userId",
    u.name AS "performedByName",
    lt.subtotal_amount AS "subtotalAmount",
    lt.discount_amount AS "discountAmount",
    lt.discount_percentage AS "transactionDiscountPercentage",
    lt.total_amount AS "totalAmount",
    lt.currency,
    lt.payment_status AS "paymentStatus",
    lt.payment_provider AS "paymentProvider",
    lt.payment_reference AS "paymentReference",
    lt.failure_reason AS "failureReason",
    lt.transaction_at AS "transactionAt",
    lt.created_at AS "transactionCreatedAt"
  FROM license_transactions lt
  LEFT JOIN users u ON u.id = lt.created_by
  LEFT JOIN license_transaction_items lti ON lti.transaction_id = lt.id
  LEFT JOIN licenses l ON l.id = lti.license_id
  WHERE lt.id = p_transaction_id
    AND (
      (
        p_reseller_id IS NOT NULL
        AND (
          lt.created_by = p_reseller_id
          OR EXISTS (
            SELECT 1
            FROM license_reseller_mapper lrm
            WHERE lrm.license_id = lti.license_id
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
          OR (
            (p_organization_id IS NULL OR l.organization_id = p_organization_id)
            AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
          )
          OR (
            p_organization_id IS NOT NULL
            AND u.organization_id = p_organization_id
            AND (p_branch_id IS NULL OR u.branch_id = p_branch_id)
          )
        )
      )
    )
  ORDER BY lti.created_at ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
