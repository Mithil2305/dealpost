import { Eye, EyeOff, MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import GoogleAuthButton from "../components/GoogleAuthButton";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";

export default function Signup() {
	const navigate = useNavigate();
	const { signup, loginWithGoogle } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showValidation, setShowValidation] = useState(false);
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
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
			form.password.length < 6 ? "Password must be at least 6 characters" : "",
		businessName:
			form.accountType === "business" && !form.businessName.trim()
				? "Business name is required"
				: "",
		gstOrMsme:
			form.accountType === "business" && !form.gstOrMsme.trim()
				? "GST/MSME number is required"
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

			if (form.accountType === "business") {
				payload.business = {
					name: form.businessName,
					gstOrMsme: form.gstOrMsme,
					location: form.location,
				};
			}

			const result = await signup(payload);

			if (!result?.user) {
				throw new Error("Missing user profile in signup response");
			}

			toast.success("Welcome to Deal Post");
			navigate(form.accountType === "business" ? "/business-listings" : "/");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to create account");
		} finally {
			setSubmitting(false);
		}
	};

	const onGoogleAuth = useCallback(
		async (credential) => {
			try {
				setSubmitting(true);
				const payload = {
					credential,
					accountType: form.accountType,
				};

				if (form.accountType === "business") {
					payload.business = {
						name: form.businessName,
						gstOrMsme: form.gstOrMsme,
						location: form.location,
					};
				}

				await loginWithGoogle(payload);
				toast.success("Welcome to Deal Post");
				navigate(form.accountType === "business" ? "/business-listings" : "/");
			} catch (error) {
				toast.error(
					error?.response?.data?.message || "Unable to continue with Google",
				);
			} finally {
				setSubmitting(false);
			}
		},
		[
			form.accountType,
			form.businessName,
			form.gstOrMsme,
			form.location,
			loginWithGoogle,
			navigate,
		],
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
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD600]">
								<MapPin size={16} className="text-black" fill="black" />
							</div>
							<div className="text-white text-xl">
								<span className="font-bold">Deal.</span>
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
									<span className="font-bold">Deal.</span>
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
								<GoogleAuthButton
									onCredential={onGoogleAuth}
									text="continue_with"
									disabled={submitting}
								/>
							</div>

							<div className="flex items-center gap-4 mb-8">
								<div className="h-px bg-[#E5E5E5] flex-1" />
								<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
									OR EMAIL
								</span>
								<div className="h-px bg-[#E5E5E5] flex-1" />
							</div>

							<form className="space-y-5" onSubmit={onSubmit} noValidate>
								{showValidation &&
								(errors.name ||
									errors.email ||
									errors.password ||
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
											placeholder="Chennai"
											error={showValidation ? errors.location : ""}
											required
										/>
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
