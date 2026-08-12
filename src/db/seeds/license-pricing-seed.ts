import { initDatabase } from "../../config/db";
import { licensePricing } from "../../modules/license/schemas/license-pricing.schema";
import { sql } from "drizzle-orm";

export async function runSeedLicensePricing() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("Seeding license pricing plans...");

  const plans = [
    {
      name: "Weekly License Plan",
      durationDays: 7,
      price: "300.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Monthly License Plan",
      durationDays: 30,
      price: "1200.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Quarterly License Plan",
      durationDays: 90,
      price: "3400.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Semi-Annual License Plan",
      durationDays: 180,
      price: "6400.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Annual License Plan",
      durationDays: 365,
      price: "12000.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Two-Year License Plan",
      durationDays: 730,
      price: "22000.00",
      currency: "INR",
      isActive: true,
    },
    {
      name: "Three-Year License Plan",
      durationDays: 1095,
      price: "30000.00",
      currency: "INR",
      isActive: true,
    },
  ];

  for (const plan of plans) {
    const existing = await db
      .select()
      .from(licensePricing)
      .where(sql`duration_days = ${plan.durationDays}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(licensePricing).values(plan);
      console.log(`Seeded plan: ${plan.name}`);
    } else {
      await db
        .update(licensePricing)
        .set(plan)
        .where(sql`duration_days = ${plan.durationDays}`);
      console.log(`Updated plan: ${plan.name}`);
    }
  }

  console.log("License pricing seeded successfully!");
  await dbConfig.close();
}

runSeedLicensePricing()
  .catch((err) => {
    console.error("Error seeding license pricing:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
