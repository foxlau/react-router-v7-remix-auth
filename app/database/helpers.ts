import { createId } from "@paralleldrive/cuid2";
import { sql, type SQL } from "drizzle-orm";
import { integer, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export function lower(column: AnySQLiteColumn): SQL {
  return sql`lower(${column})`;
}

export function cuid<Name extends string>(name: Name, indexName?: string) {
  return text(name, { mode: "text", length: 24 })
    .unique(indexName)
    .notNull()
    .$defaultFn(() => createId());
}

export const autoIncrementId = {
  id: integer().primaryKey({ autoIncrement: true }),
};

export const withTimestamps = {
  created_at: integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updated_at: integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
};
