import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),

  // User routes
  layout("routes/layout.tsx", [
    route("home", "routes/home.tsx"),
    route("account", "routes/account.tsx"),
    route("todos", "routes/todos.tsx"),
  ]),

  // Auth
  ...prefix("auth", [
    layout("routes/auth/layout.tsx", [
      route(":provider/callback", "routes/auth/provider-callback.tsx"),
      route("login", "routes/auth/login.tsx"),
      route("verify", "routes/auth/verify.tsx"),
    ]),
    route("logout", "routes/auth/logout.tsx"),
  ]),

  // API
  ...prefix("api", [route("color-scheme", "routes/api/color-scheme.ts")]),

  // Not found
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
