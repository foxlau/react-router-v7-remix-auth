import { eq } from "drizzle-orm";
import { redirect } from "react-router";

import { auth, getAuthSession } from "~/auth/auth.server";
import { db } from "~/database/db.server";
import { sessionsTable } from "~/database/schema";
import type { Route } from "./+types/logout";

export async function loader() {
  return redirect("/auth/sign-in");
}

export async function action({ request }: Route.ActionArgs) {
  const { session, sessionUser } = await getAuthSession(request);

  if (sessionUser) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionUser.sessionId));
  }

  return redirect("/auth/login", {
    headers: { "Set-Cookie": await auth.destroySession(session) },
  });
}
