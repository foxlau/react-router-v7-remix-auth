import { data, Form, redirect } from "react-router";
import { auth, requireAnonymous } from "~/auth/auth.server";
import { GithubIcon, GoogleIcon } from "~/components/icons";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { useIsPending } from "~/hooks/use-is-pending";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: "Login" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { session } = await requireAnonymous(request);

  return data(
    {
      authEmail: session.get("auth:email"),
      authError: session.get("auth:error"),
    },
    { headers: { "Set-Cookie": await auth.commitSession(session) } },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { session } = await requireAnonymous(request);

  try {
    return await auth.authenticate("totp", request);
  } catch (error) {
    if (error instanceof Response) throw error;
    session.flash(
      "auth:error",
      error instanceof Error ? error.message : "Wow, something went wrong",
    );
    return redirect("/auth/login", {
      headers: { "Set-Cookie": await auth.commitSession(session) },
    });
  }
}

export default function Login({
  loaderData: { authError, authEmail },
}: Route.ComponentProps) {
  const isPending = useIsPending({
    formMethod: "POST",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Welcome back! Please login to continue.
        </p>
      </div>

      <Form method="post" className="grid gap-2">
        {authError && <Alert variant="error">{authError}</Alert>}
        <div className="grid gap-2">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@example.com"
            autoComplete="email"
            defaultValue={authEmail}
            required
          />
        </div>
        <Button
          name="intent"
          value="login"
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? <Spinner /> : "Continue with Email"}
        </Button>
      </Form>

      <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>

      <div className="grid gap-2">
        <Form replace method="post" action="/auth/github">
          <Button
            name="intent"
            value="github"
            variant="outline"
            className="w-full"
            disabled={isPending}
          >
            <GithubIcon className="size-4" />
            Login with GitHub
          </Button>
        </Form>
        <Form replace method="post" action="/auth/google">
          <Button
            name="intent"
            value="google"
            variant="outline"
            className="w-full"
            disabled={isPending}
          >
            <GoogleIcon className="size-4" />
            Login with Google
          </Button>
        </Form>
      </div>

      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="/">Terms of Service</a>{" "}
        and <a href="/">Privacy Policy</a>.
      </div>
    </div>
  );
}
