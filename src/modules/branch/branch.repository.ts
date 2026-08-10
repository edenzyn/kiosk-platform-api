import { and, count, eq, inArray, ilike, or, asc, desc } from "drizzle-orm";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
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
    search?: string,
    isActive?: boolean,
    sortBy?: string,
    sortOrder?: SortingOrderEnum,
  ): Promise<{ branches: BranchEntity[]; total: number }> {
    const conditions = [];

    if (organizationId) {
      conditions.push(eq(branches.organizationId, organizationId));
    }

    if (branchIds && branchIds.length > 0) {
      conditions.push(inArray(branches.id, branchIds));
    }

    if (isActive !== undefined && isActive !== null) {
      conditions.push(eq(branches.isActive, isActive));
    }

    if (search) {
      conditions.push(
        or(
          ilike(branches.name, `%${search}%`),
          ilike(branches.email, `%${search}%`),
        )
      );
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

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === SortingOrderEnum.ASC ? asc : desc;
      if (sortBy === "name") {
        query = query.orderBy(orderFn(branches.name));
      } else if (sortBy === "city") {
        query = query.orderBy(orderFn(branches.city));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(branches.createdAt));
      }
    } else {
      query = query.orderBy(desc(branches.createdAt));
    }

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;
    return { branches: rows, total };
  }

  async getBranchesForFilters(
    organizationId?: string,
    branchIds?: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    const conditions = [];

    if (organizationId) {
      conditions.push(eq(branches.organizationId, organizationId));
    }

    if (branchIds && branchIds.length > 0) {
      conditions.push(inArray(branches.id, branchIds));
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    let query = this.database.client
      .select({
        id: branches.id,
        name: branches.name,
      })
      .from(branches)
      .$dynamic();

    if (condition) {
      query = query.where(condition);
    }

    return query;
  }

  async findById(id: string): Promise<BranchEntity | null> {
    const [branch] = await this.database.client
      .select()
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);
    return branch || null;
  }

  async update(id: string, data: Partial<BranchEntity>): Promise<BranchEntity> {
    const [updated] = await this.database.client
      .update(branches)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update branch");
    }

    return updated;
  }
}
