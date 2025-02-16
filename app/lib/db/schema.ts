import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createdAt, cuid, timestamp, updatedAt } from "./helpers";

/**
 * Tables
 */
export const usersTable = sqliteTable(
  "users",
  {
    id: cuid("id", "users_id_unique"),
    username: text("username", { mode: "text" }).notNull(),
    displayName: text("display_name"),
    email: text("email", { mode: "text" }).notNull(),
    avatarUrl: text("avatar_url", { mode: "text" }),
    bio: text("bio", { mode: "text" }),
    status: text("status", {
      mode: "text",
      enum: ["active", "deleted", "blocked"],
    })
      .default("active")
      .notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("users_username_unq_idx").on(t.username),
    uniqueIndex("users_email_unq_idx").on(t.email),
  ],
);

export const accountsTable = sqliteTable(
  "accounts",
  {
    id: cuid("id", "accounts_id_unique"),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    providerAccountId: text("provider_account_id", { mode: "text" }).notNull(),
    provider: text("provider", {
      mode: "text",
      enum: ["github", "google", "totp"],
    }).notNull(),
    scopes: text("scopes", { mode: "text" }),
    idToken: text("id_token", { mode: "text" }),
    accessToken: text("access_token", { mode: "text" }),
    refreshToken: text("refresh_token", { mode: "text" }),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    unique("accounts_provider_account_unq").on(t.provider, t.providerAccountId),
  ],
);

export const passwordsTable = sqliteTable(
  "passwords",
  {
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    hash: text("hash", { mode: "text" }).notNull(),
  },
  (t) => [unique("passwords_user_id_unq").on(t.userId)],
);

export const todosTable = sqliteTable(
  "todos",
  {
    id: cuid("id", "todos_id_unique"),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    completed: integer("completed").default(0).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [index("todos_user_id_idx").on(t.userId)],
);

/**
 * Relations
 */
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  accounts: many(accountsTable),
  passwords: one(passwordsTable),
  todos: many(todosTable),
}));

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  users: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),
}));

export const passwordsRelations = relations(passwordsTable, ({ one }) => ({
  users: one(usersTable, {
    fields: [passwordsTable.userId],
    references: [usersTable.id],
  }),
}));

export const todosRelations = relations(todosTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [todosTable.userId],
    references: [usersTable.id],
  }),
}));

/**
 * Types
 */
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export type SelectAccount = typeof accountsTable.$inferSelect;
export type InsertAccount = typeof accountsTable.$inferInsert;
