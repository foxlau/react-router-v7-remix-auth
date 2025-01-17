import { createId as cuid } from "@paralleldrive/cuid2";
import { createCookieSessionStorage, redirect } from "react-router";
import { z } from "zod";
import { combineHeaders } from "~/lib/utils";

const ToastSchema = z.object({
  id: z.string().default(() => cuid()),
  title: z.string(),
  description: z.string().optional(),
  type: z
    .enum(["message", "success", "error", "warning", "info"])
    .default("message"),
});

export const toastKey = "flash-toast";
export type Toast = z.infer<typeof ToastSchema>;
export type ToastInput = z.input<typeof ToastSchema>;

export const toastSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__toast",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3Cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function redirectWithToast(
  url: string,
  toast: ToastInput,
  init?: ResponseInit,
) {
  return redirect(url, {
    ...init,
    headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
  });
}

export async function createToastHeaders(toastInput: ToastInput) {
  const session = await toastSessionStorage.getSession();
  const toast = ToastSchema.parse(toastInput);
  session.flash(toastKey, toast);
  const cookie = await toastSessionStorage.commitSession(session);
  return new Headers({ "set-cookie": cookie });
}

export async function getToast(request: Request) {
  const session = await toastSessionStorage.getSession(
    request.headers.get("cookie"),
  );
  const result = ToastSchema.safeParse(session.get(toastKey));
  const toast = result.success ? result.data : null;
  return {
    toast,
    headers: toast
      ? new Headers({
          "set-cookie": await toastSessionStorage.destroySession(session),
        })
      : null,
  };
}
