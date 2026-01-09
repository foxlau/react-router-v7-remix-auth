import type { MiddlewareFunction } from "react-router";
import { createContext, href, redirect } from "react-router";
import { safeRedirectPath } from "~/lib/safe-redirect";
import { querySession, type validateSession } from "../lib/auth/session.server";

// Protected routes
const PROTECTED_ROUTES = ["/admin", "/account", "/todos"] as const;

// Guest only routes
const GUEST_ONLY_ROUTES = ["/auth/login"] as const;

function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isGuestOnlyRoute(pathname: string): boolean {
	return GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

export type AuthSession = Awaited<ReturnType<typeof validateSession>>;
export const optionalAuthContext = createContext<AuthSession>(null);
export const requiredAuthContext = createContext<NonNullable<AuthSession>>();

export async function getAuthSession(request: Request) {
	return await querySession(request);
}

export const authMiddleware: MiddlewareFunction = async (
	{ request, context },
	next,
) => {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const { validSession } = await getAuthSession(request);

	// 1. Guest only routes
	if (isGuestOnlyRoute(pathname)) {
		if (validSession) {
			throw redirect(href("/"));
		}
		context.set(optionalAuthContext, null);
		return next();
	}

	// 2. Protected routes
	if (isProtectedRoute(pathname)) {
		if (!validSession) {
			const fullPath = pathname + url.search;
			const safe = safeRedirectPath(fullPath, "/");
			const redirectTo = encodeURIComponent(safe);
			throw redirect(`${href("/auth/login")}?redirectTo=${redirectTo}`);
		}
		context.set(optionalAuthContext, validSession);
		context.set(requiredAuthContext, validSession); // Ensure not null
		return next();
	}

	// 3. Public routes
	context.set(optionalAuthContext, validSession); // May be null
	return next();
};
