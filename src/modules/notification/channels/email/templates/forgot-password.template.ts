import { env } from "../../../../../config/env";
import { ONE_TIME_TOKEN_CONSTANTS } from "../../../../../shared/constants/one-time-token.constants";

export interface ForgotPasswordTemplateOptions {
  name: string;
  resetLink: string;
}

export const getForgotPasswordTemplate = (
  options: ForgotPasswordTemplateOptions,
) => {
  const { name, resetLink } = options;

  const subject = `Reset your ${env.APP_NAME} password`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for ${env.APP_NAME}.</p>
      <p>
        <a href="${resetLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Reset password</a>
      </p>
      <p style="font-size: 0.85rem; color: #666;">This link expires in ${ONE_TIME_TOKEN_CONSTANTS.RESET_TOKEN_EXPIRY_MINUTES} minutes and can only be used once.</p>
      <p style="font-size: 0.85rem; color: #666;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
      <p>Best regards,<br/>${env.APP_NAME} Team</p>
    </div>
  `;

  const text = `Hi ${name},\n\nWe received a request to reset your password for ${env.APP_NAME}.\n\nReset your password: ${resetLink}\n\nThis link expires in ${ONE_TIME_TOKEN_CONSTANTS.RESET_TOKEN_EXPIRY_MINUTES} minutes and can only be used once.\n\nIf you didn't request this, you can safely ignore this email — your password will not change.`;

  return { subject, html, text };
};
