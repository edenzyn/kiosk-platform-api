import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type {
  CreateBranchRepoInput,
  CreateBranchRepoResult,
  FindBranchesForFiltersRepoInput,
  FindBranchesForFiltersRepoResult,
  FindBranchesRepoInput,
  FindBranchesRepoResult,
  FindOneBranchRepoInput,
  FindOneBranchRepoResult,
  UpdateBranchRepoInput,
  UpdateBranchRepoResult,
  UpdateBranchSettingsRepoInput,
} from "./branch.types";
import {
  branchSettings,
  type BranchSettingsEntity,
  type CreateBranchSettingsEntity,
} from "./schemas/branch-settings.schema";
import { branches } from "./schemas/branch.schema";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { logger } from "../../shared/utils/core/logger";

export class BranchRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? BRANCH SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneBranchRepoInput,
  ): Promise<FindOneBranchRepoResult> {
    try {
      const conditions: (SQL | undefined)[] = [];

      if (input.id !== undefined) {
        conditions.push(eq(branches.id, input.id));
      }
      if (input.name !== undefined) {
        conditions.push(eq(branches.name, input.name));
      }
      if (input.organizationId !== undefined) {
        conditions.push(eq(branches.organizationId, input.organizationId));
      }

      if (conditions.length === 0) {
        return await null;
      }

      const [branch] = await this.database.client
        .select()
        .from(branches)
        .where(and(...conditions))
        .limit(1);

      return (await branch) || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_FIND_ONE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async find(input: FindBranchesRepoInput): Promise<FindBranchesRepoResult> {
    try {
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
      return await { branches: rows, total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_FIND_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findBranchesForFilters(
    input: FindBranchesForFiltersRepoInput,
  ): Promise<FindBranchesForFiltersRepoResult> {
    try {
      const { organizationId, branchIds, excludeBranchId, marketId } = input;
      const conditions = [];

      if (organizationId) {
        conditions.push(eq(branches.organizationId, organizationId));
      }

      if (branchIds && branchIds.length > 0) {
        conditions.push(inArray(branches.id, branchIds));
      }

      if (excludeBranchId) {
        conditions.push(ne(branches.id, excludeBranchId));
      }

      if (marketId) {
        conditions.push(eq(branches.marketId, marketId));
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

      return await query;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_FIND_BRANCHES_FOR_FILTERS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async create(input: CreateBranchRepoInput): Promise<CreateBranchRepoResult> {
    try {
      const { data } = input;
      const [branch] = await this.database.client
        .insert(branches)
        .values({
          organizationId: data.organizationId,
          marketId: data.marketId,
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
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          createdBy: data.createdBy,
        })
        .returning();

      if (!branch) {
        throw new Error("Failed to create branch");
      }

      return await branch;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_CREATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async update(input: UpdateBranchRepoInput): Promise<UpdateBranchRepoResult> {
    try {
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

      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_UPDATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  // ========================================
  // ? BRANCH SETTINGS SCHEMA METHODS
  // ========================================
  async createSettings(
    data: CreateBranchSettingsEntity,
  ): Promise<BranchSettingsEntity> {
    try {
      const [created] = await this.database.client
        .insert(branchSettings)
        .values(data)
        .returning();

      if (!created) {
        throw new Error("Failed to create branch settings");
      }

      return await created;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_CREATE_SETTINGS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findSettings(branchId: string): Promise<BranchSettingsEntity | null> {
    try {
      const [settings] = await this.database.client
        .select()
        .from(branchSettings)
        .where(eq(branchSettings.branchId, branchId))
        .limit(1);

      return (await settings) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_FIND_SETTINGS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async getOrCreateSettings(branchId: string): Promise<BranchSettingsEntity> {
    try {
      const [existing] = await this.database.client
        .select()
        .from(branchSettings)
        .where(eq(branchSettings.branchId, branchId))
        .limit(1);

      if (existing) return await existing;

      const [created] = await this.database.client
        .insert(branchSettings)
        .values({ branchId })
        .onConflictDoNothing()
        .returning();

      if (created) return await created;

      // Lost the race to a concurrent insert - read back what it created.
      const [settings] = await this.database.client
        .select()
        .from(branchSettings)
        .where(eq(branchSettings.branchId, branchId))
        .limit(1);

      if (!settings) throw new Error("Failed to get or create branch settings");
      return await settings;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_GET_OR_CREATE_SETTINGS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async updateSettings(
    input: UpdateBranchSettingsRepoInput,
  ): Promise<BranchSettingsEntity> {
    try {
      const { branchId, data } = input;
      const [updated] = await this.database.client
        .insert(branchSettings)
        .values({ branchId, ...data })
        .onConflictDoUpdate({
          target: branchSettings.branchId,
          set: { ...data, updatedAt: new Date() },
        })
        .returning();

      if (!updated) throw new Error("Failed to update branch settings");
      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[BRANCH_UPDATE_SETTINGS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
