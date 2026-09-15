import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { menuCategories } from "./schemas/menu-category.schema";
import { menuItems } from "./schemas/menu-item.schema";
import type {
  CreateMenuCategoryRepoInput,
  CreateMenuCategoryRepoResult,
  CreateMenuItemRepoInput,
  CreateMenuItemRepoResult,
  FindMenuCategoriesRepoInput,
  FindMenuCategoriesRepoResult,
  FindMenuItemsRepoInput,
  FindMenuItemsRepoResult,
  FindOneMenuCategoryRepoInput,
  FindOneMenuCategoryRepoResult,
  FindOneMenuItemRepoInput,
  FindOneMenuItemRepoResult,
} from "./menu.types";

export class MenuRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? MENU CATEGORY SCHEMA METHODS
  // ========================================
  async findOneCategory(
    input: FindOneMenuCategoryRepoInput,
  ): Promise<FindOneMenuCategoryRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) {
      conditions.push(eq(menuCategories.id, input.id));
    }
    if (input.organizationId !== undefined) {
      conditions.push(eq(menuCategories.organizationId, input.organizationId));
    }
    if (input.branchId !== undefined) {
      conditions.push(eq(menuCategories.branchId, input.branchId));
    }

    if (conditions.length === 0) {
      return null;
    }

    const [category] = await this.database.client
      .select()
      .from(menuCategories)
      .where(and(...conditions))
      .limit(1);

    return category || null;
  }

  async findCategories(
    input: FindMenuCategoriesRepoInput,
  ): Promise<FindMenuCategoriesRepoResult> {
    const { organizationId, branchId, isActive, isListed, search } = input;
    const conditions = [
      eq(menuCategories.organizationId, organizationId),
      eq(menuCategories.branchId, branchId),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(menuCategories.isActive, isActive));
    }

    if (isListed !== undefined) {
      conditions.push(eq(menuCategories.isListed, isListed));
    }

    if (search) {
      conditions.push(
        or(
          ilike(menuCategories.name, `%${search}%`),
          ilike(menuCategories.description, `%${search}%`),
        ) as SQL,
      );
    }

    const rows = await this.database.client
      .select({
        id: menuCategories.id,
        organizationId: menuCategories.organizationId,
        branchId: menuCategories.branchId,
        name: menuCategories.name,
        description: menuCategories.description,
        banner: menuCategories.banner,
        isListed: menuCategories.isListed,
        isActive: menuCategories.isActive,
        displayOrder: menuCategories.displayOrder,
        createdAt: menuCategories.createdAt,
        updatedAt: menuCategories.updatedAt,
        createdBy: menuCategories.createdBy,
        updatedBy: menuCategories.updatedBy,
        itemCount: count(menuItems.id),
      })
      .from(menuCategories)
      .leftJoin(menuItems, eq(menuItems.categoryId, menuCategories.id))
      .where(and(...conditions))
      .groupBy(menuCategories.id)
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));

    return {
      categories: rows.map((row) => ({
        ...row,
        itemCount: Number(row.itemCount),
      })),
    };
  }

  async createCategory(
    input: CreateMenuCategoryRepoInput,
  ): Promise<CreateMenuCategoryRepoResult> {
    const { data } = input;
    const [category] = await this.database.client
      .insert(menuCategories)
      .values({
        organizationId: data.organizationId,
        branchId: data.branchId,
        name: data.name,
        description: data.description ?? null,
        banner: data.banner ?? null,
        isListed: data.isListed,
        displayOrder: data.displayOrder,
        createdBy: data.createdBy,
      })
      .returning();

    if (!category) {
      throw new Error("Failed to create menu category");
    }

    return category;
  }

  // ========================================
  // ? MENU ITEM SCHEMA METHODS
  // ========================================
  async findOneItem(
    input: FindOneMenuItemRepoInput,
  ): Promise<FindOneMenuItemRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) {
      conditions.push(eq(menuItems.id, input.id));
    }
    if (input.organizationId !== undefined) {
      conditions.push(eq(menuItems.organizationId, input.organizationId));
    }
    if (input.branchId !== undefined) {
      conditions.push(eq(menuItems.branchId, input.branchId));
    }

    if (conditions.length === 0) {
      return null;
    }

    const [item] = await this.database.client
      .select()
      .from(menuItems)
      .where(and(...conditions))
      .limit(1);

    return item || null;
  }

  async findItems(input: FindMenuItemsRepoInput): Promise<FindMenuItemsRepoResult> {
    const { organizationId, branchId, categoryId, isListed, search } = input;
    const conditions = [
      eq(menuItems.organizationId, organizationId),
      eq(menuItems.branchId, branchId),
      eq(menuItems.categoryId, categoryId),
    ];

    if (isListed !== undefined) {
      conditions.push(eq(menuItems.isListed, isListed));
    }

    if (search) {
      conditions.push(
        or(
          ilike(menuItems.name, `%${search}%`),
          ilike(menuItems.code, `%${search}%`),
        ) as SQL,
      );
    }

    const rows = await this.database.client
      .select()
      .from(menuItems)
      .where(and(...conditions))
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));

    return { items: rows };
  }

  async createItem(input: CreateMenuItemRepoInput): Promise<CreateMenuItemRepoResult> {
    const { data } = input;
    const [item] = await this.database.client
      .insert(menuItems)
      .values({
        organizationId: data.organizationId,
        branchId: data.branchId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        code: data.code ?? null,
        takeawayChargeEnabled: data.takeawayChargeEnabled,
        takeawayChargeAmount: data.takeawayChargeAmount ?? null,
        isFeatured: data.isFeatured,
        isListed: data.isListed,
        calories: data.calories ?? null,
        dietaryType: data.dietaryType,
        hasAlcohol: data.hasAlcohol,
        isSpicy: data.isSpicy,
        displayOrder: data.displayOrder,
        createdBy: data.createdBy,
      })
      .returning();

    if (!item) {
      throw new Error("Failed to create menu item");
    }

    return item;
  }
}
