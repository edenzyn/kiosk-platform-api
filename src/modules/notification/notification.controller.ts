import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { NotificationValidator } from "./notification.validator";
import type { NotificationService } from "./notification.service";
import type { VerifyWebhookQueryDto } from "./notification.types";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  verifyWebhook = async (req: Request, res: Response): Promise<void> => {
    const query = (await NotificationValidator.verifyWebhookQuery.validate(
      req.query,
      { abortEarly: false },
    )) as VerifyWebhookQueryDto;

    const isValid = this.notificationService.verifyWhatsAppChallenge(
      query["hub.mode"],
      query["hub.verify_token"],
    );

    if (!isValid) {
      res.sendStatus(HttpStatusCodes.FORBIDDEN);
      return;
    }

    res.status(HttpStatusCodes.OK).send(query["hub.challenge"]);
  };

  receiveWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const isValid = this.notificationService.verifyWhatsAppSignature(
      req.rawBody,
      signature,
    );

    if (!isValid) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    await this.notificationService.handleWhatsAppWebhookEvent(req.body);
    res.sendStatus(HttpStatusCodes.OK);
  };
}
