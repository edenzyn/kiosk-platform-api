import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { MenuItemSortByEnum } from "../../shared/enums/menu/menu-item-sort-by.enum";
import type { CreateItemModifierBodyDto } from "./dtos/create-menu-item.dtos";
import type {
  UpdateItemModifierBodyDto,
  UpdateItemModifierOptionBodyDto,
} from "./dtos/update-menu-item.dtos";
import type {
  CloneMenuRepoInput,
  CreateMenuCategoryRepoInput,
  CreateMenuCategoryRepoResult,
  CreateMenuItemRepoInput,
  CreateMenuItemRepoResult,
  DeleteMenuCategoryRepoInput,
  DeleteMenuItemRepoInput,
  FindBranchMenuTreeRepoInput,
  FindBranchMenuTreeRepoResult,
  FindItemModifiersRepoInput,
  FindItemModifiersRepoResult,
  FindMenuCategoriesRepoInput,
  FindMenuCategoriesRepoResult,
  FindMenuItemsRepoInput,
  FindMenuItemsRepoResult,
  FindOneMenuCategoryRepoInput,
  FindOneMenuCategoryRepoResult,
  FindOneMenuItemRepoInput,
  FindOneMenuItemRepoResult,
  FindOrCreateCategoriesInput,
  ImportMenuCsvRepoInput,
  ItemModifierWithOptions,
  UpdateMenuCategoryRepoInput,
  UpdateMenuCategoryRepoResult,
  UpdateMenuItemRepoInput,
  UpdateMenuItemRepoResult,
  UpdateMenuItemStatusRepoInput,
  UpdateMenuItemStatusRepoResult,
} from "./menu.types";
import { itemModifierOptions } from "./schemas/item-modifier-option.schema";
import { itemModifiers } from "./schemas/item-modifier.schema";
import { menuCategories } from "./schemas/menu-category.schema";
import { menuItems } from "./schemas/menu-item.schema";

type Transaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

/** Category names match ignoring case and surrounding spaces. */
const categoryKey = (name: string): string => name.trim().toLowerCase();

export class MenuRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? MENU CATEGORY SCHEMA METHODS
  // ========================================
  async findOneCategory(
    input: FindOneMenuCategoryRepoInput,
  ): Promise<FindOneMenuCategoryRepoResult> {
    const conditions: (SQL | undefined)[] = [eq(menuCategories.isActive, true)];

    if (input.id !== undefined) {
      conditions.push(eq(menuCategories.id, input.id));
    }
    if (input.organizationId !== undefined) {
      conditions.push(eq(menuCategories.organizationId, input.organizationId));
    }
    if (input.branchId !== undefined) {
      conditions.push(eq(menuCategories.branchId, input.branchId));
    }

    if (conditions.length === 1) {
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

    conditions.push(eq(menuCategories.isActive, isActive ?? true));

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
      .leftJoin(
        menuItems,
        and(
          eq(menuItems.categoryId, menuCategories.id),
          eq(menuItems.isActive, true),
        ),
      )
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

  async updateCategory(
    input: UpdateMenuCategoryRepoInput,
  ): Promise<UpdateMenuCategoryRepoResult> {
    const [category] = await this.database.client
      .update(menuCategories)
      .set({ ...input.data, updatedAt: new Date() })
      .where(eq(menuCategories.id, input.id))
      .returning();

    if (!category) {
      throw new Error("Failed to update menu category");
    }

    return category;
  }

  async deleteCategory(input: DeleteMenuCategoryRepoInput): Promise<void> {
    const { id, updatedBy } = input;

    await this.database.client.transaction(async (tx) => {
      await tx
        .update(menuCategories)
        .set({ isActive: false, updatedBy, updatedAt: new Date() })
        .where(eq(menuCategories.id, id));

      await tx
        .update(menuItems)
        .set({ isActive: false, updatedBy, updatedAt: new Date() })
        .where(and(eq(menuItems.categoryId, id), eq(menuItems.isActive, true)));
    });
  }

  async findBranchMenuTree(
    input: FindBranchMenuTreeRepoInput,
  ): Promise<FindBranchMenuTreeRepoResult> {
    const categories = await this.database.client
      .select({
        id: menuCategories.id,
        name: menuCategories.name,
        description: menuCategories.description,
        image: menuCategories.image,
        displayOrder: menuCategories.displayOrder,
      })
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.organizationId, input.organizationId),
          eq(menuCategories.branchId, input.branchId),
          eq(menuCategories.isActive, true),
        ),
      )
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));

    if (categories.length === 0) return [];

    const items = await this.database.client
      .select({
        id: menuItems.id,
        categoryId: menuItems.categoryId,
        name: menuItems.name,
        description: menuItems.description,
        price: menuItems.price,
        code: menuItems.code,
        image: menuItems.image,
        takeawayChargeEnabled: menuItems.takeawayChargeEnabled,
        takeawayChargeAmount: menuItems.takeawayChargeAmount,
        isFeatured: menuItems.isFeatured,
        calories: menuItems.calories,
        dietaryType: menuItems.dietaryType,
        hasAlcohol: menuItems.hasAlcohol,
        isSpicy: menuItems.isSpicy,
        displayOrder: menuItems.displayOrder,
      })
      .from(menuItems)
      .where(
        and(
          inArray(
            menuItems.categoryId,
            categories.map((category) => category.id),
          ),
          eq(menuItems.isActive, true),
        ),
      )
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));

    if (items.length === 0) {
      return categories.map((category) => ({ ...category, items: [] }));
    }

    const modifiers = await this.database.client
      .select({
        id: itemModifiers.id,
        menuItemId: itemModifiers.menuItemId,
        name: itemModifiers.name,
        selectionType: itemModifiers.selectionType,
        minSelection: itemModifiers.minSelection,
        maxSelection: itemModifiers.maxSelection,
        displayOrder: itemModifiers.displayOrder,
      })
      .from(itemModifiers)
      .where(
        and(
          inArray(
            itemModifiers.menuItemId,
            items.map((item) => item.id),
          ),
          eq(itemModifiers.isActive, true),
        ),
      )
      .orderBy(asc(itemModifiers.displayOrder), asc(itemModifiers.id));

    const options =
      modifiers.length === 0
        ? []
        : await this.database.client
            .select({
              id: itemModifierOptions.id,
              itemModifierId: itemModifierOptions.itemModifierId,
              name: itemModifierOptions.name,
              price: itemModifierOptions.price,
              isDefault: itemModifierOptions.isDefault,
              displayOrder: itemModifierOptions.displayOrder,
            })
            .from(itemModifierOptions)
            .where(
              and(
                inArray(
                  itemModifierOptions.itemModifierId,
                  modifiers.map((modifier) => modifier.id),
                ),
                eq(itemModifierOptions.isActive, true),
              ),
            )
            .orderBy(
              asc(itemModifierOptions.displayOrder),
              asc(itemModifierOptions.id),
            );

    const modifiersWithOptions = modifiers.map((modifier) => ({
      ...modifier,
      options: options.filter(
        (option) => option.itemModifierId === modifier.id,
      ),
    }));

    return categories.map((category) => ({
      ...category,
      items: items
        .filter((item) => item.categoryId === category.id)
        .map(({ categoryId: _categoryId, ...item }) => ({
          ...item,
          modifiers: modifiersWithOptions
            .filter((modifier) => modifier.menuItemId === item.id)
            .map(({ menuItemId: _menuItemId, ...modifier }) => modifier),
        })),
    }));
  }

  /** Writes the picked categories, items and modifiers in one transaction. */
  async cloneMenu(input: CloneMenuRepoInput): Promise<void> {
    const { organizationId, branchId, userId } = input;

    return this.database.client.transaction(async (tx) => {
      const categoryIdByName = await this.findOrCreateCategories(tx, input);

      for (const category of input.categories) {
        const categoryId = categoryIdByName.get(categoryKey(category.name));
        if (!categoryId) throw new Error("Failed to resolve menu category");

        for (const { modifiers, ...item } of category.items) {
          const [createdItem] = await tx
            .insert(menuItems)
            .values({
              ...item,
              organizationId,
              branchId,
              categoryId,
              isListed: false,
              createdBy: userId,
            })
            .returning({ id: menuItems.id });
          if (!createdItem) throw new Error("Failed to clone menu item");

          for (const { options, ...modifier } of modifiers) {
            const [createdModifier] = await tx
              .insert(itemModifiers)
              .values({
                ...modifier,
                menuItemId: createdItem.id,
                createdBy: userId,
              })
              .returning({ id: itemModifiers.id });
            if (!createdModifier) throw new Error("Failed to clone modifier");

            await tx.insert(itemModifierOptions).values(
              options.map((option) => ({
                ...option,
                itemModifierId: createdModifier.id,
                createdBy: userId,
              })),
            );
          }
        }
      }
    });
  }

  // File order is kept inside each category.
  /** Creates the missing categories and all items in one transaction. */
  async importMenuCsv(input: ImportMenuCsvRepoInput): Promise<void> {
    const { organizationId, branchId, userId, rows } = input;

    return this.database.client.transaction(async (tx) => {
      const categoryIdByName = await this.findOrCreateCategories(tx, {
        organizationId,
        branchId,
        userId,
        categories: rows.map((row) => ({ name: row.categoryName })),
      });

      await tx.insert(menuItems).values(
        rows.map((row, index) => ({
          organizationId,
          branchId,
          categoryId: categoryIdByName.get(
            categoryKey(row.categoryName),
          ) as string,
          name: row.itemName,
          description: row.description ?? null,
          price: String(row.price),
          takeawayChargeEnabled: row.takeawayChargeEnabled,
          takeawayChargeAmount:
            row.takeawayChargeAmount != null
              ? String(row.takeawayChargeAmount)
              : null,
          isFeatured: row.isFeatured,
          isListed: false,
          calories: row.calories != null ? String(row.calories) : null,
          dietaryType: row.dietaryType,
          hasAlcohol: row.hasAlcohol,
          isSpicy: row.isSpicy,
          displayOrder: index,
          createdBy: userId,
        })),
      );
    });
  }

  /**
   * Maps each category name to an id in the branch: an existing category with
   * the same name (ignoring case) is reused, anything else is created unlisted.
   */
  private async findOrCreateCategories(
    tx: Transaction,
    input: FindOrCreateCategoriesInput,
  ): Promise<Map<string, string>> {
    const { organizationId, branchId, userId } = input;
    const incoming = new Map(
      input.categories.map((category) => [
        categoryKey(category.name),
        category,
      ]),
    );

    const existing = await tx
      .select({ id: menuCategories.id, name: menuCategories.name })
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.organizationId, organizationId),
          eq(menuCategories.branchId, branchId),
          eq(menuCategories.isActive, true),
          inArray(sql`lower(trim(${menuCategories.name}))`, [
            ...incoming.keys(),
          ]),
        ),
      );

    const categoryIdByName = new Map(
      existing.map((category) => [categoryKey(category.name), category.id]),
    );
    const missing = [...incoming.entries()].filter(
      ([key]) => !categoryIdByName.has(key),
    );

    if (missing.length > 0) {
      const created = await tx
        .insert(menuCategories)
        .values(
          missing.map(([, category], index) => ({
            organizationId,
            branchId,
            name: category.name.trim(),
            description: category.description ?? null,
            image: category.image ?? null,
            isListed: false,
            displayOrder: index,
            createdBy: userId,
          })),
        )
        .returning({ id: menuCategories.id, name: menuCategories.name });

      for (const category of created) {
        categoryIdByName.set(categoryKey(category.name), category.id);
      }
    }

    return categoryIdByName;
  }

  // ========================================
  // ? MENU ITEM SCHEMA METHODS
  // ========================================
  async findOneItem(
    input: FindOneMenuItemRepoInput,
  ): Promise<FindOneMenuItemRepoResult> {
    const conditions: (SQL | undefined)[] = [eq(menuItems.isActive, true)];

    if (input.id !== undefined) {
      conditions.push(eq(menuItems.id, input.id));
    }
    if (input.organizationId !== undefined) {
      conditions.push(eq(menuItems.organizationId, input.organizationId));
    }
    if (input.branchId !== undefined) {
      conditions.push(eq(menuItems.branchId, input.branchId));
    }

    if (conditions.length === 1) {
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
      eq(menuItems.isActive, true),
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
        await this.insertModifier(tx, item.id, modifier, data.createdBy);
      }

      return item;
    });
  }

  async findItemModifiers(
    input: FindItemModifiersRepoInput,
  ): Promise<FindItemModifiersRepoResult> {
    const modifiers = await this.database.client
      .select()
      .from(itemModifiers)
      .where(
        and(
          eq(itemModifiers.menuItemId, input.menuItemId),
          eq(itemModifiers.isActive, true),
        ),
      )
      .orderBy(asc(itemModifiers.displayOrder), asc(itemModifiers.id));

    if (modifiers.length === 0) return [];

    const options = await this.database.client
      .select()
      .from(itemModifierOptions)
      .where(
        and(
          inArray(
            itemModifierOptions.itemModifierId,
            modifiers.map((modifier) => modifier.id),
          ),
          eq(itemModifierOptions.isActive, true),
        ),
      )
      .orderBy(
        asc(itemModifierOptions.displayOrder),
        asc(itemModifierOptions.id),
      );

    return modifiers.map((modifier) => ({
      ...modifier,
      options: options.filter((o) => o.itemModifierId === modifier.id),
    }));
  }

  async updateItem(
    input: UpdateMenuItemRepoInput,
  ): Promise<UpdateMenuItemRepoResult> {
    const { id, data, modifiers, existingModifiers } = input;

    return this.database.client.transaction(async (tx) => {
      const [item] = await tx
        .update(menuItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();

      if (!item) {
        throw new Error("Failed to update menu item");
      }

      if (modifiers) {
        await this.syncModifiers(
          tx,
          item.id,
          modifiers,
          existingModifiers,
          data.updatedBy,
        );
      }

      return item;
    });
  }

  async updateItemStatus(
    input: UpdateMenuItemStatusRepoInput,
  ): Promise<UpdateMenuItemStatusRepoResult> {
    const [item] = await this.database.client
      .update(menuItems)
      .set({
        isListed: input.isListed,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, input.id))
      .returning();

    if (!item) {
      throw new Error("Failed to update menu item status");
    }

    return item;
  }

  async deleteItem(input: DeleteMenuItemRepoInput): Promise<void> {
    await this.database.client
      .update(menuItems)
      .set({
        isActive: false,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, input.id));
  }

  // ========================================
  // ? MODIFIER HELPERS
  // ========================================
  private async insertModifier(
    tx: Transaction,
    menuItemId: string,
    modifier: CreateItemModifierBodyDto,
    userId: string,
  ): Promise<void> {
    const [createdModifier] = await tx
      .insert(itemModifiers)
      .values({
        menuItemId,
        name: modifier.name,
        selectionType: modifier.selectionType,
        minSelection: modifier.minSelection,
        maxSelection: modifier.maxSelection,
        displayOrder: modifier.displayOrder,
        createdBy: userId,
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
        createdBy: userId,
      })),
    );
  }

  /**
   * Makes the item's active modifiers match `modifiers`: rows sent with an id are
   * updated, rows without one are inserted, and existing rows that were left out
   * are deactivated (not deleted) so past orders can still reference them.
   */
  private async syncModifiers(
    tx: Transaction,
    menuItemId: string,
    modifiers: UpdateItemModifierBodyDto[],
    existingModifiers: ItemModifierWithOptions[],
    userId: string,
  ): Promise<void> {
    const keptModifierIds = new Set(modifiers.map((m) => m.id).filter(Boolean));
    const removedModifierIds = existingModifiers
      .map((m) => m.id)
      .filter((existingId) => !keptModifierIds.has(existingId));

    if (removedModifierIds.length > 0) {
      await tx
        .update(itemModifiers)
        .set({ isActive: false, updatedBy: userId, updatedAt: new Date() })
        .where(inArray(itemModifiers.id, removedModifierIds));
      await tx
        .update(itemModifierOptions)
        .set({ isActive: false, updatedBy: userId, updatedAt: new Date() })
        .where(inArray(itemModifierOptions.itemModifierId, removedModifierIds));
    }

    for (const modifier of modifiers) {
      if (!modifier.id) {
        await this.insertModifier(tx, menuItemId, modifier, userId);
        continue;
      }

      await tx
        .update(itemModifiers)
        .set({
          name: modifier.name,
          selectionType: modifier.selectionType,
          minSelection: modifier.minSelection,
          maxSelection: modifier.maxSelection,
          displayOrder: modifier.displayOrder,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(itemModifiers.id, modifier.id));

      const existingOptions =
        existingModifiers.find((m) => m.id === modifier.id)?.options ?? [];
      await this.syncOptions(
        tx,
        modifier.id,
        modifier.options,
        existingOptions.map((o) => o.id),
        userId,
      );
    }
  }

  private async syncOptions(
    tx: Transaction,
    itemModifierId: string,
    options: UpdateItemModifierOptionBodyDto[],
    existingOptionIds: string[],
    userId: string,
  ): Promise<void> {
    const keptOptionIds = new Set(options.map((o) => o.id).filter(Boolean));
    const removedOptionIds = existingOptionIds.filter(
      (existingId) => !keptOptionIds.has(existingId),
    );

    if (removedOptionIds.length > 0) {
      await tx
        .update(itemModifierOptions)
        .set({ isActive: false, updatedBy: userId, updatedAt: new Date() })
        .where(inArray(itemModifierOptions.id, removedOptionIds));
    }

    const newOptions = options.filter((option) => !option.id);
    if (newOptions.length > 0) {
      await tx.insert(itemModifierOptions).values(
        newOptions.map((option) => ({
          itemModifierId,
          name: option.name,
          price: String(option.price),
          isDefault: option.isDefault,
          displayOrder: option.displayOrder,
          createdBy: userId,
        })),
      );
    }

    for (const option of options) {
      if (!option.id) continue;
      await tx
        .update(itemModifierOptions)
        .set({
          name: option.name,
          price: String(option.price),
          isDefault: option.isDefault ?? false,
          displayOrder: option.displayOrder,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(itemModifierOptions.id, option.id));
    }
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
