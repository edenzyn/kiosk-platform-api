import { sql } from "drizzle-orm";
import { initDatabase } from "../../config/db";
import { paymentProviders } from "../../modules/finance/schemas/payment-provider.schema";
import { PaymentProviderSlugEnum } from "../../shared/enums/finance/payment-provider-slug.enum";

// Payment providers are managed here, not from the app: add an entry and
// re-run the seed to make a provider available for market mapping.
const PAYMENT_PROVIDERS: Array<{ name: string; slug: PaymentProviderSlugEnum }> =
  [
    { name: "PhonePe", slug: PaymentProviderSlugEnum.PHONEPE },
    { name: "Pine Labs", slug: PaymentProviderSlugEnum.PINE_LABS },
  ];

export async function runPaymentProvidersSeed() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("🌱 Seeding payment providers...");

  for (const provider of PAYMENT_PROVIDERS) {
    await db
      .insert(paymentProviders)
      .values(provider)
      .onConflictDoUpdate({
        target: paymentProviders.slug,
        set: {
          name: sql`EXCLUDED.name`,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`✅ ${PAYMENT_PROVIDERS.length} payment providers seeded!`);
  await dbConfig.close();
}

runPaymentProvidersSeed()
  .catch((err) => {
    console.error("❌ Error seeding payment providers:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
