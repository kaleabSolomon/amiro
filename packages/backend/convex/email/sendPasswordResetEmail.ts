import { Resend } from "resend";

import { buildPasswordResetEmailTemplate } from "./templates/passwordResetEmail";

type SendPasswordResetEmailInput = {
  to: string;
  userName?: string | null;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: SendPasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;

  if (!apiKey || !from) {
    throw new Error(
      "Missing email config: set RESEND_API_KEY and EMAIL_FROM in Convex env.",
    );
  }

  const resend = new Resend(apiKey);
  const { subject, text, html } = buildPasswordResetEmailTemplate({
    appName: "Amiro",
    userName,
    resetUrl,
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
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
