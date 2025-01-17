import { useFetcher } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { StatusButton } from "../ui/status-button";

export function DeleteAccount() {
  const fetcher = useFetcher();
  const isPending = fetcher.state !== "idle";

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-base font-semibold">Delete account</h2>
        <p className="text-muted-foreground">
          Once you delete your account, you will not be able to sign in again.
          You will also lose access to your account and any data associated with
          it.
        </p>
      </header>
      <section>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <StatusButton
              isLoading={isPending}
              text="Delete account"
              variant="destructive"
              type="submit"
            />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your account? All your data will
                be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  fetcher.submit(
                    { intent: "deleteUser" },
                    { method: "post", action: "/account" },
                  );
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
