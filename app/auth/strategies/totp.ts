/**
 * Time-based One-Time Password (TOTP) strategy for Remix Auth
 * Implements email-based verification code authentication
 */

import { redirect } from "react-router";
import { Strategy } from "remix-auth/strategy";
import { auth, getSessionFromCookie } from "../auth.server";
import {
  generateVerification,
  Verification,
  verifyCode,
} from "../verification.server";

export interface SendTOTPOptions {
  email: string;
  code: string;
  magicLink?: string;
  request: Request;
  formData: FormData;
}

export type SendTOTP = (options: SendTOTPOptions) => Promise<void>;

export interface TOTPStrategyOptions {
  verifyStorage: KVNamespace;
  sendTOTP: SendTOTP;
}

export interface TOTPVerifyParams {
  email: string;
  formData?: FormData;
  request: Request;
}

export function toNonEmptyString(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export function toOptionalString(value: unknown) {
  if (typeof value !== "string" && value !== undefined) {
    throw new Error("Value must be a string or undefined.");
  }
  return value;
}

export class TOTPStrategy<User> extends Strategy<User, TOTPVerifyParams> {
  public name = "totp";

  private readonly verifyStorage: KVNamespace;
  private readonly sendTOTP: SendTOTP;

  constructor(
    options: TOTPStrategyOptions,
    verify: Strategy.VerifyFunction<User, TOTPVerifyParams>,
  ) {
    super(verify);
    this.verifyStorage = options.verifyStorage;
    this.sendTOTP = options.sendTOTP;
  }

  async authenticate(request: Request): Promise<User> {
    const { session, sessionUser } = await getSessionFromCookie(request);

    // 1. Check if user is already logged in
    if (sessionUser) return sessionUser;

    const formData = await request.clone().formData();
    const formDataEmail = toNonEmptyString(formData.get("email"));
    const formDataCode = toNonEmptyString(formData.get("code"));
    const sessionEmail = toOptionalString(session.get("auth:email"));

    // 2. Verify code
    if (sessionEmail && formDataCode) {
      const isValid = await verifyCode(
        this.verifyStorage,
        Verification.Type.EMAIL,
        sessionEmail,
        formDataCode,
      );
      if (isValid) {
        return this.verify({ email: sessionEmail, formData, request });
      }
      throw new Error("Invalid code");
    }

    // 3. Send verification code
    const email = formDataEmail ?? sessionEmail;
    if (!email) {
      throw new Error("Please enter an email address");
    }

    // Validate email format only when sending the first verification code
    if (!this.validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    const code = await generateVerification(
      this.verifyStorage,
      Verification.Type.EMAIL,
      email,
    );

    await this.sendTOTP({ email, code, request, formData });

    session.set("auth:email", email);
    session.flash("auth:notice", "Verification code sent");

    throw redirect("/auth/verify", {
      headers: {
        "Set-Cookie": await auth.commitSession(session),
      },
    });
  }

  private validateEmail(email: string) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
