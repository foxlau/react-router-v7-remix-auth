import { and, eq, ne } from "drizzle-orm";
import { data, redirect } from "react-router";

import { requireSessionUser } from "~/auth/auth.server";
import { ConnectedAccountItem, DeleteAccount } from "~/components/account";
import { Separator } from "~/components/separator";
import { RevokeOtherSessions, SessionItem } from "~/components/session";
import { db } from "~/database/db.server";
import { sessionsTable, usersTable } from "~/database/schema";
import { useUser } from "~/hooks/use-user";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [{ title: "Home" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { userId, sessionId } = await requireSessionUser(request);

  const [accounts, sessions] = await Promise.all([
    db.query.accountsTable.findMany({
      where: (table, { eq }) => eq(table.user_id, userId),
    }),
    db.query.sessionsTable.findMany({
      where: (table, { eq }) => eq(table.user_id, userId),
    }),
  ]);

  return data({
    accounts,
    sessions,
    currentAuthSessionId: sessionId,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { userId, sessionId } = await requireSessionUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "revokeOtherSessions":
      {
        await db
          .delete(sessionsTable)
          .where(
            and(
              eq(sessionsTable.user_id, userId),
              ne(sessionsTable.id, sessionId),
            ),
          );
      }
      break;
    case "deleteUser": {
      await db.delete(usersTable).where(eq(usersTable.id, userId));
      break;
    }
    default:
      throw new Error("Invalid intent");
  }

  return redirect("/home");
}

export default function Home({
  loaderData: { accounts, sessions, currentAuthSessionId },
}: Route.ComponentProps) {
  const user = useUser();

  return (
    <div className="space-y-8">
      {/* User Info */}
      <section className="space-y-2">
        <h1 className="text-base font-semibold capitalize">
          {user.display_name}
        </h1>
        <p className="text-foreground/70">{user.email}</p>
      </section>

      <Separator />

      {/* Connected Accounts */}
      <section className="space-y-4">
        <h2 className="font-semibold">Connected accounts</h2>
        <div className="space-y-4">
          {accounts.map((account) => (
            <ConnectedAccountItem
              key={account.id}
              account={account}
              email={user.email}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* Recent Sessions */}
      <section className="space-y-4">
        <h2 className="font-semibold">Recent sessions</h2>
        <p className="text-foreground/70">
          If necessary, you can sign out of all other browser sessions. Some of
          your recent sessions are listed below, but this list may not be
          complete. If you think your account has been compromised, you should
          also update your password.
        </p>
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isCurrentAuthSession={currentAuthSessionId === session.id}
            />
          ))}
        </div>
        {sessions.length > 1 && <RevokeOtherSessions />}
      </section>

      <Separator />

      {/* Delete Account */}
      <DeleteAccount />
    </div>
  );
}
