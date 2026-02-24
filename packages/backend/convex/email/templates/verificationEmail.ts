type VerificationEmailTemplateInput = {
	appName: string;
	userName?: string | null;
	verificationUrl: string;
};

export function buildVerificationEmailTemplate({
	appName,
	userName,
	verificationUrl,
}: VerificationEmailTemplateInput) {
	const greeting = userName ? `Hi ${userName},` : "Hi,";
	const subject = `Verify your email for ${appName}`;

	const text = [
		greeting,
		"",
		`Please verify your email address for ${appName}.`,
		"",
		`Open this link to verify your email: ${verificationUrl}`,
		"",
		"If you did not create this account, you can ignore this email.",
	].join("\n");

	const html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px;">Verify your email</h1>
  <p style="margin:0 0 16px;">${greeting}</p>
  <p style="margin:0 0 16px;">Please verify your email address for <strong>${appName}</strong>.</p>
  <p style="margin:24px 0;">
    <a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Verify email</a>
  </p>
  <p style="margin:0 0 8px;font-size:13px;color:#555;">If the button does not work, use this link:</p>
  <p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
  <p style="margin:0;font-size:13px;color:#555;">If you did not create this account, you can ignore this email.</p>
</div>
`.trim();

	return { subject, text, html };
}
