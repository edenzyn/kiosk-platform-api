import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { branches } from "./branch.schema";
import type {
  CreateBranchRepoInput,
  CreateBranchRepoResult,
  FindBranchByIdRepoInput,
  FindBranchByIdRepoResult,
  GetBranchesForFiltersRepoInput,
  GetBranchesForFiltersRepoResult,
  GetBranchesRepoInput,
  GetBranchesRepoResult,
  UpdateBranchRepoInput,
  UpdateBranchRepoResult,
} from "./branch.types";

export class BranchRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateBranchRepoInput): Promise<CreateBranchRepoResult> {
    const { data } = input;
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
    input: GetBranchesRepoInput,
  ): Promise<GetBranchesRepoResult> {
    const {
      organizationId,
      branchIds,
      page,
      limit,
      search,
      isActive,
      sortBy,
      sortOrder,
    } = input;
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
        ),
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
    input: GetBranchesForFiltersRepoInput,
  ): Promise<GetBranchesForFiltersRepoResult> {
    const { organizationId, branchIds } = input;
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

  async findById(
    input: FindBranchByIdRepoInput,
  ): Promise<FindBranchByIdRepoResult> {
    const [branch] = await this.database.client
      .select()
      .from(branches)
      .where(eq(branches.id, input.id))
      .limit(1);
    return branch || null;
  }

  async update(input: UpdateBranchRepoInput): Promise<UpdateBranchRepoResult> {
    const { id, data } = input;
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
