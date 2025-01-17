import React from "react";
import { type ButtonProps, Button } from "./button";
import { Spinner } from "./spinner";

interface StatusButtonProps extends ButtonProps {
  isLoading: boolean;
  text?: string;
  loadingText?: string;
  icon?: React.ReactNode;
}

const StatusButton = React.forwardRef<HTMLButtonElement, StatusButtonProps>(
  ({ isLoading = false, text, loadingText, icon, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={isLoading} {...props}>
        {isLoading ? <Spinner className="size-4" /> : icon}
        {isLoading ? (loadingText ?? text) : text}
      </Button>
    );
  },
);

StatusButton.displayName = "StatusButton";

export { StatusButton };
