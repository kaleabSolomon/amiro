import { Resend } from "resend";

import { buildVerificationEmailTemplate } from "./templates/verificationEmail";

type SendVerificationEmailInput = {
	to: string;
	userName?: string | null;
	verificationUrl: string;
};

export async function sendVerificationEmail({
	to,
	userName,
	verificationUrl,
}: SendVerificationEmailInput) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;
	const replyTo = process.env.EMAIL_REPLY_TO;

	if (!apiKey || !from) {
		throw new Error(
			"Missing email config: set RESEND_API_KEY and EMAIL_FROM in Convex env.",
		);
	}

	const resend = new Resend(apiKey);

	const { subject, text, html } = buildVerificationEmailTemplate({
		appName: "Amiro",
		userName,
		verificationUrl,
	});

	const { error } = await resend.emails.send({
		from,
		to,
		replyTo: replyTo ?? undefined,
		subject,
		text,
		html,
	});

	if (error) {
		throw new Error(`Failed to send verification email: ${error.message}`);
	}
}
