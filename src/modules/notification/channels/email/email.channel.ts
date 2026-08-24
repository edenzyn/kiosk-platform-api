import type { Transporter } from "nodemailer";
import { env } from "../../../../config/env";
import type { SendMailOptions } from "../../../../shared/queue/email/email.queue";

export type { SendMailOptions };

export class EmailChannel {
  constructor(private readonly mailTransporter: Transporter) {}

  async sendMail(options: SendMailOptions): Promise<void> {
    await this.mailTransporter.sendMail({
      from: options.from || env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
