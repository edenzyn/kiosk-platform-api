import type { Transporter } from "nodemailer";
import { env } from "../../../config/env";

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailProvider {
  constructor(private readonly mailTransporter: Transporter) {}

  async sendMail(options: SendMailInput): Promise<void> {
    await this.mailTransporter.sendMail({
      from: options.from || env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
