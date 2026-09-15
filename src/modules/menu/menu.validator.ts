import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { DietaryTypeEnum } from "../../shared/enums/menu/dietary-type.enum";
import { ItemModifierSelectionTypeEnum } from "../../shared/enums/menu/item-modifier-selection-type.enum";
import { MenuItemSortByEnum } from "../../shared/enums/menu/menu-item-sort-by.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

const MENU_IMAGE_KEY_REGEX = /^[0-9a-f-]{36}\.(png|jpeg|webp)$/;
const menuImageKeySchema = yup
  .string()
  .trim()
  .matches(MENU_IMAGE_KEY_REGEX, "Invalid image")
  .nullable()
  .optional();

const DIETARY_TYPE_VALUES = Object.values(DietaryTypeEnum).filter(
  (value): value is number => typeof value === "number",
);

const displayOrderSchema = yup
  .number()
  .typeError("Display order must be a number")
  .integer("Display order must be an integer")
  .min(0, "Display order cannot be negative")
  .required("Display order is required");

const itemModifierOptionSchema = yup
  .object({
    name: yup
      .string()
      .trim()
      .min(1, "Option name is required")
      .max(100, "Option name must be at most 100 characters")
      .required("Option name is required"),
    price: yup
      .number()
      .typeError("Option price must be a number")
      .min(0, "Option price cannot be negative")
      .required("Option price is required"),
    isDefault: yup.boolean().optional(),
    displayOrder: displayOrderSchema,
  })
  .noUnknown();

// Fixed min/max for the single-select types; MULTIPLE is checked against its options.
const SINGLE_SELECTION_BOUNDS: Partial<
  Record<ItemModifierSelectionTypeEnum, { min: number; max: number }>
> = {
  [ItemModifierSelectionTypeEnum.SINGLE_REQUIRED]: { min: 1, max: 1 },
  [ItemModifierSelectionTypeEnum.SINGLE]: { min: 0, max: 1 },
};

const itemModifierSchema = yup
  .object({
    name: yup
      .string()
      .trim()
      .min(2, "Modifier name must be at least 2 characters")
      .max(100, "Modifier name must be at most 100 characters")
      .required("Modifier name is required"),
    selectionType: yup
      .number()
      .typeError("Selection type must be a number")
      .oneOf(
        Object.values(ItemModifierSelectionTypeEnum).filter(
          (value): value is number => typeof value === "number",
        ),
        "Invalid selection type",
      )
      .required("Selection type is required"),
    minSelection: yup
      .number()
      .typeError("Minimum selection must be a number")
      .integer("Minimum selection must be an integer")
      .min(0, "Minimum selection cannot be negative")
      .required("Minimum selection is required"),
    maxSelection: yup
      .number()
      .typeError("Maximum selection must be a number")
      .integer("Maximum selection must be an integer")
      .min(1, "Maximum selection must be at least 1")
      .required("Maximum selection is required"),
    displayOrder: displayOrderSchema,
    options: yup
      .array()
      .of(itemModifierOptionSchema)
      .min(1, "Each modifier needs at least one option")
      .required("Modifier options are required"),
  })
  .noUnknown()
  .test(
    "modifier-selection-limits",
    "Selection limits don't match the selection type or the number of options",
    function (modifier) {
      if (!modifier?.options?.length) return true;
      const { selectionType, minSelection, maxSelection, options } = modifier;
      const fixed =
        SINGLE_SELECTION_BOUNDS[selectionType as ItemModifierSelectionTypeEnum];

      const isValid = fixed
        ? minSelection === fixed.min && maxSelection === fixed.max
        : minSelection <= maxSelection && maxSelection <= options.length;

      return isValid || this.createError({ path: `${this.path}.maxSelection` });
    },
  )
  .test(
    "modifier-default-options",
    "Too many default options for this modifier's maximum selection",
    function (modifier) {
      if (!modifier?.options?.length) return true;
      const defaultCount = modifier.options.filter((o) => o.isDefault).length;
      return (
        defaultCount <= modifier.maxSelection ||
        this.createError({ path: `${this.path}.options` })
      );
    },
  );

export const MenuValidator = {
  // ========================================
  // ? MENU CATEGORY SCHEMAS
  // ========================================
  createCategory: yup
    .object({
      name: yup
        .string()
        .trim()
        .min(2, "Category name must be at least 2 characters")
        .max(100, "Category name must be at most 100 characters")
        .required("Category name is required"),
      description: yup.string().trim().nullable().optional(),
      image: menuImageKeySchema,
      isListed: yup.boolean().optional(),
      displayOrder: yup
        .number()
        .typeError("Display order must be a number")
        .integer("Display order must be an integer")
        .min(0, "Display order cannot be negative")
        .optional(),
    })
    .noUnknown(),
  getCategoriesQuery: paginationQuerySchema
    .shape({
      isActive: yup.boolean().optional(),
      isListed: yup.boolean().optional(),
      search: yup.string().trim().optional(),
    })
    .noUnknown(),

  // ========================================
  // ? MENU ITEM SCHEMAS
  // ========================================
  createItem: yup
    .object({
      categoryId: yup.string().uuid().required("Category is required"),
      name: yup
        .string()
        .trim()
        .min(2, "Item name must be at least 2 characters")
        .max(100, "Item name must be at most 100 characters")
        .required("Item name is required"),
      description: yup.string().trim().nullable().optional(),
      price: yup
        .number()
        .typeError("Price must be a number")
        .min(0, "Price cannot be negative")
        .required("Price is required"),
      code: yup
        .string()
        .trim()
        .max(100, "Code must be less than 100 characters")
        .nullable()
        .optional(),
      takeawayChargeEnabled: yup.boolean().optional(),
      takeawayChargeAmount: yup
        .number()
        .typeError("Takeaway charge must be a number")
        .min(0, "Takeaway charge cannot be negative")
        .nullable()
        .optional()
        .test(
          "takeaway-charge-amount-required",
          "Takeaway charge amount is required when takeaway charge is enabled",
          function (value) {
            const { takeawayChargeEnabled } = this.parent as {
              takeawayChargeEnabled?: boolean;
            };
            if (!takeawayChargeEnabled) return true;
            return value !== undefined && value !== null;
          },
        ),
      isFeatured: yup.boolean().optional(),
      isListed: yup.boolean().optional(),
      calories: yup
        .number()
        .typeError("Calories must be a number")
        .min(0, "Calories cannot be negative")
        .nullable()
        .optional(),
      dietaryType: yup
        .number()
        .typeError("Dietary type must be a number")
        .oneOf(DIETARY_TYPE_VALUES, "Invalid dietary type")
        .optional(),
      hasAlcohol: yup.boolean().optional(),
      isSpicy: yup.boolean().optional(),
      displayOrder: yup
        .number()
        .typeError("Display order must be a number")
        .integer("Display order must be an integer")
        .min(0, "Display order cannot be negative")
        .optional(),
      image: menuImageKeySchema,
      modifiers: yup.array().of(itemModifierSchema).optional(),
    })
    .noUnknown(),
  // ========================================
  // ? MENU IMAGE SCHEMAS
  // ========================================
  requestImageUpload: yup
    .object({
      contentType: yup.string().required("File content type is required"),
      fileSize: yup
        .number()
        .integer()
        .positive()
        .required("File size is required"),
    })
    .noUnknown(),
  getItemsQuery: paginationQuerySchema
    .shape({
      categoryId: yup.string().uuid().required("Category is required"),
      isListed: yup.boolean().optional(),
      dietaryType: yup
        .number()
        .typeError("Dietary type must be a number")
        .oneOf(DIETARY_TYPE_VALUES, "Invalid dietary type")
        .optional(),
      search: yup.string().trim().optional(),
      sortBy: yup
        .string()
        .oneOf(Object.values(MenuItemSortByEnum), "Invalid sort field")
        .optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
};
