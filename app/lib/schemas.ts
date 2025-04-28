/**
 * Zod schemas for routes
 */

import { z } from "zod";

export const accountSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("signOutSession"),
    sessionId: z.string().uuid(),
  }),
  z.object({
    intent: z.literal("deleteUser"),
    email: z.string({ message: "Email is required" }).email(),
  }),
]);

export const todoSchema = z.discriminatedUnion("intent", [
  z.object({
    title: z.string({ message: "Title is required" }).min(10).max(255),
    intent: z.literal("add"),
  }),
  z.object({
    todoId: z.string().cuid2(),
    intent: z.literal("complete"),
  }),
  z.object({
    todoId: z.string().cuid2(),
    intent: z.literal("delete"),
  }),
]);

export const loginSchema = z.discriminatedUnion("intent", [
  z.object({
    email: z.string({ message: "Email is required" }).email(),
    intent: z.literal("totp"),
  }),
  z.object({
    intent: z.literal("google"),
  }),
  z.object({
    intent: z.literal("github"),
  }),
]);

export const verifySchema = z.object({
  code: z
    .string({ required_error: "Code is required" })
    .min(6, "Code must be at least 6 characters")
    .max(6, "Code cannot exceed 6 characters")
    .regex(/^[A-Za-z0-9]+$/, "Code can only contain letters and numbers"),
});
