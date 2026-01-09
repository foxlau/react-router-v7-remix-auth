import { generateTOTP, verifyTOTP } from "@epic-web/totp";
import { AUTH_TOTP_PERIOD } from "./auth.server";

/**
 * Verification related constants
 */
const SEND_COOLDOWN = 60; // Send cooldown period (seconds)
const MAX_ATTEMPTS = 3; // Maximum verification attempts allowed

/**
 * Verification related type definitions
 */
export namespace Verification {
	export enum Type {
		EMAIL = "email",
		PHONE = "phone",
	}

	export interface Config {
		secret: string; // TOTP secret key
	}

	export interface Data {
		type: Type; // Verification type
		identifier: string; // Identifier
		verificationConfig: Config; // Verification configuration
		verifyAttempts: number; // Number of verification attempts
		lastActivityAt?: number; // Last activity timestamp (send or verify)
	}

	export interface Metadata {
		createdAt: number; // Verification data creation timestamp
	}
}

/**
 * Generate verification code
 * @param kv KV storage
 * @param type Verification type
 * @param identifier Identifier
 * @returns Generated OTP verification code
 * @throws Error if within cooldown period
 */
export async function generateVerification(
	kv: KVNamespace,
	type: Verification.Type,
	identifier: string,
): Promise<string> {
	const key = `verification:${identifier}:${type}`;
	const { value: existingData } = await kv.getWithMetadata<
		Verification.Data,
		Verification.Metadata
	>(key, "json");

	const now = Date.now();

	// Check if within cooldown period (based on last activity time)
	if (existingData?.lastActivityAt) {
		const cooldownRemaining =
			SEND_COOLDOWN - (now - existingData.lastActivityAt) / 1000;
		if (cooldownRemaining > 0) {
			throw new Error(
				`Please wait ${Math.ceil(cooldownRemaining)} seconds before sending again`,
			);
		}
	}

	const { otp, ...verificationConfig } = await generateTOTP({
		digits: 6, // Number of digits in verification code
		algorithm: "SHA-256", // Hash algorithm
		charSet: "ABCDEFGHJKLMNPQRSTUVWXYZ123456789", // Character set
		period: AUTH_TOTP_PERIOD, // TOTP validity period (seconds)
	});

	const verificationData: Verification.Data = {
		type,
		identifier,
		verificationConfig,
		verifyAttempts: 0,
		lastActivityAt: now, // Record current send time
	};

	await kv.put(key, JSON.stringify(verificationData), {
		expirationTtl: AUTH_TOTP_PERIOD,
		metadata: { createdAt: now },
	});

	return otp;
}

/**
 * Verify verification code
 * @param kv KV storage
 * @param type Verification type
 * @param identifier Identifier
 * @param code Verification code
 * @returns Verification result
 */
export async function verifyCode(
	kv: KVNamespace,
	type: Verification.Type,
	identifier: string,
	code: string,
): Promise<boolean> {
	const key = `verification:${identifier}:${type}`;
	const data = await kv.get<Verification.Data>(key, "json");

	if (!data) return false;

	if (data.verifyAttempts >= MAX_ATTEMPTS) {
		throw new Error("Code has expired, please request a new code");
	}

	const result = await verifyTOTP({
		otp: code,
		...data.verificationConfig,
	});

	// Update verification attempts and last activity time
	const updatedData: Verification.Data = {
		...data,
		verifyAttempts: data.verifyAttempts + 1,
	};
	await kv.put(key, JSON.stringify(updatedData), {
		expirationTtl: AUTH_TOTP_PERIOD,
	});

	// If verification successful, delete verification data
	if (result?.delta !== undefined) {
		await deleteVerification(kv, type, identifier);
		return true;
	}

	return false;
}

/**
 * Check if verification data exists
 * @param kv KV storage
 * @param type Verification type
 * @param identifier Identifier
 * @returns Whether verification data exists
 */
export async function hasVerification(
	kv: KVNamespace,
	type: Verification.Type,
	identifier: string,
): Promise<boolean> {
	const key = `verification:${identifier}:${type}`;
	return !!(await kv.get(key));
}

/**
 * Delete verification data
 * @param kv KV storage
 * @param type Verification type
 * @param identifier Identifier
 */
export async function deleteVerification(
	kv: KVNamespace,
	type: Verification.Type,
	identifier: string,
): Promise<void> {
	await kv.delete(`verification:${identifier}:${type}`);
}
