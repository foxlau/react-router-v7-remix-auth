import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";
import { useSpinDelay } from "spin-delay";
import { cn } from "~/lib/utils";
import { Spinner } from "./ui/spinner";

interface ProgressBarProps {
  showSpinner?: boolean;
}

function ProgressBar({ showSpinner = false }: ProgressBarProps) {
  const transition = useNavigation();
  const busy = transition.state !== "idle";
  const delayedPending = useSpinDelay(busy, {
    delay: 600,
    minDuration: 400,
  });
  const ref = useRef<HTMLDivElement>(null);
  const [animationComplete, setAnimationComplete] = useState(true);

  useEffect(() => {
    if (!ref.current) return;
    if (delayedPending) setAnimationComplete(false);

    const animationPromises = ref.current
      .getAnimations()
      .map(({ finished }) => finished);

    Promise.allSettled(animationPromises).then(() => {
      if (!delayedPending) setAnimationComplete(true);
    });
  }, [delayedPending]);

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: false
    <div
      aria-hidden={delayedPending ? undefined : true}
      aria-valuetext={delayedPending ? "Loading" : undefined}
      className="fixed inset-x-0 top-0 left-0 z-[99999] h-0.5 animate-pulse"
    >
      <div
        ref={ref}
        className={cn(
          "relative h-full w-0 bg-primary duration-500 ease-in-out",
          transition.state === "idle" &&
            (animationComplete
              ? "transition-none"
              : "w-full opacity-0 transition-all"),
          delayedPending && transition.state === "submitting" && "w-5/12",
          delayedPending && transition.state === "loading" && "w-8/12",
        )}
      >
        <div className="-translate-y-1 absolute right-0 block h-full w-[100px] rotate-[3deg] opacity-100" />
      </div>
      {delayedPending && showSpinner && (
        <div className="absolute top-2 right-2 flex items-center justify-center">
          <Spinner className="size-4 text-primary" />
        </div>
      )}
    </div>
  );
}

export { ProgressBar };
