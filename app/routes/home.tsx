import {
  ArrowRightIcon,
  ListCheckIcon,
  type LucideIcon,
  UserCogIcon,
} from "lucide-react";
import { data, Link } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import type { Route } from "./+types/home";

type NavLink = {
  to: string;
  icon: LucideIcon;
  label: string;
};

export const meta: Route.MetaFunction = () => [
  { title: `Home • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  return data({ user });
}

function NavLinks({ links }: { links: NavLink[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="inline-flex w-full items-center justify-between whitespace-nowrap rounded-lg border border-border bg-background p-4 font-semibold shadow-sm shadow-black/5 outline-offset-2 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 sm:h-14"
          >
            <div className="flex items-center gap-2">
              <link.icon size={20} className="shrink-0 opacity-60" />
              <span className="truncate">{link.label}</span>
            </div>
            <ArrowRightIcon
              size={16}
              className="-mr-1 ml-2 shrink-0 opacity-60"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function HomeRoute({
  loaderData: { user },
}: Route.ComponentProps) {
  const navLinks: NavLink[] = [
    {
      to: "/todos",
      icon: ListCheckIcon,
      label: "Manage todos",
    },
    {
      to: "/account",
      icon: UserCogIcon,
      label: "Account settings",
    },
  ];

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
        <NavLinks links={navLinks} />
      </nav>
    </div>
  );
}
