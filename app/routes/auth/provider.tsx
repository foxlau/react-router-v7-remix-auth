import { redirect } from "react-router";
import { auth, requireAnonymous } from "~/auth/auth.server";
import type { Route } from "./+types/provider";

export async function loader() {
  return redirect("/auth/login");
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAnonymous(request);
  return await auth.authenticate(params.provider, request);
}
