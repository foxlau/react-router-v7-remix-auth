import { HouseIcon, PlusIcon } from "lucide-react";
import { Link, Outlet } from "react-router";

import { ThemeSelector } from "~/components/theme-selector";
import { Button } from "~/components/ui/button";
import { UserNav } from "~/components/user-nav";

export default function Layout() {
  return (
    <>
      <header className="relative flex w-full items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            asChild
          >
            <Link to="/home">
              <HouseIcon />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            asChild
          >
            <Link to="/todos">
              <PlusIcon />
            </Link>
          </Button>
          <ThemeSelector />
          <UserNav />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 pb-36 pt-6">
        <Outlet />
      </main>
    </>
  );
}
