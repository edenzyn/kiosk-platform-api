import { and, count, eq, inArray } from "drizzle-orm";
import type { Database } from "../../config/db";
import { branches, type BranchEntity } from "./branch.schema";
import type { CreateBranchRequestDto } from "./dtos/create-branch-request.dto";

export class BranchRepository {
  constructor(private readonly database: Database) {}

  async create(data: CreateBranchRequestDto): Promise<BranchEntity> {
    const [branch] = await this.database.client
      .insert(branches)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        email: data.email ?? null,
        mobile: data.mobile ?? null,
        country: data.country,
        state: data.state,
        city: data.city,
        postalCode: data.postalCode,
        area: data.area ?? null,
        landmark: data.landmark ?? null,
        address: data.address,
        timezone: data.timezone,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        taxId: data.taxId ?? null,
        createdBy: data.createdBy,
      })
      .returning();

    if (!branch) {
      throw new Error("Failed to create branch");
    }

    return branch;
  }

  async getBranches(
    organizationId?: string,
    branchIds?: string[],
    page?: number,
    limit?: number,
  ): Promise<{ branches: BranchEntity[]; total: number }> {
    const conditions = [];

    if (organizationId) {
      conditions.push(eq(branches.organizationId, organizationId));
    }

    if (branchIds && branchIds.length > 0) {
      conditions.push(inArray(branches.id, branchIds));
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = this.database.client
      .select({ count: count() })
      .from(branches);
    const [countResult] = condition
      ? await countQuery.where(condition)
      : await countQuery;
    const total = Number(countResult?.count || 0);

    // Select query
    let query = this.database.client.select().from(branches).$dynamic();

    if (condition) {
      query = query.where(condition);
    }

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;
    return { branches: rows, total };
  }
}
