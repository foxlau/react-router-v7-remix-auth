import { ArrowLeftIcon } from "lucide-react";
import { Link, Outlet } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { noAuthMiddleware } from "~/lib/middlewares/auth-guard.server";

export const unstable_middleware = [noAuthMiddleware];

export async function loader() {
  return null;
}

export default function AuthLayout() {
  return (
    <div className="flex h-screen w-full items-center justify-center px-6">
      <div className="fixed top-6 left-6">
        <Link
          to="/"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
      </div>
      <div className="mx-auto w-full sm:w-[356px]">
        <Outlet />
      </div>
    </div>
  );
}
