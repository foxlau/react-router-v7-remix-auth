import { z } from "zod";
import { site } from "~/lib/config";
import { logger } from "~/lib/logger";
import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./types";

const ResendSuccessSchema = z.object({
  id: z.string(),
});

const ResendErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  statusCode: z.number(),
});

export class ResendEmailProvider implements EmailProvider {
  async sendEmail({
    apiKey,
    to,
    template,
  }: SendEmailOptions): Promise<SendEmailResult> {
    if (!apiKey) {
      throw new Error("Resend API key is not initialized");
    }

    const email = {
      from: `${site.name} <${site.noReplyEmail}>`,
      to,
      ...template,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });

    let message = "Unexpected error sending email";
    const data = await response.json();

    if (response.ok) {
      const parsedData = ResendSuccessSchema.safeParse(data);
      if (parsedData.success) {
        return { status: "success", data: parsedData.data };
      }
    }

    const parsedError = ResendErrorSchema.safeParse(data);
    if (parsedError.success) {
      message = parsedError.data.message;
      logger.error({ event: "resend_api_error", message });
      return { status: "error", message };
    }

    logger.error({ event: "resend_email_error", message });
    return { status: "error", message };
  }
}
