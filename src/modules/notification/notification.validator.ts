import * as yup from "yup";

export const NotificationValidator = {
  verifyWebhookQuery: yup
    .object({
      "hub.mode": yup.string().required(),
      "hub.verify_token": yup.string().required(),
      "hub.challenge": yup.string().required(),
    })
    .noUnknown(),
};
