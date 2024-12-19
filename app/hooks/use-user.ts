import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";

function isUser(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  user: any,
): user is Awaited<ReturnType<typeof rootLoader>>["data"]["user"] {
  return user && typeof user === "object" && typeof user.id === "string";
}

export function useOptionalUser() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  if (!data || !isUser(data.user)) return undefined;
  return data.user;
}

export function useUser() {
  const optionalUser = useOptionalUser();
  if (!optionalUser) throw new Error("No user found in root loader.");
  return optionalUser;
}
