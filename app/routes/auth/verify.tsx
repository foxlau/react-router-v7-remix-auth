import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { data, Form, Link, redirect, useSubmit } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import { Input } from "~/components/ui/input";
import { StatusButton } from "~/components/ui/status-button";
import { useIsPending } from "~/hooks/use-is-pending";
import { auth } from "~/lib/auth/auth.server";
import { checkHoneypot } from "~/lib/auth/honeypot.server";
import { handleAuthError, handleAuthSuccess } from "~/lib/auth/session.server";
import { site } from "~/lib/config";
import { verifySchema } from "~/lib/schemas";
import type { Route } from "./+types/verify";

export const meta: Route.MetaFunction = () => [
	{ title: `Verify • ${site.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
	const session = await auth.getSession(request.headers.get("Cookie"));
	const authEmail = session.get("auth:email");
	if (!authEmail) throw redirect("/auth/login");

	const headers = { "Set-Cookie": await auth.commitSession(session) };
	return data({ authEmail }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.clone().formData();
	await checkHoneypot(context.cloudflare.env, formData);
	try {
		return await handleAuthSuccess("totp", request);
	} catch (error) {
		return await handleAuthError("totp", error, "/auth/verify");
	}
}

export default function VerifyRoute({
	loaderData: { authEmail },
}: Route.ComponentProps) {
	const submit = useSubmit();
	const isVerifying = useIsPending({
		formMethod: "POST",
	});

	const [form, { code }] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: verifySchema });
		},
		constraint: getZodConstraint(verifySchema),
		shouldRevalidate: "onInput",
	});

	const resend = (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault();
		const formData = new FormData();
		formData.set("intent", "resend");
		submit(formData, { method: "post" });
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-xl">Check your inbox</h1>
				<p className="text-balance text-sm">
					<span className="text-muted-foreground">
						Enter the verification code we just sent to
					</span>{" "}
					{authEmail}
				</p>
			</div>

			<Form method="post" className="grid gap-4" {...getFormProps(form)}>
				<HoneypotInputs />
				<label htmlFor={code.id}>
					<span className="sr-only">Enter login code</span>
					<Input
						{...getInputProps(code, { type: "text" })}
						placeholder="Enter login code"
						aria-label="Enter login code"
						autoComplete="off"
						autoFocus
					/>
					{code.errors && (
						<p
							className="mt-2 text-destructive text-xs"
							role="alert"
							aria-live="polite"
						>
							{code.errors.join(", ")}
						</p>
					)}
				</label>
				<StatusButton
					isLoading={isVerifying}
					name="intent"
					value="verify"
					text="Continue"
					loadingText="Continuing..."
					className="w-full"
					aria-label="Continue"
				/>
			</Form>

			<p className="text-balance text-muted-foreground text-xs">
				No code received?{" "}
				<a
					href="/auth/verify"
					className="underline hover:text-primary"
					aria-label="Resend code"
					onClick={resend}
				>
					Resend
				</a>
				{" or "}
				<Link
					to="/auth/login"
					className="underline hover:text-primary"
					aria-label="Change email"
				>
					change email
				</Link>
			</p>
		</div>
	);
}
