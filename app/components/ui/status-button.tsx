import type { VariantProps } from "class-variance-authority";
import React, { type ComponentProps } from "react";
import { Button, type buttonVariants } from "./button";
import { Spinner } from "./spinner";

type ButtonProps = ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		formProps?: {
			name?: string;
			value?: string;
		};
	};

interface StatusButtonProps extends ButtonProps {
	isLoading: boolean;
	text?: string;
	loadingText?: string;
	icon?: React.ReactNode;
}

const StatusButton = React.forwardRef<HTMLButtonElement, StatusButtonProps>(
	(
		{ isLoading = false, text, loadingText, icon, formProps, ...props },
		ref,
	) => {
		return (
			<Button ref={ref} disabled={isLoading} {...formProps} {...props}>
				{isLoading ? <Spinner className="size-4" /> : icon}
				{isLoading ? (loadingText ?? text) : text}
			</Button>
		);
	},
);

StatusButton.displayName = "StatusButton";

export { StatusButton };
