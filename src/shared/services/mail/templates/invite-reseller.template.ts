import { env } from "../../../../config/env";

export interface InviteResellerTemplateOptions {
  name: string;
  token?: string;
  inviteUrl?: string;
}

export const getInviteResellerTemplate = (
  options: InviteResellerTemplateOptions,
) => {
  const { name, token, inviteUrl } = options;

  const subject = "You're invited to become a Kiosk Platform reseller";
  const baseUrl = env.USER_CLIENT_BASE_URL.replace(/\/$/, "");
  const link =
    inviteUrl || (token ? `${baseUrl}/reseller/accept-invite?it=${token}` : "#");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Hello ${name},</h2>
      <p>You have been invited to join Kiosk Platform as a <strong>reseller</strong>.</p>
      <p>Once you set up your account, you'll be able to sell licenses to your customers and manage every sale from your own reseller portal.</p>
      <p>Please click the button below to accept your invitation and set up your account:</p>
      <p><a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a></p>
      <p style="font-size: 0.85rem; color: #666;">Or copy and paste this URL into your browser: <br/><code>${link}</code></p>
      <p>Best regards,<br/>Kiosk Platform Team</p>
    </div>
  `;

  const text = `Hello ${name},\n\nYou have been invited to join Kiosk Platform as a reseller.\nOnce you set up your account, you'll be able to sell licenses to your customers and manage every sale from your own reseller portal.\nPlease accept your invitation by visiting: ${link}\n\nBest regards,\nKiosk Platform Team`;

  return { subject, html, text };
};
