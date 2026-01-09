import { Monitor, Smartphone, XIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Await, useFetcher } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { useMediaQuery } from "~/hooks/use-media-query";
import type { ProcessedSession } from "~/routes/account";
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
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "../ui/drawer";
import { StatusButton } from "../ui/status-button";

const MODAL_TITLE = "Are you sure?";
const MODAL_DESCRIPTION = "Clicking continue will sign you out of this device.";

export function SessionManage({
	sessionsPromise,
}: {
	sessionsPromise: Promise<ProcessedSession[]>;
}) {
	return (
		<div className="space-y-4">
			<header className="space-y-2">
				<h2 className="font-semibold text-base">Active sessions</h2>
				<p className="text-muted-foreground">
					If necessary, you can sign out of all other browser sessions. Some of
					your recent sessions are listed below, but this list may not be
					complete.
				</p>
			</header>
			<Suspense fallback={<SessionManageSkeleton />}>
				<Await
					resolve={sessionsPromise}
					errorElement={<div>Error loading sessions.</div>}
				>
					{(sessions: ProcessedSession[]) => (
						<section className="space-y-4">
							{sessions.map((session) => (
								<SessionItem key={session.id} session={session} />
							))}
						</section>
					)}
				</Await>
			</Suspense>
		</div>
	);
}

export function SessionItem({ session }: { session: ProcessedSession }) {
	const [open, setOpen] = useState(false);
	const fetcher = useFetcher();
	const isPending = fetcher.state !== "idle";
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const handleSignOut = () => {
		fetcher.submit(
			{
				intent: "signOutSession",
				sessionId: session.id,
			},
			{
				method: "POST",
				action: "/account",
				preventScrollReset: true,
			},
		);
		setOpen(false);
	};

	const logoutButton = (
		<StatusButton
			isLoading={isPending}
			icon={<XIcon aria-hidden="true" />}
			variant="ghost"
			size="icon"
			className="size-6 [&_svg]:text-muted-foreground/60"
		/>
	);

	return (
		<div className="relative flex items-center justify-between rounded-lg border py-4 pr-10 pl-4 shadow-xs">
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
					<p className="flex flex-col gap-x-2 text-muted-foreground text-xs sm:flex-row">
						<span>
							Ip address: {session.ipAddress}{" "}
							{session.country !== "Unknown" && `(${session.country})`}
						</span>
						<span>Last active: {session.createdAt}</span>
					</p>
				</div>
			</div>
			<div className="absolute top-3 right-3">
				{!session.isCurrent ? (
					isDesktop ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>{logoutButton}</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{MODAL_TITLE}</AlertDialogTitle>
									<AlertDialogDescription>
										{MODAL_DESCRIPTION}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={handleSignOut}>
										Continue
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Drawer open={open} onOpenChange={setOpen}>
							<DrawerTrigger asChild>{logoutButton}</DrawerTrigger>
							<DrawerContent>
								<DrawerHeader className="text-left">
									<DrawerTitle>{MODAL_TITLE}</DrawerTitle>
									<DrawerDescription>{MODAL_DESCRIPTION}</DrawerDescription>
								</DrawerHeader>
								<DrawerFooter className="pt-2">
									<Button onClick={handleSignOut}>Continue</Button>
									<DrawerClose asChild>
										<Button variant="outline">Cancel</Button>
									</DrawerClose>
								</DrawerFooter>
							</DrawerContent>
						</Drawer>
					)
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

function SessionManageSkeleton() {
	return (
		<div className="space-y-4">
			<div className="space-y-2 rounded-lg border p-4 shadow-xs">
				<Skeleton className="h-4 w-8/12" />
				<Skeleton className="h-4 w-10/12" />
			</div>
		</div>
	);
}
