import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { pinValidator } from "../../shared/validators/pin.validator";

export const DeviceValidator = {
  create: yup.object({
    organizationId: yup.string().uuid().required("Organization ID is required"),
    branchId: yup.string().uuid().required("Branch ID is required"),
    name: yup.string().max(255).required("Device name is required"),
    pin: pinValidator(4, true),
    deviceType: yup
      .number()
      .typeError("Device type must be a number")
      .integer("Device type must be an integer")
      .oneOf(
        Object.values(DeviceTypeEnum).filter(
          (v): v is number => typeof v === "number",
        ),
        "Invalid device type",
      )
      .required("Device type is required"),
  }),
  update: yup
    .object({
      id: yup.string().uuid().required("Device ID is required"),
      branchId: yup.string().uuid().optional(),
      deviceCode: yup.string().max(255).nullable().optional(),
      name: yup.string().max(255).nullable().optional(),
      pin: pinValidator(4, false),
      deviceType: yup
        .number()
        .typeError("Device type must be a number")
        .integer("Device type must be an integer")
        .oneOf(
          Object.values(DeviceTypeEnum).filter(
            (v): v is number => typeof v === "number",
          ),
          "Invalid device type",
        )
        .nullable()
        .optional(),
    })
    .noUnknown(),
  toggleStatus: yup
    .object({
      id: yup.string().uuid().required("Device ID is required"),
    })
    .noUnknown(),
  mapTerminal: yup
    .object({
      id: yup.string().uuid().required("Device ID is required"),
      terminalId: yup
        .string()
        .trim()
        .max(100, "Terminal ID cannot exceed 100 characters")
        .nullable()
        .transform((value) => (value ? value : null))
        .defined(),
    })
    .noUnknown(),
  getDevicesQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional(),
      type: yup
        .number()
        .typeError("Device type must be a number")
        .integer("Device type must be an integer")
        .oneOf(
          Object.values(DeviceTypeEnum).filter(
            (v): v is number => typeof v === "number",
          ),
          "Invalid device type",
        )
        .optional(),
      branchId: yup.string().uuid().optional(),
      isActive: yup.boolean().optional(),
      sortBy: yup.string().optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
};
