import { Honeypot, SpamError } from "remix-utils/honeypot/server";

export async function checkHoneypot(env: Env, formData: FormData) {
  const honeypot = new Honeypot({
    encryptionSeed: env.HONEYPOT_SECRET,
  });
  try {
    await honeypot.check(formData);
  } catch (error) {
    if (error instanceof SpamError) {
      throw new Response("Form not submitted properly", { status: 400 });
    }
    throw error;
  }
}
