import { redirect } from "react-router";
import { logout } from "~/lib/auth/session.server";
import { adapterContext } from "~/lib/contexts";
import type { Route } from "./+types/logout";

export async function loader() {
  return redirect("/auth/login");
}

export async function action({ request, context }: Route.ActionArgs) {
  const loadContext = context.get(adapterContext);
  return await logout(request, loadContext.cloudflare.env.APP_KV);
}
