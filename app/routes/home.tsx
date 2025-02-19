import { ArrowRightIcon } from "lucide-react";
import { data, Link, href } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: `Home • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  return data({ user });
}

export default function HomeRoute({
  loaderData: { user },
}: Route.ComponentProps) {
  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">
          <span className="mr-2 text-2xl">👋</span> Hi, {user.displayName}!
        </h2>
        <p className="text-base text-muted-foreground">
          Welcome to your dashboard. Here you can manage your todos and account
          settings.
        </p>
      </header>
      <nav>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              to={href("/todos")}
              className="inline-flex w-full items-center justify-between whitespace-nowrap rounded-lg border border-border bg-background p-4 font-bold shadow-sm shadow-black/5 outline-offset-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 sm:h-14"
            >
              <span className="truncate">Manage todos</span>
              <ArrowRightIcon
                size={16}
                strokeWidth={2}
                className="-mr-1 ml-2 shrink-0 opacity-60"
              />
            </Link>
          </li>
          <li>
            <Link
              to={href("/account")}
              className="inline-flex w-full items-center justify-between whitespace-nowrap rounded-lg border border-border bg-background p-4 font-bold shadow-sm shadow-black/5 outline-offset-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 sm:h-14"
            >
              <span className="truncate">Account settings</span>
              <ArrowRightIcon
                size={16}
                strokeWidth={2}
                className="-mr-1 ml-2 shrink-0 opacity-60"
              />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
