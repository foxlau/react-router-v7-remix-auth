import { redirect } from "react-router";
import { logout } from "~/lib/auth/session.server";
import type { Route } from "./+types/logout";

export async function loader() {
  return redirect("/auth/login");
}

export async function action({ request, context }: Route.ActionArgs) {
  return await logout(request, context.cloudflare.env.APP_KV);
}
