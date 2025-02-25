import { CheckIcon, XIcon } from "lucide-react";
import { useFetcher } from "react-router";
import { useDoubleCheck } from "~/hooks/use-double-check";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

export function DeleteTodo({ todoId }: { todoId: string }) {
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="todoId" value={todoId} />
      <Button
        type="submit"
        name="intent"
        value="delete"
        variant="destructive"
        size="icon"
        className={cn(
          "size-6 bg-destructive/15 text-destructive/80 hover:text-white",
          { "bg-destructive text-white": doubleCheck },
        )}
        disabled={isDeleting}
        {...getButtonProps()}
      >
        {doubleCheck ? isDeleting ? <Spinner /> : <CheckIcon /> : <XIcon />}
      </Button>
    </fetcher.Form>
  );
}
