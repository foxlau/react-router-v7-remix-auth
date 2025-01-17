import { ResendEmailProvider } from "./providers/resend.server";
import type { SendEmailOptions } from "./providers/types";
import { createTotpTemplate } from "./templates/auth-totp";

const emailProvider = new ResendEmailProvider();

export async function sendEmail(options: SendEmailOptions) {
  return emailProvider.sendEmail(options);
}

export async function sendAuthTotpEmail({
  env,
  email,
  code,
}: {
  env: Env;
  email: string;
  code: string;
}) {
  return await sendEmail({
    apiKey: env.RESEND_API_KEY,
    to: email,
    template: createTotpTemplate({ code }),
  });
}
