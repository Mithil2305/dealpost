import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env.js";

let firebaseAuthClient = null;

function buildFirebaseCredential() {
	if (
		!env.FIREBASE_PROJECT_ID ||
		!env.FIREBASE_CLIENT_EMAIL ||
		!env.FIREBASE_PRIVATE_KEY
	) {
		return null;
	}

	return cert({
		projectId: env.FIREBASE_PROJECT_ID,
		clientEmail: env.FIREBASE_CLIENT_EMAIL,
		privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
	});
}

export function getFirebaseAuthClient() {
	if (firebaseAuthClient) return firebaseAuthClient;

	const credential = buildFirebaseCredential();
	if (!credential) return null;

	const app = getApps()[0] || initializeApp({ credential });
	firebaseAuthClient = getAuth(app);
	return firebaseAuthClient;
}

export function isFirebaseAdminConfigured() {
	return Boolean(
		env.FIREBASE_PROJECT_ID &&
		env.FIREBASE_CLIENT_EMAIL &&
		env.FIREBASE_PRIVATE_KEY,
	);
}
