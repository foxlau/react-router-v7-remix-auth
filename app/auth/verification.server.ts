import { generateTOTP, verifyTOTP } from "@epic-web/totp";

/**
 * Verification related constants
 */
const MAX_ATTEMPTS = 3; // Maximum verification attempts
const TOTP_PERIOD = 60 * 10; // TOTP expiration time (10 minutes)
const SEND_COOLDOWN = 60; // Send cooldown period (seconds)
const MAX_SENDS_PER_PERIOD = 3; // Maximum sends within TOTP_PERIOD

/**
 * TOTP Configuration
 * - digits: 6 digits code
 * - algorithm: Using SHA-256 algorithm
 * - charSet: Avoid confusing characters (0, O, I)
 * - period: Code expiration time (seconds)
 * @see https://github.com/epicweb-dev/totp
 */
const TOTP_CONFIG = {
  digits: 6,
  algorithm: "SHA-256",
  charSet: "ABCDEFGHJKLMNPQRSTUVWXYZ123456789",
  period: TOTP_PERIOD,
} as const;

/**
 * Verification related types
 */
export namespace Verification {
  export enum Type {
    EMAIL = "email",
    PHONE = "phone",
  }

  export interface Config {
    secret: string; // TOTP secret key
    period?: number; // Validity period (seconds)
    algorithm?: string; // Hash algorithm
    charSet?: string; // Character set
  }

  export interface Data {
    type: Type; // Verification type
    identifier: string; // Identifier (email/phone)
    verification_config: Config; // Verification config
    verify_attempts: number; // Verification attempt count
    generate_count: number; // Generation count
    first_generate_at: number; // First generation timestamp
  }
}

/**
 * Generate verification code
 * @param verifyStorage - Verification storage
 * @param type - Verification type
 * @param identifier - Identifier (email/phone)
 * @returns Verification code
 */
export async function generateVerification(
  verifyStorage: KVNamespace,
  type: Verification.Type,
  identifier: string,
) {
  const key = `verification:${identifier}:${type}`;
  const existingData = await verifyStorage.get<Verification.Data>(key, "json");

  if (existingData) {
    const lastSentAt =
      existingData.first_generate_at +
      (existingData.generate_count - 1) * SEND_COOLDOWN * 1000;
    const cooldownRemaining = SEND_COOLDOWN - (Date.now() - lastSentAt) / 1000;

    if (cooldownRemaining > 0) {
      throw new Error(
        `Please wait ${Math.ceil(cooldownRemaining)} seconds before sending again`,
      );
    }

    if (existingData.generate_count >= MAX_SENDS_PER_PERIOD) {
      const expiresIn = Math.ceil(
        (existingData.first_generate_at + TOTP_PERIOD * 1000 - Date.now()) /
          1000 /
          60,
      );
      throw new Error(
        `Maximum sends reached, please try again in ${expiresIn} minutes`,
      );
    }
  }

  const { otp, ...verification_config } = await generateTOTP(TOTP_CONFIG);
  const now = Date.now();

  const verificationData = {
    type,
    identifier,
    verification_config,
    verify_attempts: 0,
    generate_count: (existingData?.generate_count || 0) + 1,
    first_generate_at: existingData?.first_generate_at || now,
  };

  await verifyStorage.put(key, JSON.stringify(verificationData), {
    expirationTtl: TOTP_PERIOD,
  });

  return otp;
}

/**
 * Verify verification code
 * @param verifyStorage - Verification storage
 * @param type - Verification type
 * @param identifier - Identifier (email/phone)
 * @param code - Verification code
 * @returns Verification result
 */
export async function verifyCode(
  verifyStorage: KVNamespace,
  type: Verification.Type,
  identifier: string,
  code: string,
): Promise<boolean> {
  const key = `verification:${identifier}:${type}`;
  const data = await verifyStorage.get<Verification.Data>(key, "json");

  if (!data) return false;

  if (data.verify_attempts >= MAX_ATTEMPTS) {
    throw new Error("Code has expired, Please request a new code.");
  }

  const result = await verifyTOTP({
    otp: code,
    ...data.verification_config,
  });

  // Update verification attempt count
  data.verify_attempts += 1;
  await verifyStorage.put(key, JSON.stringify(data), {
    expirationTtl: TOTP_PERIOD,
  });

  // Verification successful, delete verification data
  if (result?.delta !== undefined) {
    await deleteVerification(verifyStorage, type, identifier);
    return true;
  }

  return false;
}

/**
 * Check if verification data exists
 * @param verifyStorage - Verification storage
 * @param type - Verification type
 * @param identifier - Identifier (email/phone)
 * @returns Whether verification exists
 */
export async function hasVerification(
  verifyStorage: KVNamespace,
  type: Verification.Type,
  identifier: string,
) {
  const key = `verification:${identifier}:${type}`;
  return await verifyStorage.get(key);
}

/**
 * Delete verification data
 * @param verifyStorage - Verification storage
 * @param type - Verification type
 * @param identifier - Identifier (email/phone)
 */
export async function deleteVerification(
  verifyStorage: KVNamespace,
  type: Verification.Type,
  identifier: string,
) {
  await verifyStorage.delete(`verification:${identifier}:${type}`);
}
