import { useEffect, useRef, useState } from "react";

const GOOGLE_GSI_SCRIPT = "https://accounts.google.com/gsi/client";
let googleScriptPromise;

function loadGoogleScript() {
	if (window.google?.accounts?.id) {
		return Promise.resolve();
	}

	if (googleScriptPromise) {
		return googleScriptPromise;
	}

	googleScriptPromise = new Promise((resolve, reject) => {
		const existing = document.querySelector(
			`script[src="${GOOGLE_GSI_SCRIPT}"]`,
		);
		if (existing) {
			existing.addEventListener("load", () => resolve(), { once: true });
			existing.addEventListener(
				"error",
				() => reject(new Error("Failed to load Google Identity Services")),
				{ once: true },
			);
			return;
		}

		const script = document.createElement("script");
		script.src = GOOGLE_GSI_SCRIPT;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () =>
			reject(new Error("Failed to load Google Identity Services"));
		document.head.appendChild(script);
	});

	return googleScriptPromise;
}

export default function GoogleAuthButton({
	onCredential,
	text = "signin_with",
	disabled = false,
	className = "",
}) {
	const buttonContainerRef = useRef(null);
	const [isReady, setIsReady] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	useEffect(() => {
		let cancelled = false;

		const renderButton = () => {
			if (!buttonContainerRef.current || !window.google?.accounts?.id) return;
			buttonContainerRef.current.innerHTML = "";
			window.google.accounts.id.renderButton(buttonContainerRef.current, {
				type: "standard",
				theme: "outline",
				size: "large",
				text,
				shape: "pill",
				logo_alignment: "left",
				width: Math.max(buttonContainerRef.current.offsetWidth || 280, 240),
			});
		};

		const setup = async () => {
			setErrorMessage("");
			setIsReady(false);

			if (!clientId) {
				setErrorMessage("Google sign-in is unavailable right now.");
				return;
			}

			try {
				await loadGoogleScript();
				if (cancelled || !window.google?.accounts?.id) return;

				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: (response) => {
						if (response?.credential) {
							onCredential(response.credential);
						}
					},
				});

				renderButton();
				if (!cancelled) {
					setIsReady(true);
				}
			} catch {
				if (!cancelled) {
					setErrorMessage("Google sign-in failed to initialize.");
				}
			}
		};

		setup();

		const onResize = () => {
			if (isReady) {
				renderButton();
			}
		};
		window.addEventListener("resize", onResize);

		return () => {
			cancelled = true;
			window.removeEventListener("resize", onResize);
		};
	}, [clientId, isReady, onCredential, text]);

	return (
		<div className={className}>
			<div
				className={`w-full overflow-hidden rounded-full ${
					disabled ? "opacity-60 pointer-events-none" : ""
				}`}
				ref={buttonContainerRef}
			/>
			{!errorMessage && !isReady ? (
				<div className="mt-2 text-center text-xs text-[#888888]">
					Loading Google sign-in...
				</div>
			) : null}
			{errorMessage ? (
				<div className="mt-2 text-center text-xs text-[#A33A3A]">
					{errorMessage}
				</div>
			) : null}
		</div>
	);
}
