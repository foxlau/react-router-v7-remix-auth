import { logger } from "../logger";
import { getErrorMessage } from "../utils";

interface MXRecord {
	name: string;
	type: number;
	TTL: number;
	data: string;
}

interface DNSResponse {
	Status: number;
	Answer?: MXRecord[];
}

function isValidEmailFormat(email: string): boolean {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	return emailRegex.test(email);
}

async function checkMXRecord(domain: string): Promise<boolean> {
	try {
		const response = await fetch(
			`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
			{
				headers: {
					Accept: "application/dns-json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`response status ${response.status}`);
		}

		const data: DNSResponse = await response.json();
		return (
			data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0
		);
	} catch (error) {
		const message = getErrorMessage(error);
		logger.error({ event: "mx_record_check_failed", message });
		return false;
	}
}

export async function validateEmail(email: string) {
	if (!isValidEmailFormat(email)) {
		return false;
	}

	const domain = email.split("@")[1]?.toLowerCase();
	if (!domain) {
		return false;
	}

	if (process.env.NODE_ENV !== "production") {
		return true;
	}

	return await checkMXRecord(domain);
}
