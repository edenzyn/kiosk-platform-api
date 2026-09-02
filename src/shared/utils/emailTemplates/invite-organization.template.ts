import { env } from "../../../config/env";

export interface InviteOrganizationTemplateOptions {
  name: string;
  organizationName: string;
  token?: string;
  inviteUrl?: string;
}

export const getInviteOrganizationTemplate = (
  options: InviteOrganizationTemplateOptions,
) => {
  const { name, organizationName, token, inviteUrl } = options;

  const subject = `You're invited to set up ${organizationName} on Kiosk Platform`;
  const baseUrl = env.USER_CLIENT_BASE_URL.replace(/\/$/, "");
  const link =
    inviteUrl || (token ? `${baseUrl}/accept-org-invite?it=${token}` : "#");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Hello ${name},</h2>
      <p>You have been invited to set up <strong>${organizationName}</strong> on Kiosk Platform as its owner.</p>
      <p>Once you accept, your organization will be created and you'll have full control to manage branches, devices, licenses, and your team.</p>
      <p>Please click the button below to accept your invitation and set up your organization:</p>
      <p><a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a></p>
      <p style="font-size: 0.85rem; color: #666;">Or copy and paste this URL into your browser: <br/><code>${link}</code></p>
      <p>Best regards,<br/>Kiosk Platform Team</p>
    </div>
  `;

  const text = `Hello ${name},\n\nYou have been invited to set up ${organizationName} on Kiosk Platform as its owner.\nOnce you accept, your organization will be created and you'll have full control to manage branches, devices, licenses, and your team.\nPlease accept your invitation by visiting: ${link}\n\nBest regards,\nKiosk Platform Team`;

  return { subject, html, text };
};
