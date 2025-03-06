import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Form } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import { GithubIcon, GoogleIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { StatusButton } from "~/components/ui/status-button";
import { useIsPending } from "~/hooks/use-is-pending";
import { auth } from "~/lib/auth/auth.server";
import { checkHoneypot } from "~/lib/auth/honeypot.server";
import { handleAuthError, requireAnonymous } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { loginSchema } from "~/lib/schemas";
import { redirectWithToast } from "~/lib/toast.server";
import { rateLimit } from "~/lib/workers/helpers";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [
  { title: `Login • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  return await requireAnonymous(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.clone().formData();
  await checkHoneypot(context.cloudflare.env, formData);
  const submission = parseWithZod(formData, { schema: loginSchema });

  if (submission.status !== "success") {
    return redirectWithToast("/auth/login", {
      title: "Invalid submission, Please try again",
      type: "error",
    });
  }

  try {
    await requireAnonymous(request);
    await rateLimit(request.headers, { kv: context.cloudflare.env.APP_KV });
    return await auth.authenticate(submission.value.intent, request);
  } catch (error) {
    return await handleAuthError(submission.value.intent, error);
  }
}

export default function LoginRoute() {
  const isLoggingIn = useIsPending({
    formMethod: "POST",
  });

  const [form, { email }] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema });
    },
    constraint: getZodConstraint(loginSchema),
    shouldRevalidate: "onInput",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl">Welcome back!</h1>
        <p className="text-balance text-muted-foreground text-sm">
          Enter your email to continue
        </p>
      </div>

      <Form method="post" className="grid gap-4" {...getFormProps(form)}>
        <HoneypotInputs />
        <label htmlFor={email.id}>
          <span className="sr-only">Email address</span>
          <Input
            {...getInputProps(email, { type: "email" })}
            placeholder="youremail@example.com"
            aria-label="Email address"
            autoComplete="off"
            autoFocus
          />
          {email.errors && (
            <p
              className="mt-2 text-destructive text-xs"
              role="alert"
              aria-live="polite"
            >
              {email.errors.join(", ")}
            </p>
          )}
        </label>
        <StatusButton
          isLoading={isLoggingIn}
          text="Continue with Email"
          name="intent"
          value="totp"
          className="w-full"
          aria-label="Continue with Email"
        />
      </Form>

      <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          OR
        </span>
      </div>

      <Form method="post" reloadDocument className="grid gap-2">
        <Button
          name="intent"
          value="google"
          variant="outline"
          className="w-full"
          aria-label="Continue with Google account"
          disabled={isLoggingIn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <Button
          name="intent"
          value="github"
          variant="outline"
          className="w-full"
          aria-label="Continue with Github account"
          disabled={isLoggingIn}
        >
          <GithubIcon />
          Continue with Github
        </Button>
      </Form>

      <div className="text-balance text-muted-foreground text-xs">
        By continuing, you agree to our{" "}
        <a
          href="/"
          rel="nofollow noreferrer"
          target="_blank"
          className="underline hover:text-primary"
        >
          Terms of Service
        </a>
        {" and "}
        <a
          href="/"
          rel="nofollow noreferrer"
          target="_blank"
          className="underline hover:text-primary"
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
