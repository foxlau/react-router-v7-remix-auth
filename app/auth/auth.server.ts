import { createId } from "@paralleldrive/cuid2";
import { and, eq, or } from "drizzle-orm";
import {
  createCookieSessionStorage,
  redirect,
  type Session,
  type SessionData,
  type SessionStorage,
} from "react-router";
import { Authenticator } from "remix-auth";
import { getSessionContext } from "session-context";

import { db } from "~/database/db.server";
import { lower } from "~/database/helpers";
import {
  accountsTable,
  sessionsTable,
  usersTable,
  type SelectAccount,
} from "~/database/schema";
import { getErrorMessage } from "~/lib/utils";

import { GitHubStrategy } from "./strategies/github";
import { GoogleStrategy } from "./strategies/google";
import { TOTPStrategy } from "./strategies/totp";

// Session user type definition
type AuthProfile = {
  email: string | undefined;
  display_name?: string;
  avatar_url?: string;
  provider: SelectAccount["provider"];
  provider_account_id?: string;
};

// Authentication profile type definition
type SessionUser = {
  user_id: string;
  session_id: string;
};

// Combined type for Authenticator and SessionStorage
type AuthInterface = Authenticator<SessionUser> & SessionStorage;

// Constants for session configuration
export const AUTH_SESSION_KEY = "user";
const AUTH_SESSION_NAME = "__session";
const AUTH_SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

// Create an auth instance with session storage and authentication strategies
export const auth = new Proxy({} as AuthInterface, {
  get(_target, prop: keyof AuthInterface) {
    const store = getSessionContext<{
      authenticator?: AuthInterface;
      env: Env;
    }>();

    if (!store.authenticator) {
      store.authenticator = createAuth(store.env);
    }

    const value = store.authenticator[prop];
    return typeof value === "function"
      ? value.bind(store.authenticator)
      : value;
  },
});

// Create an authentication instance with session storage and strategies
export function createAuth(env: Env): AuthInterface {
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

  const authenticator = new Authenticator<SessionUser>();

  authenticator.use(
    new TOTPStrategy(
      {
        verifyStorage: env.AUTH_VERIFICATION_KV,
        sendTOTP: async ({ email, code }) => {
          if (env.ENVIRONMENT === "development") {
            console.log("sendTOTP", { email, code });
            return;
          }
          // Send code to user ...
        },
      },
      async ({ email, request }) => {
        const user_id = await handleUserAuth({
          email,
          provider: "totp",
        });
        const session_id = await createUserSession(user_id, request);
        return { user_id, session_id };
      },
    ),
  );

  authenticator.use(
    new GoogleStrategy<SessionUser>(
      {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        redirectURI: `${env.APP_URL}/auth/google/callback`,
      },
      async ({ tokens, request }) => {
        const profile = await GoogleStrategy.userProfile(tokens);
        const user_id = await handleUserAuth({
          email: profile._json.email,
          display_name: profile.displayName,
          avatar_url: profile._json.picture,
          provider: "google",
          provider_account_id: profile.id,
        });
        const session_id = await createUserSession(user_id, request);
        return { user_id, session_id };
      },
    ),
  );

  authenticator.use(
    new GitHubStrategy<SessionUser>(
      {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectURI: `${env.APP_URL}/auth/github/callback`,
      },
      async ({ tokens, request }) => {
        const profile = await GitHubStrategy.userProfile(tokens);
        const user_id = await handleUserAuth({
          email: profile._json.email || profile?.emails[0]?.value,
          display_name: profile.displayName,
          avatar_url: profile._json.avatar_url,
          provider: "github",
          provider_account_id: profile.id,
        });
        const session_id = await createUserSession(user_id, request);
        return { user_id, session_id };
      },
    ),
  );

  return Object.assign(authenticator, sessionStorage);
}

// Create a new session for user
export async function createUserSession(user_id: string, request: Request) {
  const expires_at = new Date(Date.now() + AUTH_SESSION_TTL * 1000);
  const user_agent = request.headers.get("user-agent");
  const ip_address = request.headers.get("cf-connecting-ip") || "127.0.0.1";
  const country = request.headers.get("cf-ipcountry") || "Unknown";

  const { id } = await db
    .insert(sessionsTable)
    .values({
      user_id,
      expires_at,
      user_agent,
      ip_address,
      country,
    })
    .returning({ id: sessionsTable.id })
    .get();

  return id;
}

// Handle user authentication and account creation/linking
export async function handleUserAuth(profile: AuthProfile) {
  let { email, display_name, avatar_url, provider, provider_account_id } =
    profile;

  if (!email) {
    throw new Error(`Email is required for ${provider} authentication`);
  }

  email = email.toLowerCase();
  let username = email.substring(0, email.indexOf("@"));
  display_name = display_name || username;

  // Find existing user and provider
  const existingUser = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      is_active: usersTable.is_active,
      provider: accountsTable.provider,
    })
    .from(usersTable)
    .leftJoin(
      accountsTable,
      and(
        eq(usersTable.id, accountsTable.user_id),
        eq(accountsTable.provider, provider),
      ),
    )
    .where(
      or(eq(lower(usersTable.email), email), eq(usersTable.username, username)),
    )
    .get();

  // Handle existing user
  if (existingUser) {
    if (!existingUser.is_active) {
      throw new Error("User is not active");
    }

    // If email matches, update user info (except for TOTP auth)
    if (existingUser.email === email) {
      if (provider !== "totp") {
        await db
          .update(usersTable)
          .set({ avatar_url, display_name })
          .where(eq(usersTable.id, existingUser.id));
      }

      // Add new provider association
      if (existingUser.provider !== provider) {
        await db.insert(accountsTable).values({
          user_id: existingUser.id,
          provider,
          provider_account_id: provider_account_id || existingUser.id,
        });
      }

      return existingUser.id;
    }

    // If username is taken, generate a new one
    if (existingUser.username === username) {
      username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  try {
    const user_id = createId();
    await db.batch([
      db
        .insert(usersTable)
        .values({ id: user_id, email, username, display_name, avatar_url }),
      db.insert(accountsTable).values({
        user_id,
        provider,
        provider_account_id: provider_account_id || user_id,
      }),
    ]);

    return user_id;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("handleUserAuth", message);
    throw new Error("Login failed, please try again");
  }
}

// Validate session and get user data
async function validateSession(
  session: Session<SessionData, SessionData>,
  sessionUser: SessionUser | null,
) {
  if (!sessionUser) return null;

  const sessionRecord = await db.query.sessionsTable.findFirst({
    where: (sessions, { and, eq, gt }) =>
      and(
        eq(sessions.id, sessionUser.session_id),
        gt(sessions.expires_at, new Date()),
      ),
    with: {
      user: {
        columns: {
          id: true,
          is_active: true,
          email: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
    columns: {
      id: true,
      expires_at: true,
    },
  });

  // Delete session if it has expired or user is inactive
  if (!sessionRecord?.user || !sessionRecord.user.is_active) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionUser.session_id));
    throw redirect("/", {
      headers: { "Set-Cookie": await auth.destroySession(session) },
    });
  }

  return {
    session: {
      id: sessionRecord.id,
      expires_at: sessionRecord.expires_at,
    },
    user: sessionRecord.user,
  };
}

// Get session data from cookie
export async function getSessionFromCookie(request: Request) {
  const session = await auth.getSession(request.headers.get("Cookie"));
  const sessionUser = session.get(AUTH_SESSION_KEY);
  return { session, sessionUser: sessionUser || null };
}

// Query current session and validate its status
export async function querySession(request: Request) {
  const { session, sessionUser } = await getSessionFromCookie(request);
  const validSession = await validateSession(session, sessionUser);
  return { session, validSession };
}

// Ensure user is not authenticated (for login/register pages)
export async function requireAnonymous(request: Request, redirectTo = "/home") {
  const { session, validSession } = await querySession(request);

  if (validSession) {
    throw redirect(redirectTo);
  }

  return { session };
}

// Ensure user is authenticated (for protected pages)
export async function requireAuth(
  request: Request,
  redirectTo = "/auth/login",
) {
  const { session, validSession } = await querySession(request);

  if (!validSession) {
    throw redirect(redirectTo, {
      headers: {
        "Set-Cookie": await auth.destroySession(session),
      },
    });
  }

  return validSession;
}
