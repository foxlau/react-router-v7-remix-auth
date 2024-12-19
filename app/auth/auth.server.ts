import { and, eq, or } from "drizzle-orm";
import {
  createCookieSessionStorage,
  redirect,
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
import { GitHubStrategy } from "./strategies/github";
import { GoogleStrategy } from "./strategies/google";
import { TOTPStrategy } from "./strategies/totp";

type AuthProfile = {
  email: string | undefined;
  display_name?: string;
  avatar_url?: string;
  provider: SelectAccount["provider"];
  provider_account_id?: string;
};

type SessionUser = {
  userId: string;
  sessionId: string;
};

type AuthInterface = Authenticator<SessionUser> & SessionStorage;

export const AUTH_SESSION_KEY = "user";
const AUTH_SESSION_NAME = "__session";
const AUTH_SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

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

export function createAuth(env: Env): AuthInterface {
  const sessionStorage = createCookieSessionStorage({
    cookie: {
      name: AUTH_SESSION_NAME,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secrets: [env.SESSION_SECRET],
      secure: env.ENVIRONMENT === "production",
      maxAge: AUTH_SESSION_MAX_AGE,
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
        const user = await handleUserAuth({
          email,
          provider: "totp",
        });
        const sessionId = await createUserSession(user.id, request);
        return { userId: user.id, sessionId };
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
        const user = await handleUserAuth({
          email: profile._json.email,
          display_name: profile.displayName,
          avatar_url: profile._json.picture,
          provider: "google",
          provider_account_id: profile.id,
        });
        const sessionId = await createUserSession(user.id, request);
        return { userId: user.id, sessionId };
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
        const user = await handleUserAuth({
          email: profile._json.email || profile?.emails[0]?.value,
          display_name: profile.displayName,
          avatar_url: profile._json.avatar_url,
          provider: "github",
          provider_account_id: profile.id,
        });
        const sessionId = await createUserSession(user.id, request);
        return { userId: user.id, sessionId };
      },
    ),
  );

  return Object.assign(authenticator, {
    getSession: sessionStorage.getSession,
    commitSession: sessionStorage.commitSession,
    destroySession: sessionStorage.destroySession,
  });
}

export async function createUserSession(userId: string, request: Request) {
  const expires_at = new Date(Date.now() + AUTH_SESSION_MAX_AGE);
  const user_agent = request.headers.get("user-agent");
  const ip_address = request.headers.get("cf-connecting-ip") || "127.0.0.1";
  const country = request.headers.get("cf-ipcountry") || "Unknown";

  const { id } = await db
    .insert(sessionsTable)
    .values({
      user_id: userId,
      expires_at,
      user_agent,
      ip_address,
      country,
    })
    .returning({ id: sessionsTable.id })
    .get();

  return id;
}

export async function handleUserAuth(profile: AuthProfile) {
  let { email, display_name, avatar_url, provider, provider_account_id } =
    profile;

  if (!email) {
    throw new Error(`Not email address in ${provider} profile`);
  }

  email = email.toLowerCase();
  let username = email.substring(0, email.indexOf("@"));
  display_name = display_name || username;

  // 1. Find existing user and provider
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

  // 2. If user exists and email matches
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

      return { id: existingUser.id };
    }

    // If username is taken, generate a new one
    if (existingUser.username === username) {
      username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  // 3. Create new user
  const { user_id } = await db
    .insert(usersTable)
    .values({ email, username, display_name, avatar_url })
    .returning({ user_id: usersTable.id })
    .get();

  // 4. Create provider association
  await db.insert(accountsTable).values({
    user_id,
    provider,
    provider_account_id: provider_account_id || user_id,
  });

  return { id: user_id };
}

export async function getAuthSession(request: Request) {
  const session = await auth.getSession(request.headers.get("Cookie"));
  const sessionUser = session.get(AUTH_SESSION_KEY);
  return { session, sessionUser };
}

export async function requireSessionUser(
  request: Request,
): Promise<SessionUser> {
  const { session, sessionUser } = await getAuthSession(request);

  const sessionRecord = sessionUser
    ? await db.query.sessionsTable.findFirst({
        where: (sessions, { and, eq, gt }) =>
          and(
            eq(sessions.id, sessionUser.sessionId),
            gt(sessions.expires_at, new Date()),
          ),
        with: {
          user: {
            columns: {
              id: true,
              is_active: true,
            },
          },
        },
        columns: {
          id: true,
        },
      })
    : null;

  if (!sessionRecord?.user || !sessionRecord.user.is_active) {
    throw redirect("/auth/login", {
      headers: {
        "set-cookie": await auth.destroySession(session),
      },
    });
  }

  return { userId: sessionRecord.user.id, sessionId: sessionRecord.id };
}
