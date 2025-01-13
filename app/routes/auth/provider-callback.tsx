import { redirect } from "react-router";
import { auth, AUTH_SESSION_KEY } from "~/auth/auth.server";
import type { Route } from "./+types/provider-callback";

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await auth.getSession(request.headers.get("Cookie"));

  try {
    if (params.provider !== "google" && params.provider !== "github") {
      throw new Error("Invalid provider");
    }

    const user = await auth.authenticate(params.provider, request);
    session.set(AUTH_SESSION_KEY, user);

    return redirect("/home", {
      headers: { "Set-Cookie": await auth.commitSession(session) },
    });
  } catch (error) {
    session.flash(
      "auth:error",
      error instanceof Error ? error.message : "Wow, something went wrong",
    );

    return redirect("/auth/login", {
      headers: { "Set-Cookie": await auth.commitSession(session) },
    });
  }
}
