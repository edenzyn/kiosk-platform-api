import * as yup from "yup";
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
      isActive: yup.boolean().optional(),
    })
    .noUnknown(),
  getDevicesQuery: paginationQuerySchema.noUnknown(),
};
