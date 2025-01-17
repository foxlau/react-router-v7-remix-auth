import { Monitor, Smartphone, XIcon } from "lucide-react";
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
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { StatusButton } from "~/components/ui/status-button";
import type { loader } from "~/routes/account";

export function SessionManage({
  sessions,
}: {
  sessions: Awaited<ReturnType<typeof loader>>["data"]["sessions"];
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-base font-semibold">Active sessions</h2>
        <p className="text-muted-foreground">
          If necessary, you can sign out of all other browser sessions. Some of
          your recent sessions are listed below, but this list may not be
          complete.
        </p>
      </header>
      <section className="space-y-4">
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} />
        ))}
      </section>
    </div>
  );
}

export function SessionItem({
  session,
}: {
  session: Awaited<ReturnType<typeof loader>>["data"]["sessions"][number];
}) {
  const fetcher = useFetcher();
  const isPending = fetcher.state !== "idle";

  return (
    <div className="relative flex items-center justify-between rounded-lg border py-4 pl-4 pr-10 shadow-sm shadow-black/5">
      <div className="flex items-start gap-2">
        <div className="mt-1 hidden sm:block">
          {session.isMobile ? (
            <Smartphone size={14} aria-hidden="true" />
          ) : (
            <Monitor size={14} aria-hidden="true" />
          )}
        </div>
        <div>
          <p>{session.userAgent}</p>
          <p className="flex flex-col gap-x-2 text-xs text-muted-foreground sm:flex-row">
            <span>
              Ip address: {session.ipAddress}{" "}
              {session.country !== "Unknown" && `(${session.country})`}
            </span>
            <span>Last active: {session.createdAt}</span>
          </p>
        </div>
      </div>
      <div className="absolute right-3 top-3">
        {!session.isCurrent ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <StatusButton
                isLoading={isPending}
                icon={<XIcon aria-hidden="true" />}
                variant="ghost"
                size="icon"
                className="size-6 [&_svg]:text-muted-foreground/60"
              />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Clicking continue will sign you out of this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    fetcher.submit(
                      {
                        intent: "signOutSession",
                        sessionId: session.id,
                      },
                      {
                        method: "post",
                        action: "/account",
                        preventScrollReset: true,
                      },
                    );
                  }}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Badge
            variant="outline"
            className="size-5 overflow-hidden px-1 sm:size-auto sm:gap-1.5 sm:px-1.5 sm:font-normal"
          >
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span className="hidden sm:block">This device</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
