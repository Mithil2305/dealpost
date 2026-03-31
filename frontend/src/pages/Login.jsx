import { Eye, EyeOff, MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import GoogleAuthButton from "../components/GoogleAuthButton";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";

export default function Login() {
	const navigate = useNavigate();
	const { login, loginWithGoogle } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
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

	const onGoogleAuth = useCallback(
		async (credential) => {
			try {
				setSubmitting(true);
				await loginWithGoogle({ credential });
				toast.success("Welcome back");
				navigate("/");
			} catch (error) {
				toast.error(
					error?.response?.data?.message || "Unable to continue with Google",
				);
			} finally {
				setSubmitting(false);
			}
		},
		[loginWithGoogle, navigate],
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
						aria-labelledby="login-heading"
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
						</div>
					</section>
				</div>
			</div>

			<Footer variant="auth" />
		</main>
	);
}
