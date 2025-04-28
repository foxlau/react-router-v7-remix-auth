import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/routes/layout";

type UserType = Awaited<ReturnType<typeof rootLoader>>["data"]["user"];

function isUser(user: UserType) {
  return user && typeof user === "object" && typeof user.id === "string";
}

export function useOptionalUser() {
  const data = useRouteLoaderData<typeof rootLoader>("routes/layout");
  if (!data || !isUser(data.user)) return undefined;
  return data.user;
}

export function useUser() {
  const optionalUser = useOptionalUser();
  if (!optionalUser) throw new Error("No user found.");
  return optionalUser;
}
