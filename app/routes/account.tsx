import { parseWithZod } from "@conform-to/zod";
import { formatDistanceToNow } from "date-fns";
import { eq } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

import { Appearance } from "~/components/account/appearance";
import { DeleteAccount } from "~/components/account/delete-account";
import { SessionManage } from "~/components/account/session-manage";
import { UserProfile } from "~/components/account/user-profile";
import { auth } from "~/lib/auth/auth.server";
import { site } from "~/lib/config";
import { adapterContext, authSessionContext } from "~/lib/contexts";
import { db } from "~/lib/db/drizzle.server";
import { usersTable } from "~/lib/db/schema";
import { accountSchema } from "~/lib/schemas";
import { redirectWithToast } from "~/lib/toast.server";
import { SessionManager } from "~/lib/workers/session-manager.server";
import type { Route } from "./+types/account";

export const meta: Route.MetaFunction = () => [
  { title: `Account • ${site.name}` },
];

// Define the type for a processed session explicitly
export type ProcessedSession = {
  id: string;
  userAgent: string;
  isMobile: boolean;
  ipAddress: string | null;
  country: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export async function loader({ context }: Route.LoaderArgs) {
  const loadContext = context.get(adapterContext);
  const authSession = context.get(authSessionContext);
  const sessionManager = new SessionManager(loadContext.cloudflare.env.APP_KV);
  const sessionsPromise: Promise<ProcessedSession[]> = sessionManager
    .listUserSessions(authSession.user.id)
    .then((sessions) => {
      return sessions.sessions.map((session) => {
        const { browser, device, os } = UAParser(session.userAgent);
        return {
          id: session.sessionId,
          userAgent: `${os.name} · ${browser.name} ${browser.version}`,
          isMobile: device.type === "mobile",
          ipAddress: session.ipAddress ?? null,
          country: session.country ?? null,
          createdAt: formatDistanceToNow(new Date(session.createdAt)),
          isCurrent: session.sessionId === authSession.session.id,
        };
      });
    });

  return { sessionsPromise };
}

export async function action({ request, context }: Route.ActionArgs) {
  const redirectPath = "/account";
  const loadContext = context.get(adapterContext);
  const authSession = context.get(authSessionContext);

  const formData = await request.clone().formData();
  const submission = await parseWithZod(formData, {
    schema: accountSchema.superRefine(async (data, ctx) => {
      if (
        data.intent === "deleteUser" &&
        data.email !== authSession.user.email
      ) {
        ctx.addIssue({
          path: ["email"],
          code: z.ZodIssueCode.custom,
          message:
            "The email address you entered does not match your account's email address.",
        });
        return;
      }
    }),
    async: true,
  });

  if (submission.status !== "success") {
    return redirectWithToast(redirectPath, {
      title:
        submission.error?.email?.[0] ||
        submission.error?.sessionId?.[0] ||
        "Invalid submission. Please try again",
      type: "error",
    });
  }

  const sessionManager = new SessionManager(loadContext.cloudflare.env.APP_KV);

  switch (submission.value.intent) {
    case "signOutSession": {
      if (submission.value.sessionId === authSession.session.id) {
        return redirectWithToast(redirectPath, {
          title: "You cannot sign out your current session",
          type: "error",
        });
      }
      await sessionManager.deleteSession(
        authSession.user.id,
        submission.value.sessionId,
      );
      return redirectWithToast(redirectPath, {
        title: "Session signed out",
        type: "success",
      });
    }
    case "deleteUser": {
      const [, , session] = await Promise.all([
        sessionManager.deleteUserSessions(authSession.user.id),
        db.delete(usersTable).where(eq(usersTable.id, authSession.user.id)),
        auth.getSession(request.headers.get("Cookie")),
      ]);
      return redirectWithToast(
        "/auth/login",
        {
          title: "Your account has been deleted",
          type: "success",
        },
        {
          headers: {
            "Set-Cookie": await auth.destroySession(session),
          },
        },
      );
    }
    default:
      return null;
  }
}

export default function AccountRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="space-y-12">
      <UserProfile />
      <Appearance />
      <SessionManage sessionsPromise={loaderData.sessionsPromise} />
      <DeleteAccount />
    </div>
  );
}
