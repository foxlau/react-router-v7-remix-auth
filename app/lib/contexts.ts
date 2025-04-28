import { type AppLoadContext, unstable_createContext } from "react-router";
import type { validateSession } from "~/lib/auth/session.server";

export const adapterContext = unstable_createContext<AppLoadContext>();
export const authSessionContext =
  unstable_createContext<
    NonNullable<Awaited<ReturnType<typeof validateSession>>>
  >();
