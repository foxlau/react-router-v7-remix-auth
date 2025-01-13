import { useSubmit } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useUser } from "~/hooks/use-user";
import { Button } from "./ui/button";

export function UserNav() {
  const user = useUser();
  const submit = useSubmit();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                user?.avatar_url
                  ? user?.avatar_url
                  : `https://avatar.vercel.sh/${user?.username}`
              }
              alt={user?.display_name ?? "User avatar"}
            />
            <AvatarFallback className="text-xs font-bold uppercase">
              {user?.display_name?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <strong className="font-medium">
              {user?.display_name ?? user?.username}
            </strong>
            <p className="truncate text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => {
            setTimeout(() => {
              submit(null, { method: "POST", action: "/auth/logout" });
            }, 100);
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
