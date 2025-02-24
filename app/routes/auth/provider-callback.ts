import { handleAuthError, handleAuthSuccess } from "~/lib/auth/session.server";
import type { Route } from "./+types/provider-callback";

export async function loader({ request, params }: Route.LoaderArgs) {
  try {
    return await handleAuthSuccess(params.provider, request);
  } catch (error) {
    return await handleAuthError(params.provider, error);
  }
}
