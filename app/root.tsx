import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { Honeypot } from "remix-utils/honeypot/server";
import { Toaster } from "sonner";
import type { Route } from "./+types/root";
import { GeneralErrorBoundary } from "./components/error-boundary";
import { ProgressBar } from "./components/progress-bar";
import { useNonce } from "./hooks/use-nonce";
import { useToast } from "./hooks/use-toast";
import {
  ColorSchemeScript,
  useColorScheme,
} from "./lib/color-scheme/components";
import { parseColorScheme } from "./lib/color-scheme/server";
import { site } from "./lib/config";
import { adapterContext } from "./lib/contexts";
import { requestMiddleware } from "./lib/http.server";
import { getToast } from "./lib/toast.server";
import { combineHeaders } from "./lib/utils";
import stylesheet from "./styles/app.css?url";

export const meta: Route.MetaFunction = ({ error }) => [
  { title: (error ? "Oops! • " : "") + site.name },
];

export const links: Route.LinksFunction = () => {
  const iconVariants = ["192x192", "256x256", "384x384", "512x512"];

  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
    { rel: "stylesheet", href: stylesheet },
    { rel: "icon", href: "/favicon.ico" },
    { rel: "manifest", href: "/manifest.json" },
    { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ...iconVariants.map((size) => ({
      rel: "icon",
      type: "image/png",
      sizes: size,
      href: `/icons/icon-${size}.png`,
    })),
  ];
};

export async function loader({ request, context }: Route.LoaderArgs) {
  await requestMiddleware(request);
  const loadContext = context.get(adapterContext);
  const { toast, headers: toastHeaders } = await getToast(request);
  const colorScheme = await parseColorScheme(request);
  const honeyProps = await new Honeypot({
    encryptionSeed: loadContext.cloudflare.env.HONEYPOT_SECRET,
  }).getInputProps();

  return data(
    {
      toast,
      colorScheme,
      honeyProps,
    },
    { headers: combineHeaders(toastHeaders) },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  const colorScheme = useColorScheme();

  return (
    <html
      lang="en"
      className={`${colorScheme === "dark" ? "dark" : ""} touch-manipulation overflow-x-hidden`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta name="application-name" content={site.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={site.name} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="description" content={site.description} />
        <Meta />
        <Links />
        <ColorSchemeScript nonce={nonce} />
      </head>
      <body>
        <ProgressBar />
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster richColors position="top-center" theme={colorScheme} />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  useToast(loaderData.toast);
  return (
    <HoneypotProvider {...loaderData.honeyProps}>
      <Outlet />
    </HoneypotProvider>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
