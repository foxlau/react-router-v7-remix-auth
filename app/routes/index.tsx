import { ArrowRightIcon } from "lucide-react";
import { href, Link } from "react-router";

import { ColorSchemeToggle } from "~/components/color-scheme-toggle";
import { GithubIcon, ReactRouterIcon } from "~/components/icons";
import { Button, buttonVariants } from "~/components/ui/button";
import { site } from "~/lib/config";
import { cn } from "~/lib/utils";
import type { Route } from "./+types";

export const meta: Route.MetaFunction = () => {
  return [{ title: site.name }];
};

export default function HomeRoute() {
  return (
    <div className="relative flex h-dvh w-full flex-col bg-background">
      <div className="absolute top-4 right-4 sm:right-10">
        <ColorSchemeToggle />
      </div>
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 sm:px-10">
        <section className="flex flex-col items-center gap-4">
          <ReactRouterIcon theme="light" className="block w-24 dark:hidden" />
          <ReactRouterIcon theme="dark" className="hidden w-24 dark:block" />

          <div className="font-extrabold text-4xl text-primary leading-8 tracking-tight sm:text-5xl sm:leading-10">
            React Router v7 <br /> with Remix auth.
          </div>

          <p className="text-center font-normal text-base opacity-80">
            {site.description}
          </p>

          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link
                to="https://github.com/foxlau/react-router-v7-remix-auth"
                reloadDocument
              >
                <GithubIcon />
                Star on Github
              </Link>
            </Button>
            <Link
              to={href("/auth/login")}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Get Started <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
