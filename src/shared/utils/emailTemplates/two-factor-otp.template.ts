export interface TwoFactorOtpTemplateOptions {
  code: string;
}

export const getTwoFactorOtpTemplate = (
  options: TwoFactorOtpTemplateOptions,
) => {
  const { code } = options;

  const subject = "Your verification code";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Your verification code</h2>
      <p>Use the code below to continue. It expires in 10 minutes.</p>
      <p style="font-size: 1.75rem; font-weight: bold; letter-spacing: 4px; background-color: #f1f5f9; padding: 12px 20px; border-radius: 8px; display: inline-block;">${code}</p>
      <p style="font-size: 0.85rem; color: #666;">If you didn't request this code, you can safely ignore this email.</p>
      <p>Best regards,<br/>Kiosk Platform Team</p>
    </div>
  `;

  const text = `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`;

  return { subject, html, text };
};
