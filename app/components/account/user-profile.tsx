import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useUser } from "~/hooks/use-user";

export function UserProfile() {
	const user = useUser();
	return (
		<div className="space-y-4">
			<h2 className="font-semibold text-base">Profile</h2>
			<section className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div className="shrink-0">
					<Avatar className="size-12">
						<AvatarImage
							src={
								user.avatarUrl
									? user.avatarUrl
									: `https://avatar.vercel.sh/${user.displayName}`
							}
							alt={user.displayName ?? "User avatar"}
						/>
						<AvatarFallback className="font-bold text-xs uppercase">
							{user.displayName?.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
				</div>
				<div className="w-full sm:flex-1">
					<strong className="font-medium">
						{user.displayName} ({user.email})
					</strong>
					<br />
					<span className="text-muted-foreground">
						Joined {user.createdAt.toLocaleDateString()}
					</span>
				</div>
			</section>
		</div>
	);
}
