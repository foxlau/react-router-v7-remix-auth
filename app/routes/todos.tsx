import { and, eq } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { data, Form, useNavigation } from "react-router";

import { requireAuth } from "~/auth/auth.server";
import { DeleteTodo, ToggleTodo } from "~/components/todo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { db } from "~/database/db.server";
import { todosTable } from "~/database/schema";
import { useIsPending } from "~/hooks/use-is-pending";
import type { Route } from "./+types/todos";

export const meta: Route.MetaFunction = () => [{ title: "Todos" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const todos = await db.query.todosTable.findMany({
    where: (todo, { eq }) => eq(todo.user_id, user.id),
  });

  return data({ todos });
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.clone().formData();
  const intent = formData.get("intent") as string;
  const title = formData.get("title") as string;
  const todoId = formData.get("todoId") as string;

  // Note that this is a crude implementation.
  switch (intent) {
    case "add":
      if (title.length) {
        await db.insert(todosTable).values({ title, user_id: user.id });
      }
      break;
    case "delete":
      if (todoId.length) {
        await db.delete(todosTable).where(eq(todosTable.id, todoId));
      }
      break;
    case "complete":
      if (todoId.length) {
        const _todo = await db.query.todosTable.findFirst({
          where: and(
            eq(todosTable.id, todoId),
            eq(todosTable.user_id, user.id),
          ),
          columns: { id: true, completed: true },
        });
        if (_todo) {
          await db
            .update(todosTable)
            .set({ completed: _todo.completed ? 0 : 1 })
            .where(
              and(eq(todosTable.id, todoId), eq(todosTable.user_id, user.id)),
            );
        }
      }
      break;
  }

  return null;
}

export default function Todos({
  loaderData: { todos },
  actionData,
}: Route.ComponentProps) {
  const form = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const isAdding = useIsPending({
    formAction: "/todos",
    formMethod: "POST",
  });

  useEffect(() => {
    if (navigation.state === "idle" && actionData === null) {
      form.current?.reset();
    }
  }, [navigation.state, actionData]);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-base font-semibold capitalize">Todo List</h1>
        <p className="text-foreground/70">
          This is a practical case demonstrating the combined use of Cloudflare
          D1 and Drizzle ORM.
        </p>
      </section>

      <section className="space-y-4">
        <Form ref={form} method="post" className="flex items-center gap-2">
          <Input
            type="text"
            name="title"
            placeholder="Drift off into a reverie"
            required
          />
          <Button type="submit" name="intent" value="add" disabled={isAdding}>
            Add
            {isAdding ? <Spinner /> : <PlusIcon />}
          </Button>
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
