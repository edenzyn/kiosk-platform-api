import { initDatabase } from "../../config/db";
import { licenseDiscountRules } from "../../modules/license/schemas/license-discount-rule.schema";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { sql } from "drizzle-orm";

export async function runSeedLicenseDiscountRules() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("Seeding license discount rules...");

  const rules = [
    {
      name: "Volume Discount 5+ Licenses (10%)",
      targetEntity: LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      discountType: 1, // PERCENTAGE
      discountValue: "10.00",
      minQuantity: 5,
      maxQuantity: null,
      isActive: true,
    },
  ];

  for (const rule of rules) {
    const existing = await db
      .select()
      .from(licenseDiscountRules)
      .where(
        sql`target_entity = ${rule.targetEntity} AND min_quantity = ${rule.minQuantity}`
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(licenseDiscountRules).values(rule);
      console.log(`Seeded discount rule: ${rule.name}`);
    } else {
      await db
        .update(licenseDiscountRules)
        .set(rule)
        .where(
          sql`target_entity = ${rule.targetEntity} AND min_quantity = ${rule.minQuantity}`
        );
      console.log(`Updated discount rule: ${rule.name}`);
    }
  }

  console.log("License discount rules seeded successfully!");
  await dbConfig.close();
}

runSeedLicenseDiscountRules()
  .catch((err) => {
    console.error("Error seeding license discount rules:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
