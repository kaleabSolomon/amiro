import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { sendPasswordResetEmail } from "./email/sendPasswordResetEmail";
import { sendVerificationEmail } from "./email/sendVerificationEmail";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
	const googleClientId = process.env.GOOGLE_CLIENT_ID;
	const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

	return betterAuth({
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		...(googleClientId && googleClientSecret
			? {
					socialProviders: {
						google: {
							clientId: googleClientId,
							clientSecret: googleClientSecret,
						},
					},
				}
			: {}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				await sendPasswordResetEmail({
					to: user.email,
					userName: user.name,
					resetUrl: url,
				});
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			sendOnSignIn: true,
			sendVerificationEmail: async ({ user, url }) => {
				await sendVerificationEmail({
					to: user.email,
					userName: user.name,
					verificationUrl: url,
				});
			},
		},
		session: {
			// Keep persistent sessions for 30 days when rememberMe=true.
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
		},
		plugins: [
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true,
			}),
		],
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.safeGetAuthUser(ctx);
	},
});
