import { redirect, type unstable_MiddlewareFunction } from "react-router";
import { auth } from "~/lib/auth/auth.server";
import {
  AUTH_ERROR_REDIRECT_TO,
  AUTH_SUCCESS_REDIRECT_TO,
  querySession,
} from "~/lib/auth/session.server";
import { authSessionContext } from "~/lib/contexts";

export async function getAuthSession(request: Request) {
  return await querySession(request);
}

export const authMiddleware: unstable_MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const { session, validSession } = await getAuthSession(request);

  if (!validSession) {
    throw redirect(AUTH_ERROR_REDIRECT_TO, {
      headers: { "Set-Cookie": await auth.destroySession(session) },
    });
  }

  context.set(authSessionContext, validSession);

  return await next();
};

export const noAuthMiddleware: unstable_MiddlewareFunction = async (
  { request },
  next,
) => {
  const { validSession } = await getAuthSession(request);

  if (validSession) {
    throw redirect(AUTH_SUCCESS_REDIRECT_TO);
  }

  return await next();
};
