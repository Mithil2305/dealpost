import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
	normalizePhoneToE164,
	sendPhoneOtpFirebase,
	isFirebaseConfigured,
} from "../utils/firebaseAuth";

function randomId() {
	return `firebase-recaptcha-${Math.random().toString(36).slice(2, 10)}`;
}

function getOtpErrorMessage(error) {
	const code = String(error?.code || "");

	if (code === "auth/invalid-phone-number") {
		return "Invalid phone format. Use +91XXXXXXXXXX";
	}
	if (code === "auth/too-many-requests") {
		return "Too many OTP attempts. Please wait and try again.";
	}
	if (code === "auth/captcha-check-failed") {
		return "reCAPTCHA check failed. Reload and try again.";
	}
	if (code === "auth/invalid-app-credential") {
		return "OTP verification is blocked. Check Firebase domain and phone auth setup.";
	}
	if (code === "auth/quota-exceeded") {
		return "Firebase OTP quota exceeded. Try later or check your Firebase plan.";
	}
	if (code === "auth/operation-not-allowed") {
		return "Phone auth is disabled in Firebase Console.";
	}
	if (code === "auth/invalid-verification-code") {
		return "Invalid OTP. Please check and try again.";
	}
	if (code === "auth/code-expired") {
		return "OTP has expired. Request a new OTP.";
	}

	return error?.message || "Unable to send OTP";
}

export default function FirebasePhoneAuthPanel({
	onVerified,
	disabled = false,
	buttonLabel = "Continue with Phone OTP",
}) {
	const recaptchaContainerId = useMemo(() => randomId(), []);
	const [phoneInput, setPhoneInput] = useState("+91 ");
	const [otp, setOtp] = useState("");
	const [confirmationResult, setConfirmationResult] = useState(null);
	const [sendingOtp, setSendingOtp] = useState(false);
	const [verifyingOtp, setVerifyingOtp] = useState(false);

	if (!isFirebaseConfigured()) {
		return (
			<div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-xs text-[#666666]">
				Phone OTP is unavailable right now.
			</div>
		);
	}

	const sendOtp = async () => {
		const e164 = normalizePhoneToE164(phoneInput);
		if (!/^\+[1-9]\d{9,14}$/.test(e164)) {
			toast.error("Enter a valid phone number with country code");
			return;
		}

		try {
			setSendingOtp(true);
			const result = await sendPhoneOtpFirebase({
				phoneNumber: e164,
				recaptchaContainerId,
			});
			setConfirmationResult(result);
			toast.success("OTP sent successfully");
		} catch (error) {
			toast.error(getOtpErrorMessage(error));
		}
		setSendingOtp(false);
	};

	const verifyOtp = async () => {
		if (!confirmationResult) return;
		if (!otp.trim()) {
			toast.error("Enter OTP");
			return;
		}

		try {
			setVerifyingOtp(true);
			const result = await confirmationResult.confirm(otp.trim());
			const idToken = await result.user.getIdToken();
			await onVerified(idToken, result.user);
		} catch (error) {
			toast.error(getOtpErrorMessage(error));
		}
		setVerifyingOtp(false);
	};

	return (
		<div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
			<div className="flex items-center gap-2">
				<input
					type="tel"
					value={phoneInput}
					onChange={(event) => setPhoneInput(event.target.value)}
					placeholder="+91 9876543210"
					disabled={disabled || sendingOtp || verifyingOtp}
					className="h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none"
				/>
				<button
					type="button"
					onClick={sendOtp}
					disabled={disabled || sendingOtp || verifyingOtp}
					className="h-11 shrink-0 rounded-xl bg-black px-3 text-xs font-semibold text-white disabled:opacity-60"
				>
					{sendingOtp ? "Sending..." : buttonLabel}
				</button>
			</div>

			{confirmationResult ? (
				<div className="mt-3 flex items-center gap-2">
					<input
						type="text"
						value={otp}
						onChange={(event) => setOtp(event.target.value)}
						placeholder="Enter OTP"
						disabled={disabled || verifyingOtp}
						className="h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none"
					/>
					<button
						type="button"
						onClick={verifyOtp}
						disabled={disabled || verifyingOtp}
						className="h-11 shrink-0 rounded-xl bg-[#8B7322] px-4 text-xs font-semibold text-white disabled:opacity-60"
					>
						{verifyingOtp ? "Verifying..." : "Verify OTP"}
					</button>
				</div>
			) : null}

			<div id={recaptchaContainerId} />
		</div>
	);
}
