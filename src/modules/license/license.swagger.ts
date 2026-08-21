const licenseIdParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const licenseStatusDescription =
  "1=AVAILABLE, 2=ACTIVE, 3=GRACE_PERIOD, 4=EXPIRED, 5=REVOKED";

const discountRuleRequestSchema = {
  type: "object",
  required: ["name", "targetEntity", "discountType", "discountValue"],
  properties: {
    name: { type: "string", minLength: 2, maxLength: 255 },
    targetEntity: {
      type: "integer",
      description:
        "1=ORGANIZATIONS (all orgs), 2=RESELLERS (all resellers), 3=RESELLER_INDIVIDUAL (requires resellerIds), 4=LICENSE_PLAN_INDIVIDUAL (requires pricingPlanIds)",
    },
    discountType: { type: "integer", description: "1=PERCENTAGE, 2=FLAT" },
    discountValue: {
      type: "number",
      exclusiveMinimum: 0,
      description: "Percentage (0-100) if discountType=PERCENTAGE, otherwise a flat amount",
    },
    currency: {
      type: "string",
      minLength: 3,
      maxLength: 3,
      description: "Required (3-letter ISO code) when discountType=FLAT; ignored otherwise",
    },
    minQuantity: { type: "integer", minimum: 1, default: 1 },
    maxQuantity: { type: "integer", minimum: 1, nullable: true },
    startsAt: { type: "string", format: "date-time", nullable: true },
    endsAt: { type: "string", format: "date-time", nullable: true },
    resellerIds: {
      type: "array",
      items: { type: "string", format: "uuid" },
      description: "Required when targetEntity=RESELLER_INDIVIDUAL",
    },
    pricingPlanIds: {
      type: "array",
      items: { type: "string", format: "uuid" },
      description: "Required when targetEntity=LICENSE_PLAN_INDIVIDUAL",
    },
  },
};

const pricingPlanRequestSchema = {
  type: "object",
  required: ["name", "durationDays", "price", "currency"],
  properties: {
    name: { type: "string", minLength: 2, maxLength: 255 },
    durationDays: { type: "integer", minimum: 1 },
    price: { type: "number", minimum: 0 },
    currency: { type: "string", minLength: 3, maxLength: 3, description: "3-letter ISO code" },
  },
};

const paginationParams = [
  { $ref: "#/components/parameters/PageParam" },
  { $ref: "#/components/parameters/LimitParam" },
];

export const licenseSwaggerPaths: Record<string, unknown> = {
  // ==========================================================
  // Device Licenses — /pvt/d/licenses (device-client)
  // ==========================================================
  "/pvt/d/licenses/activate": {
    post: {
      tags: ["Device Licenses"],
      summary: "Activate a license key on the current device",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["licenseKey"],
              properties: { licenseKey: { type: "string" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "License activated and bound to this device" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { description: "License key not found" },
        "409": { description: "License already activated on another device, or not AVAILABLE" },
      },
    },
  },

  // ==========================================================
  // Platform Licenses — /pvt/p/licenses (platform-managed pricing & discounts)
  // ==========================================================
  "/pvt/p/licenses/discount-rules": {
    get: {
      tags: ["Platform Licenses"],
      summary: "List discount rules",
      parameters: [
        ...paginationParams,
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "targetEntity", in: "query", schema: { type: "integer" } },
        { name: "isActive", in: "query", schema: { type: "boolean" } },
        { name: "sortBy", in: "query", schema: { type: "string", enum: ["name", "discountValue", "createdAt"] } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: {
        "200": { description: "Paginated list of discount rules with their targets" },
      },
    },
    post: {
      tags: ["Platform Licenses"],
      summary: "Create a discount rule",
      requestBody: { required: true, content: { "application/json": { schema: discountRuleRequestSchema } } },
      responses: {
        "201": { description: "Discount rule created" },
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/pvt/p/licenses/discount-rules/{id}/status": {
    patch: {
      tags: ["Platform Licenses"],
      summary: "Toggle a discount rule's active status",
      parameters: [{ ...licenseIdParam, description: "Discount rule ID" }],
      responses: {
        "200": { description: "Status toggled" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/p/licenses/discount-rules/{id}": {
    patch: {
      tags: ["Platform Licenses"],
      summary: "Update a discount rule",
      description: "Full update, including its resellers/pricing-plan targets — reuses the create schema.",
      parameters: [{ ...licenseIdParam, description: "Discount rule ID" }],
      requestBody: { required: true, content: { "application/json": { schema: discountRuleRequestSchema } } },
      responses: {
        "200": { description: "Discount rule updated" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/p/licenses/pricing": {
    get: {
      tags: ["Platform Licenses"],
      summary: "List pricing plans",
      parameters: [{ name: "isActive", in: "query", schema: { type: "boolean" } }],
      responses: { "200": { description: "List of pricing plans" } },
    },
    post: {
      tags: ["Platform Licenses"],
      summary: "Create a pricing plan",
      requestBody: { required: true, content: { "application/json": { schema: pricingPlanRequestSchema } } },
      responses: {
        "201": { description: "Pricing plan created" },
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/pvt/p/licenses/pricing/{id}/status": {
    patch: {
      tags: ["Platform Licenses"],
      summary: "Toggle a pricing plan's active status",
      parameters: [{ ...licenseIdParam, description: "Pricing plan ID" }],
      responses: {
        "200": { description: "Status toggled" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/p/licenses/pricing/{id}": {
    patch: {
      tags: ["Platform Licenses"],
      summary: "Update a pricing plan",
      parameters: [{ ...licenseIdParam, description: "Pricing plan ID" }],
      requestBody: { required: true, content: { "application/json": { schema: pricingPlanRequestSchema } } },
      responses: {
        "200": { description: "Pricing plan updated" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },

  // ==========================================================
  // Reseller Licenses & Redemption Codes — /pvt/r/licenses
  // ==========================================================
  "/pvt/r/licenses": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "List the reseller's owned licenses",
      parameters: [
        ...paginationParams,
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "integer" }, description: licenseStatusDescription },
        { name: "sortBy", in: "query", schema: { type: "string" } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { "200": { description: "Paginated list of the reseller's licenses" } },
    },
  },
  "/pvt/r/licenses/pricing": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "List pricing plans available for purchase",
      parameters: [{ name: "id", in: "query", schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "List of active pricing plans" } },
    },
  },
  "/pvt/r/licenses/discount-rules": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "List discount rules applicable to this reseller",
      responses: { "200": { description: "List of applicable discount rules with their targets" } },
    },
  },
  "/pvt/r/licenses/purchase": {
    post: {
      tags: ["Reseller Licenses"],
      summary: "Purchase licenses into the reseller's inventory",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["quantity", "pricingPlanId"],
              properties: {
                quantity: { type: "integer", minimum: 1 },
                pricingPlanId: { type: "string", format: "uuid" },
                discountRuleId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Licenses purchased; returns the newly created licenses" },
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/pvt/r/licenses/redeemable": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "List licenses eligible to be bundled into a new redemption code",
      description:
        "Excludes licenses already sitting inside an active (non-revoked/non-expired) redemption code, unlike GET /pvt/r/licenses.",
      parameters: paginationParams,
      responses: { "200": { description: "Paginated list of redeemable licenses" } },
    },
  },
  "/pvt/r/licenses/redemption-codes": {
    get: {
      tags: ["Redemption Codes"],
      summary: "List the reseller's generated redemption codes",
      parameters: [
        ...paginationParams,
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "status",
          in: "query",
          schema: { type: "integer" },
          description: "1=GENERATED, 2=CLAIMED, 3=REVOKED, 4=EXPIRED, 5=VERIFIED",
        },
        { name: "sortBy", in: "query", schema: { type: "string", enum: ["generatedAt", "redeemExpiresAt", "status"] } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { "200": { description: "Paginated list of redemption codes" } },
    },
    post: {
      tags: ["Redemption Codes"],
      summary: "Generate a redemption code bundling one or more licenses",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["licenseIds"],
              properties: {
                licenseIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  minItems: 1,
                },
                redeemExpiresAt: { type: "string", format: "date-time", nullable: true },
                remarks: { type: "string", maxLength: 500 },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Redemption code generated (plaintext code returned once)" },
        "400": { description: "One or more licenses unavailable or not owned by this reseller" },
        "409": { description: "One or more licenses already have an active redemption code" },
      },
    },
  },
  "/pvt/r/licenses/redemption-codes/{id}": {
    get: {
      tags: ["Redemption Codes"],
      summary: "Get redemption code details, including bundled licenses",
      parameters: [{ ...licenseIdParam, description: "Redemption code ID" }],
      responses: {
        "200": { description: "Redemption code + bundled license items" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["Redemption Codes"],
      summary: "Revoke a redemption code",
      description: "Only allowed while the code is still in GENERATED status (not yet claimed).",
      parameters: [{ ...licenseIdParam, description: "Redemption code ID" }],
      responses: {
        "200": { description: "Redemption code revoked" },
        "409": { description: "Redemption code not found, already claimed, or already revoked" },
      },
    },
  },
  "/pvt/r/licenses/redemption-codes/{id}/verify": {
    patch: {
      tags: ["Redemption Codes"],
      summary: "Verify (finalize) the sold price of a claimed redemption code",
      description:
        "Called after the code has been claimed by an organization, to record what it was actually sold for. Per-license `soldPrice` values must sum to `totalSoldPrice`.",
      parameters: [{ ...licenseIdParam, description: "Redemption code ID" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["totalSoldPrice", "currency", "items"],
              properties: {
                totalSoldPrice: { type: "number", minimum: 0 },
                currency: { type: "string", minLength: 3, maxLength: 3 },
                items: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    required: ["licenseId", "soldPrice"],
                    properties: {
                      licenseId: { type: "string", format: "uuid" },
                      soldPrice: { type: "number", minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Sold price verified" },
        "400": { description: "Per-license sold prices don't add up to the total, or submitted licenses don't match the code's bundle" },
        "409": { description: "Redemption code is not in a CLAIMED state" },
      },
    },
  },
  "/pvt/r/licenses/{id}/history": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "Get a license's history log (reseller view)",
      parameters: [licenseIdParam],
      responses: {
        "200": { description: "List of history events for the license" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/r/licenses/{id}/details": {
    get: {
      tags: ["Reseller Licenses"],
      summary: "Get full license details (reseller view)",
      parameters: [licenseIdParam],
      responses: {
        "200": { description: "License details" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },

  // ==========================================================
  // Licenses (org/branch) — /pvt/u/licenses
  // ==========================================================
  "/pvt/u/licenses": {
    get: {
      tags: ["Licenses"],
      summary: "List the organization's/branch's licenses",
      parameters: [
        ...paginationParams,
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "integer" }, description: licenseStatusDescription },
        { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "sortBy", in: "query", schema: { type: "string" } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { "200": { description: "Paginated list of licenses" } },
    },
  },
  "/pvt/u/licenses/pricing": {
    get: {
      tags: ["Licenses"],
      summary: "List pricing plans available for purchase",
      parameters: [{ name: "id", in: "query", schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "List of active pricing plans" } },
    },
  },
  "/pvt/u/licenses/discount-rules": {
    get: {
      tags: ["Licenses"],
      summary: "List discount rules applicable to this organization",
      responses: { "200": { description: "List of applicable discount rules with their targets" } },
    },
  },
  "/pvt/u/licenses/purchase": {
    post: {
      tags: ["Licenses"],
      summary: "Purchase licenses for the organization",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["quantity", "pricingPlanId"],
              properties: {
                quantity: { type: "integer", minimum: 1 },
                pricingPlanId: { type: "string", format: "uuid" },
                discountRuleId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Licenses purchased; returns the newly created licenses" },
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/pvt/u/licenses/redeem": {
    post: {
      tags: ["Licenses"],
      summary: "Redeem a reseller-issued redemption code",
      description:
        "Claims all licenses bundled in the code into this organization/branch. A license redeemed this way can later only be extended using the same plan and price it was redeemed with.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["redeemCode"],
              properties: { redeemCode: { type: "string", description: "e.g. RDM-XXXXX-XXXXX-XXXXX" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Code redeemed; returns the claimed licenses" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { description: "Invalid redeem code" },
        "409": { description: "Code already redeemed, revoked, expired, or its licenses are no longer available" },
      },
    },
  },
  "/pvt/u/licenses/{id}/assign-branch": {
    post: {
      tags: ["Licenses"],
      summary: "Assign a license to a branch",
      parameters: [licenseIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["branchId"],
              properties: { branchId: { type: "string", format: "uuid" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "License assigned to the branch" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/licenses/{id}/assign-device": {
    post: {
      tags: ["Licenses"],
      summary: "Assign a license to a device",
      parameters: [licenseIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["deviceId"],
              properties: { deviceId: { type: "string", format: "uuid" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "License assigned to the device" },
        "400": { description: "Device already has an active license assigned" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/licenses/{id}/extend-info": {
    get: {
      tags: ["Licenses"],
      summary: "Get extend eligibility/locked pricing for a license",
      description:
        "If the license was originally redeemed via a code, returns `isRedeemed: true` plus the locked plan/price/duration it must be extended with. Otherwise `isRedeemed: false` and the caller may extend with any active pricing plan.",
      parameters: [licenseIdParam],
      responses: {
        "200": {
          description: "Extend eligibility info",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isRedeemed: { type: "boolean" },
                  lockedPricing: {
                    type: "object",
                    nullable: true,
                    properties: {
                      planName: { type: "string", nullable: true },
                      basePrice: { type: "string" },
                      soldPrice: { type: "string", nullable: true },
                      currency: { type: "string" },
                      durationDays: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/licenses/{id}/extend": {
    post: {
      tags: ["Licenses"],
      summary: "Extend a license",
      description:
        "`pricingPlanId` is required unless the license was redeemed via a code (see GET .../extend-info) — in that case it's ignored server-side and the license's originally-redeemed plan/price/duration is used instead.",
      parameters: [licenseIdParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { pricingPlanId: { type: "string", format: "uuid" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "License extended; returns the updated license" },
        "400": { description: "Pricing plan ID is required (non-redeemed license, none supplied)" },
        "404": { description: "License or pricing plan not found" },
      },
    },
  },
  "/pvt/u/licenses/{id}/history": {
    get: {
      tags: ["Licenses"],
      summary: "Get a license's history log",
      parameters: [licenseIdParam],
      responses: {
        "200": { description: "List of history events for the license" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/licenses/{id}/details": {
    get: {
      tags: ["Licenses"],
      summary: "Get full license details",
      parameters: [licenseIdParam],
      responses: {
        "200": { description: "License details" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
