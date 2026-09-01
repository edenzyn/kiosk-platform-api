CREATE OR REPLACE FUNCTION fn_get_license_transactions_by_user_type(
  p_license_id UUID,
  p_viewer_user_type INTEGER
)
RETURNS TABLE (
  id UUID,
  "transactionId" UUID,
  "pricingPlanId" UUID,
  "planName" VARCHAR(255),
  "actionType" SMALLINT,
  "durationDays" INTEGER,
  "baseUnitPrice" NUMERIC(10, 2),
  "discountType" SMALLINT,
  "discountValue" NUMERIC(10, 2),
  "discountCurrency" VARCHAR(10),
  "unitPrice" NUMERIC(10, 2),
  "createdAt" TIMESTAMPTZ,
  "paymentStatus" SMALLINT,
  currency VARCHAR(10),
  "totalAmount" NUMERIC(10, 2),
  "performedByName" VARCHAR(255)
) AS $$
BEGIN
  -- Only transactions performed by a user of the same type as the viewer
  -- are visible: a normal user never sees the reseller's purchase pricing
  -- (their cost/discount), and a reseller never sees the org's own direct
  -- purchases. Reseller viewers (p_viewer_user_type = 2) also never see who
  -- performed the action, even for their own transactions.
  RETURN QUERY
  SELECT
    lti.id,
    lti.transaction_id AS "transactionId",
    lti.pricing_plan_id AS "pricingPlanId",
    lti.plan_name AS "planName",
    lti.action_type AS "actionType",
    lti.duration_days AS "durationDays",
    lti.base_unit_price AS "baseUnitPrice",
    lti.discount_type AS "discountType",
    lti.discount_value AS "discountValue",
    lti.discount_currency AS "discountCurrency",
    lti.unit_price AS "unitPrice",
    lti.created_at AS "createdAt",
    lt.payment_status AS "paymentStatus",
    lt.currency,
    lt.total_amount AS "totalAmount",
    CASE WHEN p_viewer_user_type = 2 THEN NULL ELSE u.name END AS "performedByName"
  FROM license_transaction_items lti
  LEFT JOIN license_transactions lt ON lt.id = lti.transaction_id
  LEFT JOIN users u ON u.id = lt.created_by
  WHERE lti.license_id = p_license_id
    AND u.user_type = p_viewer_user_type
  ORDER BY lti.created_at DESC;
END;
$$ LANGUAGE plpgsql;
