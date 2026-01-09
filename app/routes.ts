import {
	index,
	layout,
	prefix,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	// User routes
	layout("routes/layout.tsx", [
		index("routes/index.tsx"),
		route("account", "routes/account.tsx"),
		route("todos", "routes/todos.tsx"),
	]),

	// Auth
	...prefix("auth", [
		layout("routes/auth/layout.tsx", [
			route(":provider/callback", "routes/auth/provider-callback.ts"),
			route("login", "routes/auth/login.tsx"),
			route("verify", "routes/auth/verify.tsx"),
		]),
		route("logout", "routes/auth/logout.ts"),
	]),

	// API
	...prefix("api", [route("color-scheme", "routes/api/color-scheme.ts")]),

	// Not found
	route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
