import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { cuid, withTimestamps } from "./helpers";

export const withUserId = {
  user_id: text()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
};

export const usersTable = sqliteTable(
  "users",
  {
    id: cuid("id", "users_id_unique"),
    username: text().notNull(),
    display_name: text(),
    email: text().notNull(),
    avatar_url: text(),
    bio: text(),
    is_active: integer({ mode: "boolean" }).default(true).notNull(),
    ...withTimestamps,
  },
  (t) => ({
    username_unq_idx: uniqueIndex("users_username_unq_idx").on(t.username),
    email_unq_idx: uniqueIndex("users_email_unq_idx").on(t.email),
  }),
);

export const usersRelations = relations(usersTable, ({ many, one }) => ({
  accounts: many(accountsTable),
  passwords: one(passwordsTable),
  sessions: many(sessionsTable),
  todos: many(todosTable),
}));

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const sessionsTable = sqliteTable("sessions", {
  id: cuid("id", "sessions_id_unique"),
  ...withUserId,
  country: text(),
  ip_address: text(),
  user_agent: text(),
  expires_at: integer({ mode: "timestamp" }).notNull(),
  ...withTimestamps,
});

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const accountsTable = sqliteTable(
  "accounts",
  {
    id: cuid("id", "accounts_id_unique"),
    ...withUserId,
    provider_account_id: text().notNull(),
    provider: text({
      enum: ["google", "github", "credential", "magic_link", "totp"],
    }).notNull(),
    scopes: text(),
    id_token: text(),
    access_token: text(),
    refresh_token: text(),
    access_token_expires_at: integer({ mode: "timestamp" }),
    refresh_token_expires_at: integer({ mode: "timestamp" }),
    ...withTimestamps,
  },
  (t) => ({
    provider_idx: index("accounts_provider_idx").on(t.provider),
    provider_account_unq: unique("accounts_provider_account_unq").on(
      t.provider,
      t.provider_account_id,
    ),
  }),
);

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  users: one(usersTable, {
    fields: [accountsTable.user_id],
    references: [usersTable.id],
  }),
}));

export type SelectAccount = typeof accountsTable.$inferSelect;
export type InsertAccount = typeof accountsTable.$inferInsert;

export const passwordsTable = sqliteTable(
  "passwords",
  {
    ...withUserId,
    hash: text().notNull(),
  },
  (t) => ({
    user_id_unq: unique().on(t.user_id),
  }),
);

export const passwordsRelations = relations(passwordsTable, ({ one }) => ({
  users: one(usersTable, {
    fields: [passwordsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const todosTable = sqliteTable(
  "todos",
  {
    id: cuid("id", "todos_id_unique"),
    ...withUserId,
    title: text("title").notNull(),
    completed: integer("completed").default(0).notNull(),
    ...withTimestamps,
  },
  (t) => {
    return {
      userIdIndex: index("todos_user_id_idx").on(t.user_id),
    };
  },
);

export const todosRelations = relations(todosTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [todosTable.user_id],
    references: [usersTable.id],
  }),
}));
