import { env } from "../../../config/env";

export interface InviteUserTemplateOptions {
  name: string;
  token?: string;
  inviteUrl?: string;
  roleNames?: string[];
  organizationName?: string;
}

export const getInviteUserTemplate = (options: InviteUserTemplateOptions) => {
  const { name, token, inviteUrl, organizationName } = options;
  const orgName = organizationName || "Kiosk Platform";

  const subject = `You're invited to join ${orgName}`;
  const baseUrl = env.USER_CLIENT_BASE_URL.replace(/\/$/, "");
  const link =
    inviteUrl || (token ? `${baseUrl}/accept-invite?it=${token}` : "#");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Hello ${name},</h2>
      <p>You have been invited to join <strong>${orgName}</strong>.</p>
      <p>Please click the button below to accept your invitation and set up your account:</p>
      <p><a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a></p>
      <p style="font-size: 0.85rem; color: #666;">Or copy and paste this URL into your browser: <br/><code>${link}</code></p>
      <p>Best regards,<br/>Kiosk Platform Team</p>
    </div>
  `;

  const text = `Hello ${name},\n\nYou have been invited to join ${orgName}.\nPlease accept your invitation by visiting: ${link}\n\nBest regards,\nKiosk Platform Team`;

  return { subject, html, text };
};
