import { useState } from "react";
import { useFetcher } from "react-router";
import { cn } from "~/lib/utils";
import type { loader } from "~/routes/todos";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

export function ToggleTodo({
	todo,
}: {
	todo: Awaited<ReturnType<typeof loader>>["data"]["todos"][number];
}) {
	const [checked, setChecked] = useState(todo.completed === 1);
	const fetcher = useFetcher();

	return (
		<Label className="flex items-center gap-2">
			<Checkbox
				name="completed"
				className="rounded"
				checked={checked}
				onClick={() => {
					setChecked((prevIsChecked) => prevIsChecked !== true);
					const formData = new FormData();
					formData.append("todoId", todo.id.toString());
					formData.append("intent", "complete");
					fetcher.submit(formData, {
						method: "POST",
					});
				}}
			/>
			<span
				className={cn("font-medium", {
					"text-muted-foreground line-through": checked,
				})}
			>
				{todo.title}
			</span>
		</Label>
	);
}
