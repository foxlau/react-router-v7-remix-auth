import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { and, eq, sql } from "drizzle-orm";
import { data, Form } from "react-router";

import { DeleteTodo } from "~/components/todos/delete-todo";
import { ToggleTodo } from "~/components/todos/toggle-todo";
import { Input } from "~/components/ui/input";
import { StatusButton } from "~/components/ui/status-button";
import { useIsPending } from "~/hooks/use-is-pending";
import { site } from "~/lib/config";
import { db } from "~/lib/db/drizzle.server";
import { todosTable } from "~/lib/db/schema";
import { todoSchema } from "~/lib/schemas";
import { redirectWithToast } from "~/lib/toast.server";
import { requiredAuthContext } from "~/middlewares/auth";
import type { Route } from "./+types/todos";

export const meta: Route.MetaFunction = () => [
	{ title: `Todo List • ${site.name}` },
];

export async function loader({ context }: Route.LoaderArgs) {
	const authSession = context.get(requiredAuthContext);
	return data({
		todos: await db.query.todosTable.findMany({
			where: (todo, { eq }) => eq(todo.userId, authSession.user.id),
		}),
	});
}

export async function action({ request, context }: Route.ActionArgs) {
	const authSession = context.get(requiredAuthContext);
	const formData = await request.clone().formData();
	const submission = parseWithZod(formData, { schema: todoSchema });

	if (submission.status !== "success") {
		return redirectWithToast("/todos", {
			title: "Invalid submission. Please try again",
			type: "error",
		});
	}

	switch (submission.value.intent) {
		case "add": {
			await db.insert(todosTable).values({
				title: submission.value.title,
				userId: authSession.user.id,
			});
			break;
		}
		case "delete": {
			await db
				.delete(todosTable)
				.where(eq(todosTable.id, submission.value.todoId));
			break;
		}
		case "complete": {
			await db
				.update(todosTable)
				.set({
					completed: sql`CASE WHEN completed = 0 THEN 1 ELSE 0 END`,
				})
				.where(
					and(
						eq(todosTable.id, submission.value.todoId),
						eq(todosTable.userId, authSession.user.id),
					),
				);
			break;
		}
		default:
			return redirectWithToast("/todos", {
				title: "Something went wrong",
				type: "error",
			});
	}

	return data(submission.reply({ resetForm: true }));
}

export default function TodosRoute({
	loaderData: { todos },
	actionData,
}: Route.ComponentProps) {
	const isAdding = useIsPending({
		formAction: "/todos",
		formMethod: "POST",
	});

	const [form, { title }] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: todoSchema });
		},
		lastResult: actionData,
		constraint: getZodConstraint(todoSchema),
		shouldRevalidate: "onInput",
	});

	return (
		<div className="space-y-12">
			<header className="space-y-2">
				<h2 className="font-semibold text-base">Todo List</h2>
				<p className="text-muted-foreground">
					This is a practical case demonstrating the combined use of Cloudflare
					D1 and Drizzle ORM.
				</p>
			</header>

			<section className="space-y-4">
				<Form
					method="post"
					className="flex flex-col gap-2"
					{...getFormProps(form)}
				>
					<input type="hidden" name="intent" value="add" />
					<div className="flex items-center gap-2">
						<Input
							placeholder="Enter your todo here"
							aria-label="Enter your todo here"
							autoComplete="off"
							autoFocus
							{...getInputProps(title, { type: "text" })}
						/>
						<StatusButton
							isLoading={isAdding}
							text="Add"
							aria-label="Add todo"
						/>
					</div>
					{title.errors && (
						<p
							className="text-destructive text-xs"
							role="alert"
							aria-live="polite"
						>
							{title.errors.join(", ")}
						</p>
					)}
				</Form>

				{todos?.length > 0 && (
					<div className="divide-y">
						{todos.map((todo) => (
							<div
								key={todo.id}
								className="flex items-center justify-between gap-4 py-4"
							>
								<ToggleTodo todo={todo} />
								<DeleteTodo todoId={todo.id} />
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
