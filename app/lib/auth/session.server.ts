import { env } from "cloudflare:workers";
import { redirect, type Session, type SessionData } from "react-router";
import { db } from "../db/drizzle.server";
import { logger } from "../logger";
import { redirectWithToast } from "../toast.server";
import { getErrorMessage } from "../utils";
import { SessionManager } from "../workers/session-manager.server";
import { type AuthUserSession, auth } from "./auth.server";

export const AUTH_USER_KEY = "auth-user";
export const AUTH_SUCCESS_REDIRECT_TO = "/";
export const AUTH_ERROR_REDIRECT_TO = "/auth/login";

/**
 * Authenticate and redirect to home page
 *
 * @param request - The request object
 * @param provider - The authentication provider
 * @param redirectTo - The redirect URL
 * @returns The redirect response
 */
export async function handleAuthSuccess(
	provider: string,
	request: Request,
	redirectTo = AUTH_SUCCESS_REDIRECT_TO,
) {
	const user = await auth.authenticate(provider, request);
	const session = await auth.getSession(request.headers.get("Cookie"));
	session.unset("auth:email");
	session.set(AUTH_USER_KEY, user);

	return redirect(redirectTo, {
		headers: { "Set-Cookie": await auth.commitSession(session) },
	});
}

/**
 * Handle authentication errors
 *
 * @param error - The error object
 * @param provider - The authentication provider
 * @param redirectTo - The redirect URL
 * @returns The redirect response
 */
export async function handleAuthError(
	provider: string,
	error: unknown,
	redirectTo = AUTH_ERROR_REDIRECT_TO,
) {
	if (error instanceof Response) throw error;
	const message = getErrorMessage(error);
	logger.error({ event: "auth_login_error", provider, message });

	throw await redirectWithToast(redirectTo, {
		title: message,
		type: "error",
	});
}

/**
 * Validate session and get user data
 *
 * @param session - The session
 * @param sessionUser - The session user
 * @returns The user data
 */
export async function validateSession(
	session: Session<SessionData, SessionData>,
	sessionUser: AuthUserSession | null,
) {
	if (!sessionUser?.userId || !sessionUser?.sessionId) {
		return null;
	}

	const sessionManager = new SessionManager(env.APP_KV);
	const [user, sessionData] = await Promise.all([
		db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, sessionUser.userId),
			columns: {
				id: true,
				email: true,
				displayName: true,
				avatarUrl: true,
				status: true,
				createdAt: true,
			},
		}),
		sessionManager.getSession(sessionUser.userId, sessionUser.sessionId),
	]);

	// If the user is not active or the session data does not exist
	// destroy the session and redirect to the home page
	if (user?.status !== "active" || !sessionData) {
		throw redirect("/", {
			headers: { "Set-Cookie": await auth.destroySession(session) },
		});
	}

	return {
		session: {
			id: sessionData.sessionId,
		},
		user,
	};
}

/**
 * Get session data from cookie
 *
 * @param request - The request object
 * @returns The session data
 */
export async function getSessionFromCookie(request: Request) {
	const session = await auth.getSession(request.headers.get("Cookie"));
	const sessionUser = session.get(AUTH_USER_KEY);
	return { session, sessionUser: sessionUser ?? null };
}

/**
 * Query current session and validate its status
 *
 * @param request - The request object
 * @returns The session data
 */
export async function querySession(request: Request) {
	const { session, sessionUser } = await getSessionFromCookie(request);
	const validSession = await validateSession(session, sessionUser);
	return { session, validSession };
}

/**
 * Logout user
 *
 * @param request - The request object
 * @param kv - The KV namespace
 * @returns The redirect response
 */
export async function logout(request: Request, kv: KVNamespace) {
	const { session, sessionUser } = await getSessionFromCookie(request);

	if (sessionUser) {
		const sessionManager = new SessionManager(kv);
		await sessionManager.deleteSession(
			sessionUser.userId,
			sessionUser.sessionId,
		);
	}

	return redirect(AUTH_ERROR_REDIRECT_TO, {
		headers: { "Set-Cookie": await auth.destroySession(session) },
	});
}
