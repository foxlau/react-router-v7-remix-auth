/**
 * Time-based One-Time Password (TOTP) strategy for Remix Auth
 * Implements email-based verification code authentication
 */

import { redirect } from "react-router";
import { Strategy } from "remix-auth/strategy";
import { redirectWithToast } from "../../toast.server";
import { auth } from "../auth.server";
import { getSessionFromCookie } from "../session.server";
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

export type ValidateEmail = (email: string) => Promise<boolean>;

export interface TOTPStrategyOptions {
  kv: KVNamespace;
  sendTOTP: SendTOTP;
  validateEmail: ValidateEmail;
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

  private readonly kv: KVNamespace;
  private readonly sendTOTP: SendTOTP;
  private readonly validateEmail: ValidateEmail;

  constructor(
    options: TOTPStrategyOptions,
    verify: Strategy.VerifyFunction<User, TOTPVerifyParams>,
  ) {
    super(verify);
    this.kv = options.kv;
    this.sendTOTP = options.sendTOTP;
    this.validateEmail = options.validateEmail;
  }

  async authenticate(request: Request): Promise<User> {
    const { session, sessionUser } = await getSessionFromCookie(request);

    // 1. Check if user is already logged in
    if (sessionUser) throw new Error("User already logged in");

    const formData = await request.clone().formData();
    const formDataEmail = toNonEmptyString(formData.get("email"));
    const formDataCode = toNonEmptyString(formData.get("code"));
    const formDataIntent = toNonEmptyString(formData.get("intent"));
    const sessionEmail = toOptionalString(session.get("auth:email"));

    // 2. Verify code
    if (sessionEmail && formDataCode) {
      const isValidCode = await verifyCode(
        this.kv,
        Verification.Type.EMAIL,
        sessionEmail,
        formDataCode,
      );
      if (isValidCode) {
        return this.verify({ email: sessionEmail, formData, request });
      }
      throw new Error("Invalid code");
    }

    // 3. Send verification code
    const email = formDataEmail ?? sessionEmail;
    if (!email) throw new Error("Email is required");

    // Validate email format only when sending the first verification code
    const isValidEmail = await this.validateEmail(email);
    if (!isValidEmail) throw new Error("Invalid email address");

    const code = await generateVerification(
      this.kv,
      Verification.Type.EMAIL,
      email,
    );

    await this.sendTOTP({ email, code, request, formData });

    if (formDataIntent === "resend") {
      throw await redirectWithToast("/auth/verify", {
        title: "Verification code sent",
        type: "success",
      });
    }

    session.set("auth:email", email);
    throw redirect("/auth/verify", {
      headers: {
        "Set-Cookie": await auth.commitSession(session),
      },
    });
  }
}
