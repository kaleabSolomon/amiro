type PasswordResetEmailTemplateInput = {
	appName: string;
	userName?: string | null;
	resetUrl: string;
};

export function buildPasswordResetEmailTemplate({
	appName,
	userName,
	resetUrl,
}: PasswordResetEmailTemplateInput) {
	const greeting = userName ? `Hi ${userName},` : "Hi,";
	const subject = `Reset your ${appName} password`;

	const text = [
		greeting,
		"",
		`We received a request to reset your password for ${appName}.`,
		"",
		`Open this link to set a new password: ${resetUrl}`,
		"",
		"If you did not request this, you can safely ignore this email.",
	].join("\n");

	const html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px;">Reset your password</h1>
  <p style="margin:0 0 16px;">${greeting}</p>
  <p style="margin:0 0 16px;">We received a request to reset your password for <strong>${appName}</strong>.</p>
  <p style="margin:24px 0;">
    <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a>
  </p>
  <p style="margin:0 0 8px;font-size:13px;color:#555;">If the button does not work, use this link:</p>
  <p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
  <p style="margin:0;font-size:13px;color:#555;">If you did not request this, you can safely ignore this email.</p>
</div>
`.trim();

	return { subject, text, html };
}
