import { HouseIcon, PlusIcon } from "lucide-react";
import { data, Link, Outlet } from "react-router";
import { ColorSchemeToggle } from "~/components/color-scheme-toggle";
import { buttonVariants } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { UserNav } from "~/components/user-nav";
import { authSessionContext } from "~/lib/contexts";
import { authMiddleware } from "~/lib/middlewares/auth-guard.server";
import type { Route } from "./+types/layout";

export const unstable_middleware = [authMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const authSession = context.get(authSessionContext);
  return data(authSession);
}

export default function Layout() {
  return (
    <>
      <header className="relative flex w-full items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <Link
            to="/home"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <HouseIcon />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/todos"
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                >
                  <PlusIcon />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add todo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ColorSchemeToggle />
          <UserNav />
        </div>
      </header>
      <main className="mx-auto max-w-screen-sm px-6 pt-6 pb-36">
        <Outlet />
      </main>
    </>
  );
}
