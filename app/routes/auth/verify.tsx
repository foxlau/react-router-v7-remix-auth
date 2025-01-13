import { data, Form, redirect } from "react-router";
import { auth, AUTH_SESSION_KEY } from "~/auth/auth.server";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { useIsPending } from "~/hooks/use-is-pending";
import type { Route } from "./+types/verify";

export const meta: Route.MetaFunction = () => [{ title: "Verify" }];

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.getSession(request.headers.get("Cookie"));
  const authEmail = session.get("auth:email");
  if (!authEmail) throw redirect("/auth/login");

  return data(
    {
      authEmail,
      authError: session.get("auth:error"),
      authNotice: session.get("auth:notice"),
    },
    { headers: { "Set-Cookie": await auth.commitSession(session) } },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.getSession(request.headers.get("Cookie"));

  try {
    const user = await auth.authenticate("totp", request);
    session.unset("auth:email");
    session.set(AUTH_SESSION_KEY, user);

    return redirect("/home", {
      headers: { "Set-Cookie": await auth.commitSession(session) },
    });
  } catch (error) {
    if (error instanceof Response) throw error;

    session.flash(
      "auth:error",
      error instanceof Error ? error.message : "Wow, something went wrong",
    );

    return redirect("/auth/verify", {
      headers: { "Set-Cookie": await auth.commitSession(session) },
    });
  }
}

export default function Verify({
  loaderData: { authError, authEmail, authNotice },
}: Route.ComponentProps) {
  const isPending = useIsPending({
    formAction: "/auth/verify",
    formMethod: "POST",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Check your inbox!</h1>
        <p className="text-balance text-sm text-muted-foreground">
          A verification code has been sent to{" "}
          <span className="font-medium">{authEmail}</span>
        </p>
      </div>

      <Form method="post" className="grid gap-2">
        {authError && <Alert variant="error">{authError}</Alert>}
        {authNotice && <Alert variant="success">{authNotice}</Alert>}
        <Input
          id="code"
          name="code"
          type="text"
          placeholder="Enter the code"
          autoComplete="code"
          required
        />
        <Button
          name="intent"
          value="verify"
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? <Spinner /> : "Continue"}
        </Button>
      </Form>

      <Form replace method="POST" className="flex w-full flex-col gap-2">
        <p className="text-center text-sm font-normal text-muted-foreground">
          Haven't received the code?
        </p>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          name="intent"
          value="resend"
        >
          Request New Code
        </Button>
      </Form>
    </div>
  );
}
