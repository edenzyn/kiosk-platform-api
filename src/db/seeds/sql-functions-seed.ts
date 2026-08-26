import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { initDatabase } from "../../config/db";

export async function runSqlFunctionsSeed() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("==================================================");
  console.log("🌱 Creating / Replacing SQL Functions");
  console.log("==================================================");

  const functionsDir = path.join(__dirname, "../sql/functions");
  const sqlFiles = fs
    .readdirSync(functionsDir)
    .filter((file) => file.endsWith(".sql"));

  for (const file of sqlFiles) {
    const filePath = path.join(functionsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    await db.execute(sql.raw(content));
    console.log(`  ✓ Applied: ${file}`);
  }

  console.log(`\n🎉 Applied ${sqlFiles.length} SQL function(s) successfully.`);
  console.log("==================================================\n");

  await dbConfig.close();
}

runSqlFunctionsSeed()
  .catch((err) => {
    console.error("❌ Error running SQL functions seed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
