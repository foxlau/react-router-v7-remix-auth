import { env } from "cloudflare:workers";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { createCookieSessionStorage, type SessionStorage } from "react-router";
import { Authenticator } from "remix-auth";

import { db } from "../db/drizzle.server";
import { accountsTable, type InsertAccount, usersTable } from "../db/schema";
import { sendAuthTotpEmail } from "../email/email.server";
import { validateEmail } from "../email/email-validator.server";
import { logger } from "../logger";
import { getErrorMessage } from "../utils";
import { SessionManager } from "../workers/session-manager.server";
import { GitHubStrategy } from "./strategies/github";
import { GoogleStrategy } from "./strategies/google";
import { TOTPStrategy } from "./strategies/totp";

// Auth user session type definition
export type AuthUserSession = {
	userId: string;
	sessionId: string;
};

// Auth profile type definition
type AuthProfile = {
	email: string | undefined;
	displayName?: string;
	avatarUrl?: string;
	provider: InsertAccount["provider"];
	providerAccountId?: string;
};

// Combined type for Authenticator and SessionStorage
type AuthInterface = Authenticator<AuthUserSession> & SessionStorage;

// Constants for session configuration
const AUTH_SESSION_NAME = "__auth-session";
const AUTH_SESSION_TTL = 60 * 60 * 24 * 15; // 15 days
export const AUTH_TOTP_PERIOD = 60 * 10; // Totp expire time (10 minutes)

// Create session storage
const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: AUTH_SESSION_NAME,
		path: "/",
		sameSite: "lax",
		httpOnly: true,
		secrets: [env.SESSION_SECRET ?? "s3cr3t"],
		secure: process.env.NODE_ENV === "production",
		maxAge: AUTH_SESSION_TTL,
	},
});

// Initialize Authenticator
const authenticator = new Authenticator<AuthUserSession>();

// Common session parameters getter
const getSessionParams = (request: Request) => ({
	userAgent: request.headers.get("user-agent") || "Unknown",
	country: request.headers.get("cf-ipcountry") || "Unknown",
	ipAddress: request.headers.get("cf-connecting-ip") || "127.0.0.1",
	createdAt: Date.now(),
	expiresAt: Date.now() + AUTH_SESSION_TTL * 1000,
});

// Initialize Session Manager and environment flag
const sessionManager = new SessionManager(env.APP_KV, AUTH_SESSION_TTL);
const isDevelopment = env.ENVIRONMENT === "development";

// Configure TOTP Strategy
authenticator.use(
	new TOTPStrategy(
		{
			kv: env.APP_KV,
			validateEmail: async (email) => {
				return await validateEmail(email);
			},
			sendTOTP: async ({ email, code }) => {
				if (isDevelopment) {
					return logger.info({ event: "totp_send", email, code });
				}
				await sendAuthTotpEmail({ env, email, code });
			},
		},
		async ({ email, request }) => {
			const userId = await handleUserAuth({
				email,
				provider: "totp",
			});
			const sessionId = await sessionManager.createSession({
				userId,
				...getSessionParams(request),
			});
			return { userId, sessionId };
		},
	),
);

// Configure Google Strategy
authenticator.use(
	new GoogleStrategy<AuthUserSession>(
		{
			clientId: env.GOOGLE_CLIENT_ID || "",
			clientSecret: env.GOOGLE_CLIENT_SECRET || "",
			redirectURI: `${env.APP_URL}/auth/google/callback`,
		},
		async ({ tokens, request }) => {
			const profile = await GoogleStrategy.userProfile(tokens);
			const userId = await handleUserAuth({
				email: profile._json.email,
				displayName: profile.displayName,
				avatarUrl: profile._json.picture,
				provider: "google",
				providerAccountId: profile.id,
			});
			const sessionId = await sessionManager.createSession({
				userId,
				...getSessionParams(request),
			});
			return { userId, sessionId };
		},
	),
);

// Configure GitHub Strategy
authenticator.use(
	new GitHubStrategy<AuthUserSession>(
		{
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
			redirectURI: `${env.APP_URL}/auth/github/callback`,
		},
		async ({ tokens, request }) => {
			const profile = await GitHubStrategy.userProfile(tokens);
			const userId = await handleUserAuth({
				email: profile._json.email || profile?.emails[0]?.value,
				displayName: profile.displayName,
				avatarUrl: profile._json.avatar_url,
				provider: "github",
				providerAccountId: profile.id,
			});
			const sessionId = await sessionManager.createSession({
				userId,
				...getSessionParams(request),
			});
			return { userId, sessionId };
		},
	),
);

// Export the combined auth object
export const auth: AuthInterface = Object.assign(authenticator, sessionStorage);

/**
 * Handle user authentication and account creation/linking
 *
 * @param profile - The authentication profile
 * @returns The user ID
 */
export async function handleUserAuth(profile: AuthProfile) {
	let { email, displayName, avatarUrl, provider, providerAccountId } = profile;

	if (!email) {
		throw new Error(`Email is required for ${provider} authentication`);
	}

	email = email.toLowerCase();
	let username = email
		.substring(0, email.indexOf("@"))
		.replace(/[^0-9a-z]/g, "_");
	displayName = displayName || username;

	// Check if user exists
	const existingUser = await db
		.select({
			id: usersTable.id,
			email: usersTable.email,
			status: usersTable.status,
			provider: accountsTable.provider,
		})
		.from(usersTable)
		.leftJoin(
			accountsTable,
			and(
				eq(usersTable.id, accountsTable.userId),
				eq(accountsTable.provider, provider),
			),
		)
		.where(eq(usersTable.email, email))
		.get();

	// Handle existing user
	if (existingUser) {
		if (existingUser.status !== "active") {
			throw new Error("User is not active");
		}

		// If email matches, update user info (except for TOTP auth)
		if (existingUser.email === email) {
			if (provider !== "totp") {
				await db
					.update(usersTable)
					.set({ avatarUrl, displayName })
					.where(eq(usersTable.id, existingUser.id));
			}

			// Add new provider association
			if (existingUser.provider !== provider) {
				await db.insert(accountsTable).values({
					userId: existingUser.id,
					provider,
					providerAccountId: providerAccountId || existingUser.id,
				});
			}

			return existingUser.id;
		}
	}

	// Check if the username is already taken
	const userId = createId();
	const usernameCheck = await db
		.select({ username: usersTable.username })
		.from(usersTable)
		.where(eq(usersTable.username, username))
		.get();

	if (usernameCheck) {
		username = `${username}_${userId.slice(0, 6)}`;
	}

	// Create new user and provider association
	try {
		await db.batch([
			db
				.insert(usersTable)
				.values({ id: userId, email, username, displayName, avatarUrl }),
			db.insert(accountsTable).values({
				userId,
				provider,
				providerAccountId: providerAccountId || userId,
			}),
		]);

		return userId;
	} catch (error) {
		const message = getErrorMessage(error);
		logger.error({ event: "auth_user_create_error", message });
		throw new Error("Login failed, please try again");
	}
}
