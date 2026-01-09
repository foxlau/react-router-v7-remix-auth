import {
	ArrowRightIcon,
	CircleFadingPlusIcon,
	UserCogIcon,
} from "lucide-react";
import { href, Link } from "react-router";
import { GithubIcon } from "~/components/icons";
import { buttonVariants } from "~/components/ui/button";
import { useOptionalAuthUser } from "~/hooks/use-user";
import { site } from "~/lib/config";
import { cn } from "~/lib/utils";

export function meta() {
	return [{ title: site.name, description: site.description }];
}

export default function IndexRoute() {
	const user = useOptionalAuthUser();

	return (
		<div className="flex h-[calc(100vh-300px)] flex-col items-center justify-center">
			<section className="flex flex-col items-center gap-6">
				<div className="bg-linear-to-b from-primary to-primary/60 bg-clip-text text-center font-extrabold text-5xl text-transparent leading-12 tracking-tight">
					React Router <br /> with Remix Auth.
				</div>

				<p className="text-center font-mono text-[15px] text-muted-foreground">
					{site.description}
				</p>

				<div className="flex items-center gap-2">
					{user ? (
						<>
							<Link
								to={href("/todos")}
								className={cn(buttonVariants({ variant: "secondary" }))}
								reloadDocument
							>
								<CircleFadingPlusIcon />
								Create Todo
							</Link>

							<Link
								to={href("/account")}
								className={cn(buttonVariants({ variant: "secondary" }))}
							>
								<UserCogIcon />
								Account Settings
							</Link>
						</>
					) : (
						<>
							<Link
								to="https://github.com/foxlau/react-router-v7-remix-auth"
								className={cn(buttonVariants({ variant: "secondary" }))}
								reloadDocument
							>
								<GithubIcon />
								Star on Github
							</Link>

							<Link
								to={href("/auth/login")}
								className={cn(buttonVariants({ variant: "secondary" }))}
							>
								Get Started <ArrowRightIcon className="size-4" />
							</Link>
						</>
					)}
				</div>
			</section>
		</div>
	);
}
