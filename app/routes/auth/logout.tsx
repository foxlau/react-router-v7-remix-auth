import { eq } from "drizzle-orm";
import { redirect } from "react-router";

import { auth, getSessionFromCookie } from "~/auth/auth.server";
import { db } from "~/database/db.server";
import { sessionsTable } from "~/database/schema";
import type { Route } from "./+types/logout";

export async function loader() {
  return redirect("/auth/login");
}

export async function action({ request }: Route.ActionArgs) {
  const { session, sessionUser } = await getSessionFromCookie(request);

  if (sessionUser) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionUser.session_id));
  }

  return redirect("/auth/login", {
    headers: { "Set-Cookie": await auth.destroySession(session) },
  });
}
