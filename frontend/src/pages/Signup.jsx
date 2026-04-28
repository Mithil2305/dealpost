import { Eye, EyeOff, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";
import {
	isFirebaseConfigured,
	normalizePhoneToE164,
	signInWithGoogleFirebase,
} from "../utils/firebaseAuth";
import { isValidGstin, normalizeGstin } from "../utils/gstin";
import { fetchOpenStreetSuggestions } from "../utils/locationHelpers";

const COUNTRY_CODE_OPTIONS = [
	{ value: "+1", label: "+1 (US/CA)" },
	{ value: "+44", label: "+44 (UK)" },
	{ value: "+61", label: "+61 (AU)" },
	{ value: "+65", label: "+65 (SG)" },
	{ value: "+91", label: "+91 (IN)" },
	{ value: "+971", label: "+971 (AE)" },
];

const ENABLE_GSTIN_CHECKSUM =
	String(
		import.meta.env.VITE_ENABLE_GSTIN_CHECKSUM || "false",
	).toLowerCase() === "true";

export default function Signup() {
	const navigate = useNavigate();
	const { signup, loginWithFirebase } = useAuth();
	const showPhoneInput = true;
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showValidation, setShowValidation] = useState(false);
	const [locationSuggestions, setLocationSuggestions] = useState([]);
	const [locationSearching, setLocationSearching] = useState(false);
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		countryCode: "+91",
		phoneNumber: "",
		accountType: "personal",
		businessName: "",
		gstOrMsme: "",
		location: "",
	});

	const errors = {
		name: !form.name.trim() ? "Full name is required" : "",
		email: !form.email
			? "Email is required"
			: !form.email.includes("@")
				? "A valid email is required"
				: "",
		password:
			form.password.length < 8 ? "Password must be at least 8 characters" : "",
		phone: (() => {
			if (!showPhoneInput) return "";
			const e164 = normalizePhoneToE164(form.phoneNumber, form.countryCode);
			if (!form.phoneNumber.trim()) return "Phone number is required";
			if (!/^\+[1-9]\d{9,14}$/.test(e164)) {
				return "Enter a valid phone number";
			}
			return "";
		})(),
		businessName:
			form.accountType === "business" && !form.businessName.trim()
				? "Business name is required"
				: "",
		gstOrMsme:
			form.accountType === "business"
				? !form.gstOrMsme.trim()
					? "GST/MSME number is required"
					: !isValidGstin(form.gstOrMsme, {
								requireChecksum: ENABLE_GSTIN_CHECKSUM,
						  })
						? ENABLE_GSTIN_CHECKSUM
							? "Enter a valid GSTIN (with checksum) or MSME UDYAM number"
							: "Enter a valid GSTIN (e.g. 22AAAAA0000A1Z5) or MSME UDYAM number"
						: ""
				: "",
		location:
			form.accountType === "business" && !form.location.trim()
				? "Business location is required"
				: "",
	};

	const onChange = (event) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	useEffect(() => {
		if (form.accountType !== "business") {
			setLocationSuggestions([]);
			setLocationSearching(false);
			return;
		}

		const query = String(form.location || "").trim();
		if (query.length < 3) {
			setLocationSuggestions([]);
			setLocationSearching(false);
			return;
		}

		const controller = new AbortController();
		const timeoutId = window.setTimeout(async () => {
			try {
				setLocationSearching(true);
				const suggestions = await fetchOpenStreetSuggestions(query, {
					signal: controller.signal,
					limit: 6,
				});
				const seenLabels = new Set();
				const deduped = suggestions.filter((item) => {
					const label = String(item?.label || "")
						.trim()
						.toLowerCase();
					if (label && seenLabels.has(label)) return false;
					if (label) seenLabels.add(label);
					return true;
				});
				setLocationSuggestions(deduped);
			} catch (error) {
				if (error?.name !== "AbortError") {
					setLocationSuggestions([]);
				}
			} finally {
				setLocationSearching(false);
			}
		}, 250);

		return () => {
			controller.abort();
			window.clearTimeout(timeoutId);
		};
	}, [form.accountType, form.location]);

	const onAccountTypeKeyDown = (event, currentType) => {
		if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
			event.preventDefault();
			setForm((prev) => ({
				...prev,
				accountType: currentType === "personal" ? "business" : "personal",
			}));
		}
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		setShowValidation(true);

		if (errors.name) return toast.error(errors.name);
		if (errors.email) return toast.error(errors.email);
		if (errors.password) return toast.error(errors.password);
		if (showPhoneInput && errors.phone) return toast.error(errors.phone);
		if (form.accountType === "business") {
			if (errors.businessName) return toast.error(errors.businessName);
			if (errors.gstOrMsme) return toast.error(errors.gstOrMsme);
			if (errors.location) return toast.error(errors.location);
		}

		try {
			setSubmitting(true);
			const payload = {
				name: form.name,
				email: form.email,
				password: form.password,
				accountType: form.accountType,
			};

			if (showPhoneInput) {
				payload.phone = normalizePhoneToE164(
					form.phoneNumber,
					form.countryCode,
				);
			}

			if (form.accountType === "business") {
				payload.business = {
					name: form.businessName,
					gstOrMsme: normalizeGstin(form.gstOrMsme),
					location: form.location.trim(),
				};
			}

			const result = await signup(payload);

			if (!result?.user) {
				throw new Error("Missing user profile in signup response");
			}

			toast.success("Welcome to Deal Post");
			navigate("/");
		} catch (error) {
			console.error("Signup error:", error);
			toast.error(error?.response?.data?.message || "Unable to create account");
		} finally {
			setSubmitting(false);
		}
	};

	const onGoogleAuth = useCallback(async () => {
		if (!isFirebaseConfigured()) {
			toast.error("Firebase auth is not configured");
			return;
		}

		if (form.accountType === "business") {
			if (errors.businessName) return toast.error(errors.businessName);
			if (errors.gstOrMsme) return toast.error(errors.gstOrMsme);
			if (errors.location) return toast.error(errors.location);
		}

		try {
			setSubmitting(true);
			const result = await signInWithGoogleFirebase();
			const idToken = await result.user.getIdToken();
			const payload = { idToken };

			if (showPhoneInput && form.phoneNumber.trim() && !errors.phone) {
				payload.phone = normalizePhoneToE164(
					form.phoneNumber,
					form.countryCode,
				);
			}

			if (form.accountType === "business") {
				payload.accountType = "business";
				payload.business = {
					name: form.businessName,
					gstOrMsme: normalizeGstin(form.gstOrMsme),
					location: form.location.trim(),
				};
			}

			await loginWithFirebase(payload);
			toast.success("Welcome to Deal Post");
			navigate("/");
		} catch (error) {
			console.error("Google signup error:", error);
			toast.error(
				error?.response?.data?.message || "Unable to continue with Google",
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		errors.businessName,
		errors.gstOrMsme,
		errors.location,
		errors.phone,
		form.accountType,
		form.businessName,
		form.countryCode,
		form.gstOrMsme,
		form.location,
		form.phoneNumber,
		loginWithFirebase,
		navigate,
		showPhoneInput,
	]);

	return (
		<main
			id="main-content"
			className="min-h-[100dvh] bg-[#F6F6F6] flex flex-col justify-between p-4 md:p-8 font-sans"
		>
			<div className="flex-1 flex items-center justify-center">
				<div className="flex w-full max-w-[1100px] bg-white rounded-[32px] overflow-hidden shadow-sm">
					{/* Left Panel (Dark) */}
					<aside className="hidden md:flex flex-col justify-between w-[45%] bg-[#111111] p-12 relative text-white">
						{/* Subtle radial glow */}
						<div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#FFD600] opacity-10 blur-[100px] rounded-full pointer-events-none" />

						<div className="relative z-10 flex items-center gap-2">
							<img src="/logo.png" alt="DealPost Logo" className="h-8 w-8" />
							<div className="text-white text-xl">
								<span className="font-bold">Deal</span>
								<span>Post</span>
							</div>
						</div>

						<div className="relative z-10 my-16">
							<h1 className="text-[3.2rem] leading-[1.05] font-bold tracking-tight mb-6">
								The Digital
								<br />
								<span className="text-[#FFD600]">Gallery</span> of Local
								<br />
								Finds.
							</h1>
							<p className="text-[#888888] text-[1.05rem] max-w-sm leading-relaxed">
								Curated exchanges for the modern collector. Join the most
								exclusive community of buyers and sellers.
							</p>
						</div>

						<div className="relative z-10 flex items-center gap-4">
							<div className="flex -space-x-3">
								<img
									src="https://randomuser.me/api/portraits/men/32.jpg"
									alt="user"
									className="w-10 h-10 rounded-full border-2 border-[#111111] object-cover bg-[#f4dbc0]"
								/>
								<img
									src="https://randomuser.me/api/portraits/women/44.jpg"
									alt="user"
									className="w-10 h-10 rounded-full border-2 border-[#111111] object-cover bg-[#f4dbc0]"
								/>
								<img
									src="https://randomuser.me/api/portraits/women/68.jpg"
									alt="user"
									className="w-10 h-10 rounded-full border-2 border-[#111111] object-cover bg-[#f4dbc0]"
								/>
							</div>
							<span className="text-[#888888] text-sm">
								Joined by 12k+ curators this month
							</span>
						</div>
					</aside>

					{/* Right Panel (Form) */}
					<section
						className="w-full md:w-[55%] p-8 md:p-14 lg:p-20 flex flex-col justify-center bg-white"
						aria-labelledby="signup-heading"
					>
						<div className="max-w-md w-full mx-auto">
							{/* Mobile Logo Fallback */}
							<div className="flex md:hidden items-center gap-2 mb-10">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD600]">
									<MapPin size={16} className="text-black" fill="black" />
								</div>
								<div className="text-black text-xl">
									<span className="font-bold">Deal</span>
									<span>Post</span>
								</div>
							</div>

							<h2
								id="signup-heading"
								className="text-[2rem] font-bold text-black mb-2"
							>
								Create an account
							</h2>
							<p className="text-[#666666] mb-8 text-[0.95rem]">
								Already have an account?{" "}
								<Link
									to="/login"
									className="text-[#8B7322] font-semibold hover:underline"
								>
									Log in
								</Link>
							</p>

							<div className="mb-8">
								<button
									type="button"
									onClick={onGoogleAuth}
									disabled={submitting}
									className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white text-sm font-semibold text-[#333333] transition hover:bg-[#f8f8f8] disabled:opacity-60"
								>
									<svg
										viewBox="0 0 48 48"
										className="h-5 w-5"
										aria-hidden="true"
									>
										<path
											fill="#EA4335"
											d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
										/>
										<path
											fill="#4285F4"
											d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
										/>
										<path
											fill="#FBBC05"
											d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
										/>
										<path
											fill="#34A853"
											d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
										/>
									</svg>
									Continue with Google
								</button>
							</div>

							<div className="flex items-center gap-4 mb-8">
								<div className="h-px bg-[#E5E5E5] flex-1" />
								<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
									OR USE EMAIL SIGNUP
								</span>
								<div className="h-px bg-[#E5E5E5] flex-1" />
							</div>

							<form className="space-y-5" onSubmit={onSubmit} noValidate>
								{showValidation &&
								(errors.name ||
									errors.email ||
									errors.password ||
									errors.phone ||
									errors.businessName ||
									errors.gstOrMsme ||
									errors.location) ? (
									<div
										className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
										role="alert"
										aria-live="polite"
									>
										Please fix the highlighted fields.
									</div>
								) : null}

								<div>
									<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
										Profile Type
									</label>
									<div
										className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F1F1] p-1"
										role="radiogroup"
										aria-label="Profile type"
									>
										<button
											type="button"
											onClick={() =>
												setForm((prev) => ({
													...prev,
													accountType: "personal",
												}))
											}
											onKeyDown={(event) =>
												onAccountTypeKeyDown(event, "personal")
											}
											role="radio"
											aria-checked={form.accountType === "personal"}
											tabIndex={form.accountType === "personal" ? 0 : -1}
											className={`h-10 rounded-lg text-sm font-semibold transition ${
												form.accountType === "personal"
													? "bg-white text-black shadow-sm"
													: "text-[#666666]"
											}`}
										>
											Personal
										</button>
										<button
											type="button"
											onClick={() =>
												setForm((prev) => ({
													...prev,
													accountType: "business",
												}))
											}
											onKeyDown={(event) =>
												onAccountTypeKeyDown(event, "business")
											}
											role="radio"
											aria-checked={form.accountType === "business"}
											tabIndex={form.accountType === "business" ? 0 : -1}
											className={`h-10 rounded-lg text-sm font-semibold transition ${
												form.accountType === "business"
													? "bg-white text-black shadow-sm"
													: "text-[#666666]"
											}`}
										>
											Business
										</button>
									</div>
								</div>

								<FormField
									id="signup-name"
									name="name"
									label="Full Name"
									value={form.name}
									onChange={onChange}
									placeholder="John Doe"
									autoComplete="name"
									error={showValidation ? errors.name : ""}
									required
								/>

								<FormField
									id="signup-email"
									name="email"
									type="email"
									label="Email Address"
									value={form.email}
									onChange={onChange}
									placeholder="name@domain.com"
									autoComplete="email"
									error={showValidation ? errors.email : ""}
									required
								/>

								<FormField
									id="signup-password"
									name="password"
									type={showPassword ? "text" : "password"}
									label="Password"
									value={form.password}
									onChange={onChange}
									placeholder="********"
									autoComplete="new-password"
									hint="Use at least 6 characters."
									error={showValidation ? errors.password : ""}
									required
									rightAdornment={
										<button
											type="button"
											onClick={() => setShowPassword((prev) => !prev)}
											className="grid h-9 w-9 place-items-center rounded-lg text-[#A3A3A3] transition hover:text-black"
											aria-label={
												showPassword ? "Hide password" : "Show password"
											}
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									}
								/>

								{showPhoneInput ? (
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
										<FormField
											id="signup-country-code"
											as="select"
											name="countryCode"
											label="Country Code"
											value={form.countryCode}
											onChange={onChange}
											required
											wrapperClassName="sm:col-span-1"
										>
											{COUNTRY_CODE_OPTIONS.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</FormField>

										<FormField
											id="signup-phone-number"
											name="phoneNumber"
											type="tel"
											label="Phone Number"
											value={form.phoneNumber}
											onChange={onChange}
											placeholder="9876543210"
											autoComplete="tel-national"
											error={showValidation ? errors.phone : ""}
											required
											wrapperClassName="sm:col-span-2"
										/>
									</div>
								) : null}

								{form.accountType === "business" && (
									<>
										<FormField
											id="signup-business-name"
											name="businessName"
											label="Business Name"
											value={form.businessName}
											onChange={onChange}
											placeholder="Acme Store"
											error={showValidation ? errors.businessName : ""}
											required
										/>

										<FormField
											id="signup-gst-msme"
											name="gstOrMsme"
											label="GST / MSME No."
											value={form.gstOrMsme}
											onChange={onChange}
											placeholder="27ABCDE1234F1Z5"
											error={showValidation ? errors.gstOrMsme : ""}
											required
										/>

										<FormField
											id="signup-location"
											name="location"
											label="Location"
											value={form.location}
											onChange={onChange}
											placeholder="Type city/area (e.g. Chennai, T Nagar)"
											error={showValidation ? errors.location : ""}
											autoComplete="off"
											required
										/>

										{locationSearching ? (
											<p className="-mt-3 text-xs text-[#777777]">
												Searching locations...
											</p>
										) : null}

										{locationSuggestions.length > 0 ? (
											<div className="-mt-1 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
												<ul className="max-h-52 overflow-y-auto" role="listbox">
													{locationSuggestions.map((suggestion) => (
														<li key={suggestion.id}>
															<button
																type="button"
																className="w-full px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#F7F7F7]"
																onClick={() => {
																	setForm((prev) => ({
																		...prev,
																		location: suggestion.label,
																	}));
																	setLocationSuggestions([]);
																}}
															>
																{suggestion.label}
															</button>
														</li>
													))}
												</ul>
											</div>
										) : null}
									</>
								)}

								<Button
									disabled={submitting}
									isLoading={submitting}
									type="submit"
									size="lg"
									className="mt-2 w-full rounded-full"
								>
									{submitting ? "Creating Account..." : "START LISTING"}
								</Button>
							</form>

							<p className="text-center text-[0.75rem] text-[#888888] mt-6">
								By signing up, you agree to our{" "}
								<a href="#" className="underline hover:text-black">
									Terms of Service
								</a>{" "}
								and{" "}
								<a href="#" className="underline hover:text-black">
									Privacy Policy
								</a>
								.
							</p>
						</div>
					</section>
				</div>
			</div>

			<Footer variant="auth" />
		</main>
	);
}
