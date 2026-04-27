import { Eye, EyeOff, MapPin } from "lucide-react";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import ResponsiveImage from "../components/ui/ResponsiveImage.jsx";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Skeleton from "../components/ui/Skeleton.jsx";
import { useAuth } from "../context/useAuth";
import {
	getGoogleRedirectResultFirebase,
	isFirebaseConfigured,
	signInWithGoogleFirebase,
} from "../utils/firebaseAuth";

const FirebasePhoneAuthPanel = lazy(
	() => import("../components/FirebasePhoneAuthPanel.jsx"),
);

export default function Login() {
	const navigate = useNavigate();
	const { login, loginWithFirebase } = useAuth();
	const showPhoneLogin = false;
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [isRedirectResolving, setIsRedirectResolving] = useState(
		isFirebaseConfigured(),
	);
	const [showValidation, setShowValidation] = useState(false);
	const [form, setForm] = useState({
		email: "",
		password: "",
	});

	const errors = {
		email: !form.email
			? "Email is required"
			: !form.email.includes("@")
				? "Please enter a valid email"
				: "",
		password: !form.password ? "Password is required" : "",
	};

	const onChange = (event) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		setShowValidation(true);

		if (errors.email) return toast.error(errors.email);
		if (errors.password) return toast.error(errors.password);

		try {
			setSubmitting(true);
			await login(form);
			toast.success("Welcome back");
			navigate("/");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Invalid credentials");
		} finally {
			setSubmitting(false);
		}
	};

	const onGoogleAuth = useCallback(async () => {
		if (!isFirebaseConfigured()) {
			toast.error("Firebase auth is not configured");
			return;
		}

		try {
			setSubmitting(true);
			await signInWithGoogleFirebase({ useRedirect: true });
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to continue with Google",
			);
		} finally {
			setSubmitting(false);
		}
	}, []);

	useEffect(() => {
		let active = true;

		const completeRedirectLogin = async () => {
			if (!isFirebaseConfigured()) return;

			try {
				setSubmitting(true);
				const result = await getGoogleRedirectResultFirebase();
				if (!result?.user || !active) return;

				const idToken = await result.user.getIdToken();
				await loginWithFirebase({ idToken });
				if (!active) return;

				toast.success("Welcome back");
				navigate("/");
			} catch (error) {
				if (!active) return;
				toast.error(
					error?.response?.data?.message || "Unable to continue with Google",
				);
			} finally {
				if (active) {
					setSubmitting(false);
					setIsRedirectResolving(false);
				}
			}
		};

		completeRedirectLogin();
		return () => {
			active = false;
		};
	}, [loginWithFirebase, navigate]);

	const onPhoneVerified = useCallback(
		async (idToken) => {
			try {
				setSubmitting(true);
				await loginWithFirebase({ idToken });
				toast.success("Welcome back");
				navigate("/");
			} catch (error) {
				toast.error(
					error?.response?.data?.message || "Unable to continue with phone",
				);
			} finally {
				setSubmitting(false);
			}
		},
		[loginWithFirebase, navigate],
	);

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
							<ResponsiveImage
								src="/logo.png"
								alt="DealPost Logo"
								width={32}
								height={32}
								loading="eager"
								fetchPriority="high"
								className="h-8 w-8"
							/>
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
									width="40"
									height="40"
									className="w-10 h-10 rounded-full border-2 border-[#111111] object-cover bg-[#f4dbc0]"
								/>
								<img
									src="https://randomuser.me/api/portraits/women/44.jpg"
									alt="user"
									width="40"
									height="40"
									className="w-10 h-10 rounded-full border-2 border-[#111111] object-cover bg-[#f4dbc0]"
								/>
								<img
									src="https://randomuser.me/api/portraits/women/68.jpg"
									alt="user"
									width="40"
									height="40"
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
						aria-labelledby="login-heading"
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

							{isRedirectResolving ? (
								<div className="space-y-6" aria-busy="true">
									<Skeleton className="h-10 w-1/2 rounded-full" />
									<Skeleton className="h-4 w-2/3 rounded-full" />
									<Skeleton className="h-12 w-full rounded-full" />
									<Skeleton className="h-px w-full rounded-none" />
									<Skeleton className="h-16 w-full rounded-2xl" />
									<Skeleton className="h-16 w-full rounded-2xl" />
									<Skeleton className="h-12 w-full rounded-full" />
								</div>
							) : (
								<>
									<h2
										id="login-heading"
										className="text-[2rem] font-bold text-black mb-2"
									>
										Log in
									</h2>
									<p className="text-[#666666] mb-8 text-[0.95rem]">
										New here?{" "}
										<Link
											to="/signup"
											className="text-[#8B7322] font-semibold hover:underline"
										>
											Create an account
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

							{showPhoneLogin ? (
								<>
									<div className="flex items-center gap-4 mb-8">
										<div className="h-px bg-[#E5E5E5] flex-1" />
										<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
											OR PHONE OTP
										</span>
										<div className="h-px bg-[#E5E5E5] flex-1" />
									</div>

									<div className="mb-8">
										<Suspense
											fallback={<Skeleton className="h-[122px] w-full rounded-2xl" />}
										>
											<FirebasePhoneAuthPanel
												onVerified={onPhoneVerified}
												disabled={submitting}
												buttonLabel="Send OTP"
											/>
										</Suspense>
									</div>

									<div className="flex items-center gap-4 mb-8">
										<div className="h-px bg-[#E5E5E5] flex-1" />
										<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
											OR EMAIL
										</span>
										<div className="h-px bg-[#E5E5E5] flex-1" />
									</div>
								</>
							) : (
								<div className="flex items-center gap-4 mb-8">
									<div className="h-px bg-[#E5E5E5] flex-1" />
									<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
										OR EMAIL
									</span>
									<div className="h-px bg-[#E5E5E5] flex-1" />
								</div>
							)}

							<form className="space-y-5" onSubmit={onSubmit} noValidate>
								{showValidation && (errors.email || errors.password) ? (
									<div
										className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
										role="alert"
										aria-live="polite"
									>
										Please fix the highlighted fields.
									</div>
								) : null}

								<FormField
									id="login-email"
									name="email"
									type="email"
									label="Email Address"
									autoComplete="email"
									placeholder="name@domain.com"
									value={form.email}
									onChange={onChange}
									error={showValidation ? errors.email : ""}
									required
								/>

								<FormField
									id="login-password"
									name="password"
									type={showPassword ? "text" : "password"}
									label="Password"
									autoComplete="current-password"
									placeholder="********"
									value={form.password}
									onChange={onChange}
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

								<Button
									disabled={submitting}
									isLoading={submitting}
									type="submit"
									size="lg"
									className="mt-2 w-full rounded-full"
								>
									{submitting ? "Signing In..." : "START LISTING"}
								</Button>
							</form>
								</>
							)}
						</div>
					</section>
				</div>
			</div>

			<Footer variant="auth" />
		</main>
	);
}
