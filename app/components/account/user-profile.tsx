import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { loader } from "~/routes/account";

export function UserProfile({
  user,
}: {
  user: Awaited<ReturnType<typeof loader>>["data"]["user"];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Profile</h2>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="shrink-0">
          <Avatar className="size-12">
            <AvatarImage
              src={
                user?.avatarUrl
                  ? user?.avatarUrl
                  : `https://avatar.vercel.sh/${user?.displayName}`
              }
              alt={user?.displayName ?? "User avatar"}
            />
            <AvatarFallback className="text-xs font-bold uppercase">
              {user?.displayName?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="w-full sm:flex-1">
          <strong className="font-medium">
            {user.displayName} ({user.email})
          </strong>
          <br />
          <span className="text-muted-foreground">Joined {user.createdAt}</span>
        </div>
      </section>
    </div>
  );
}
