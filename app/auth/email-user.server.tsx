import { VerificationEmail } from "~/components/email/verification-email";
import { sendEmail } from "~/lib/email.server";

export function sendTotpVerificationEmail({email, code}: {email: string, code: string}) {
    sendEmail({
        to: email,
        subject: "Verify your email address",
        react: <VerificationEmail onboardingUrl="/auth/verify" otp={code} />,
    });
}