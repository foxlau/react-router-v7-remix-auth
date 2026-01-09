import { AUTH_TOTP_PERIOD } from "~/lib/auth/auth.server";
import { site } from "~/lib/config";
import { formatExpiryDuration } from "~/lib/utils";
import type { EmailTemplate } from "../providers/types";

export function createTotpTemplate({ code }: { code: string }): EmailTemplate {
	const duration = formatExpiryDuration(AUTH_TOTP_PERIOD);
	const sendTime = new Date().toUTCString();

	return {
		subject: `Your ${site.name} login code is ${code}`,
		html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Your ${site.name} login code</title>
        </head>
        <body style="margin: 0; padding: 0;">
          <div style="margin: 0 auto; padding: 36px; max-width: 580px; border: 1px solid #e0e0e0; border-radius: 12px;">
            <p style="font-size: 14px;">Hi, there!</p>
            
            <h1 style="font-size: 20px; font-weight: 400; padding: 24px 0 0;">
              Your <strong>${site.name}</strong> login code
            </h1>

            <code style="padding: 6px; background-color: #f6f6f6; text-align: center; border-radius: 6px; margin: 24px auto; display: block; font-size: 24px; font-weight: 800; letter-spacing: 6px;">
              ${code}
            </code>

            <p style="font-size: 14px;">
              This verification code was generated at ${sendTime}. For your security, it can only be used once and will expire in ${duration}.<br/><br/>
              <strong style="font-weight: 600;">To protect your account, do not share this code.</strong>
            </p>
            
            <p style="color: #888888; font-size: 12px;">
              <strong style="font-weight: 500;">Didn't request this?</strong><br/>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
		text: `
Hi, there!

Your ${site.name} login code.

Verification code: ${code}

This is a one-time code that expires in ${duration}. To protect your account, do not share this code.

Didn't request this? If you didn't request this, you can safely ignore this email.
    `.trim(),
	};
}
