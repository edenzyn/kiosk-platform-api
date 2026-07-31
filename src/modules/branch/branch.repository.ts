import { eq, inArray } from "drizzle-orm";
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
        address: data.address ?? null,
        createdBy: data.createdBy,
      })
      .returning();

    if (!branch) {
      throw new Error("Failed to create branch");
    }

    return branch;
  }

  async findAll(
    organizationId?: string,
    branchIds?: string[],
  ): Promise<BranchEntity[]> {
    let query = this.database.client.select().from(branches).$dynamic();

    if (organizationId) {
      query = query.where(eq(branches.organizationId, organizationId));
    }

    if (branchIds && branchIds.length > 0) {
      query = query.where(inArray(branches.id, branchIds));
    }

    return query;
  }
}
