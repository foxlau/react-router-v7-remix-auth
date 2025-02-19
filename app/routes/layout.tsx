import { HouseIcon, PlusIcon } from "lucide-react";
import { Link, Outlet, href } from "react-router";
import { ColorSchemeToggle } from "~/components/color-scheme-toggle";
import { buttonVariants } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { UserNav } from "~/components/user-nav";

export default function Layout() {
  return (
    <>
      <header className="relative flex w-full items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <Link
            to={href("/home")}
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
                  to={href("/todos")}
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
      <main className="mx-auto max-w-screen-sm px-6 pb-36 pt-6">
        <Outlet />
      </main>
    </>
  );
}
