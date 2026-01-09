import { ReactRouterIcon } from "~/components/icons";

export function AppLogo() {
	return (
		<div className="flex items-center gap-3">
			<ReactRouterIcon theme="light" className="block w-6 dark:hidden" />
			<ReactRouterIcon theme="dark" className="hidden w-6 dark:block" />
		</div>
	);
}
