import { createId } from "@paralleldrive/cuid2";
import { sql, type SQL } from "drizzle-orm";
import { integer, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export function lower(column: AnySQLiteColumn): SQL {
  return sql`lower(${column})`;
}

export function cuid<Name extends string>(name: Name, indexName?: string) {
  return text(name, { mode: "text", length: 24 })
    .unique(indexName)
    .$defaultFn(() => createId())
    .notNull();
}

export function timestamp<Name extends string>(name: Name) {
  return integer(name, { mode: "timestamp" });
}

export const autoIncrementId = {
  id: integer("id").primaryKey({ autoIncrement: true }),
};

export const createdAt = timestamp("created_at")
  .default(sql`(unixepoch())`)
  .notNull();

export const updatedAt = timestamp("updated_at").$onUpdate(() => new Date());
