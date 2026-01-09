import type { Config } from "drizzle-kit";

export default {
	out: "./drizzle",
	schema: "./app/lib/db/schema.ts",
	dialect: "sqlite",
} satisfies Config;
