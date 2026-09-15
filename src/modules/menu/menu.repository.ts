import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { MenuItemSortByEnum } from "../../shared/enums/menu/menu-item-sort-by.enum";
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
import { itemModifierOptions } from "./schemas/item-modifier-option.schema";
import { itemModifiers } from "./schemas/item-modifier.schema";
import { menuCategories } from "./schemas/menu-category.schema";
import { menuItems } from "./schemas/menu-item.schema";

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
    const {
      page,
      limit,
      organizationId,
      branchId,
      isActive,
      isListed,
      search,
    } = input;
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

    const condition = and(...conditions);

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(menuCategories)
      .where(condition);
    const total = Number(countResult?.count || 0);

    const rows = await this.database.client
      .select({
        id: menuCategories.id,
        organizationId: menuCategories.organizationId,
        branchId: menuCategories.branchId,
        name: menuCategories.name,
        description: menuCategories.description,
        image: menuCategories.image,
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
      .where(condition)
      .groupBy(menuCategories.id)
      // id breaks ties so pages never overlap or skip rows.
      .orderBy(
        asc(menuCategories.displayOrder),
        asc(menuCategories.name),
        asc(menuCategories.id),
      )
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      categories: rows.map((row) => ({
        ...row,
        itemCount: Number(row.itemCount),
      })),
      total,
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
        image: data.image ?? null,
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

  async findItems(
    input: FindMenuItemsRepoInput,
  ): Promise<FindMenuItemsRepoResult> {
    const {
      page,
      limit,
      organizationId,
      branchId,
      categoryId,
      isListed,
      dietaryType,
      search,
      sortBy,
      sortOrder,
    } = input;
    const conditions = [
      eq(menuItems.organizationId, organizationId),
      eq(menuItems.branchId, branchId),
      eq(menuItems.categoryId, categoryId),
    ];

    if (isListed !== undefined) {
      conditions.push(eq(menuItems.isListed, isListed));
    }

    if (dietaryType !== undefined) {
      conditions.push(eq(menuItems.dietaryType, dietaryType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(menuItems.name, `%${search}%`),
          ilike(menuItems.code, `%${search}%`),
        ) as SQL,
      );
    }

    const condition = and(...conditions);

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(menuItems)
      .where(condition);
    const total = Number(countResult?.count || 0);

    const rows = await this.database.client
      .select()
      .from(menuItems)
      .where(condition)
      .orderBy(...this.itemOrderBy(sortBy, sortOrder))
      .limit(limit)
      .offset((page - 1) * limit);

    return { items: rows, total };
  }

  async createItem(
    input: CreateMenuItemRepoInput,
  ): Promise<CreateMenuItemRepoResult> {
    const { data } = input;
    return this.database.client.transaction(async (tx) => {
      const [item] = await tx
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
          image: data.image ?? null,
          createdBy: data.createdBy,
        })
        .returning();

      if (!item) {
        throw new Error("Failed to create menu item");
      }

      for (const modifier of data.modifiers) {
        const [createdModifier] = await tx
          .insert(itemModifiers)
          .values({
            menuItemId: item.id,
            name: modifier.name,
            selectionType: modifier.selectionType,
            minSelection: modifier.minSelection,
            maxSelection: modifier.maxSelection,
            displayOrder: modifier.displayOrder,
            createdBy: data.createdBy,
          })
          .returning({ id: itemModifiers.id });

        if (!createdModifier) {
          throw new Error("Failed to create item modifier");
        }

        await tx.insert(itemModifierOptions).values(
          modifier.options.map((option) => ({
            itemModifierId: createdModifier.id,
            name: option.name,
            price: String(option.price),
            isDefault: option.isDefault,
            displayOrder: option.displayOrder,
            createdBy: data.createdBy,
          })),
        );
      }

      return item;
    });
  }

  private itemOrderBy(
    sortBy?: MenuItemSortByEnum,
    sortOrder: SortingOrderEnum = SortingOrderEnum.ASC,
  ): SQL[] {
    const direction = sortOrder === SortingOrderEnum.DESC ? desc : asc;
    const sortColumn = {
      [MenuItemSortByEnum.NAME]: menuItems.name,
      [MenuItemSortByEnum.PRICE]: menuItems.price,
      [MenuItemSortByEnum.CREATED_AT]: menuItems.createdAt,
    };

    if (!sortBy) {
      return [
        asc(menuItems.displayOrder),
        asc(menuItems.name),
        asc(menuItems.id),
      ];
    }
    return [
      direction(sortColumn[sortBy]),
      asc(menuItems.name),
      asc(menuItems.id),
    ];
  }
}
