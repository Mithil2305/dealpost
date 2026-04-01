import { initializeApp } from "firebase/app";
import {
	GoogleAuthProvider,
	RecaptchaVerifier,
	getRedirectResult,
	signInWithPhoneNumber,
	signInWithPopup,
	signInWithRedirect,
	getAuth,
} from "firebase/auth";

let firebaseApp = null;
let firebaseAuth = null;
const recaptchaByContainer = new Map();

function getFirebaseConfig() {
	return {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
		authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
		projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
		storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
		appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
		messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
	};
}

export function isFirebaseConfigured() {
	const cfg = getFirebaseConfig();
	return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

export function getFirebaseAuthClient() {
	if (!isFirebaseConfigured()) {
		throw new Error("Firebase is not configured");
	}

	if (!firebaseApp) {
		firebaseApp = initializeApp(getFirebaseConfig());
	}

	if (!firebaseAuth) {
		firebaseAuth = getAuth(firebaseApp);
	}

	return firebaseAuth;
}

export async function signInWithGoogleFirebase(options = {}) {
	const { useRedirect = false } = options;
	const auth = getFirebaseAuthClient();
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });

	if (useRedirect) {
		await signInWithRedirect(auth, provider);
		return null;
	}

	const result = await signInWithPopup(auth, provider);
	return result;
}

export async function getGoogleRedirectResultFirebase() {
	const auth = getFirebaseAuthClient();
	return getRedirectResult(auth);
}

function getOrCreateRecaptcha(auth, containerId) {
	const existing = recaptchaByContainer.get(containerId);
	if (existing) {
		return existing;
	}

	const verifier = new RecaptchaVerifier(auth, containerId, {
		size: "invisible",
	});
	recaptchaByContainer.set(containerId, verifier);
	return verifier;
}

function resetRecaptcha(containerId) {
	const existing = recaptchaByContainer.get(containerId);
	if (!existing) return;
	try {
		existing.clear();
	} catch {
		// no-op
	}
	recaptchaByContainer.delete(containerId);
}

export async function sendPhoneOtpFirebase({
	phoneNumber,
	recaptchaContainerId,
}) {
	const auth = getFirebaseAuthClient();
	const verifier = getOrCreateRecaptcha(auth, recaptchaContainerId);

	try {
		await verifier.render();
		return await signInWithPhoneNumber(auth, phoneNumber, verifier);
	} catch (error) {
		resetRecaptcha(recaptchaContainerId);
		throw error;
	}
}

export function normalizePhoneToE164(value, defaultCountryCode = "+91") {
	const raw = String(value || "").trim();
	if (!raw) return "";
	const sanitized = raw.replace(/[\s()-]/g, "");
	if (sanitized.startsWith("+")) return sanitized;
	if (/^\d{10}$/.test(sanitized)) return `${defaultCountryCode}${sanitized}`;
	return sanitized;
}
