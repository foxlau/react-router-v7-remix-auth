import { parseWithZod } from "@conform-to/zod";
import { format, formatDistanceToNow } from "date-fns";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

import { Appearance } from "~/components/account/appearance";
import { DeleteAccount } from "~/components/account/delete-account";
import { SessionManage } from "~/components/account/session-manage";
import { UserProfile } from "~/components/account/user-profile";
import { auth } from "~/lib/auth/auth.server";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { db } from "~/lib/db/drizzle.server";
import { usersTable } from "~/lib/db/schema";
import { accountSchema } from "~/lib/schemas";
import { redirectWithToast } from "~/lib/toast.server";
import { SessionManager } from "~/lib/workers/session-manager.server";
import type { Route } from "./+types/account";

export const meta: Route.MetaFunction = () => [
  { title: `Account • ${site.name}` },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  const sessionManager = new SessionManager(context.cloudflare.env.APP_KV);
  const sessions = await sessionManager.listUserSessions(user.user.id);

  return data({
    user: {
      email: user.user.email,
      displayName: user.user.displayName,
      avatarUrl: user.user.avatarUrl,
      createdAt: format(new Date(user.user.createdAt), "MMMM d, yyyy"),
    },
    sessions: sessions.sessions.map((session) => {
      const { browser, device, os } = UAParser(session.userAgent);
      return {
        id: session.sessionId,
        userAgent: `${os.name} · ${browser.name} ${browser.version}`,
        isMobile: device.is("mobile"),
        ipAddress: session.ipAddress,
        country: session.country,
        createdAt: formatDistanceToNow(new Date(session.createdAt)),
        isCurrent: session.sessionId === user.session.id,
      };
    }),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const redirectPath = "/account";
  const { user, session } = await requireAuth(request);
  const formData = await request.clone().formData();
  const submission = await parseWithZod(formData, {
    schema: accountSchema.superRefine(async (data, ctx) => {
      if (data.intent === "deleteUser" && data.email !== user.email) {
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

  const sessionManager = new SessionManager(context.cloudflare.env.APP_KV);

  switch (submission.value.intent) {
    case "signOutSession": {
      if (submission.value.sessionId === session.id) {
        return redirectWithToast(redirectPath, {
          title: "You cannot sign out your current session",
          type: "error",
        });
      }
      await sessionManager.deleteSession(user.id, submission.value.sessionId);
      return redirectWithToast(redirectPath, {
        title: "Session signed out",
        type: "success",
      });
    }
    case "deleteUser": {
      const [, , session] = await Promise.all([
        sessionManager.deleteUserSessions(user.id),
        db.delete(usersTable).where(eq(usersTable.id, user.id)),
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
      <UserProfile user={loaderData.user} />
      <Appearance />
      <SessionManage sessions={loaderData.sessions} />
      <DeleteAccount />
    </div>
  );
}
