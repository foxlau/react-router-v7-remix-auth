import { redirect } from "react-router";
import { auth, getAuthSession } from "~/auth/auth.server";
import type { Route } from "./+types/provider";

export async function loader() {
  return redirect("/auth/login");
}

export async function action({ request, params }: Route.ActionArgs) {
  const { sessionUser } = await getAuthSession(request);

  if (sessionUser) {
    throw redirect("/home");
  }

  return await auth.authenticate(params.provider, request);
}
