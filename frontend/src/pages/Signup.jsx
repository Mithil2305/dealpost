import { Eye, EyeOff, MapPin } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";

const GoogleIcon = () => (
	<svg viewBox="0 0 48 48" className="h-5 w-5">
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
);

const AppleIcon = () => (
	<svg viewBox="0 0 384 512" fill="currentColor" className="h-5 w-5 text-black">
		<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
	</svg>
);

export default function Signup() {
	const navigate = useNavigate();
	const { signup } = useAuth();
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		accountType: "personal",
		businessName: "",
		gstOrMsme: "",
		location: "",
	});

	const onChange = (event) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const onSubmit = async (event) => {
		event.preventDefault();

		if (!form.name.trim()) return toast.error("Full name is required");
		if (!form.email.includes("@"))
			return toast.error("A valid email is required");
		if (form.password.length < 6)
			return toast.error("Password must be at least 6 characters");
		if (form.accountType === "business") {
			if (!form.businessName.trim())
				return toast.error("Business name is required");
			if (!form.gstOrMsme.trim())
				return toast.error("GST/MSME number is required");
			if (!form.location.trim())
				return toast.error("Business location is required");
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

			toast.success("Welcome to Deal.Post");
			navigate(form.accountType === "business" ? "/business-listings" : "/");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to create account");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="min-h-screen bg-[#F6F6F6] flex flex-col justify-between p-4 md:p-8 font-sans">
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
					<section className="w-full md:w-[55%] p-8 md:p-14 lg:p-20 flex flex-col justify-center bg-white">
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

							<h2 className="text-[2rem] font-bold text-black mb-2">
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

							<div className="grid grid-cols-2 gap-4 mb-8">
								<button
									type="button"
									onClick={() => toast("OAuth available soon")}
									className="flex items-center justify-center gap-2 bg-[#F1F1F1] rounded-xl h-12 text-[0.9rem] font-semibold text-black hover:bg-[#E5E5E5] transition"
								>
									<GoogleIcon /> Google
								</button>
								<button
									type="button"
									onClick={() => toast("OAuth available soon")}
									className="flex items-center justify-center gap-2 bg-[#F1F1F1] rounded-xl h-12 text-[0.9rem] font-semibold text-black hover:bg-[#E5E5E5] transition"
								>
									<AppleIcon /> Apple
								</button>
							</div>

							<div className="flex items-center gap-4 mb-8">
								<div className="h-px bg-[#E5E5E5] flex-1" />
								<span className="text-[0.7rem] font-bold text-[#A3A3A3] tracking-[0.15em]">
									OR EMAIL
								</span>
								<div className="h-px bg-[#E5E5E5] flex-1" />
							</div>

							<form className="space-y-5" onSubmit={onSubmit}>
								<div>
									<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
										Profile Type
									</label>
									<div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F1F1] p-1">
										<button
											type="button"
											onClick={() =>
												setForm((prev) => ({
													...prev,
													accountType: "personal",
												}))
											}
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

								<div>
									<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
										Full Name
									</label>
									<input
										name="name"
										value={form.name}
										onChange={onChange}
										className="w-full bg-[#F1F1F1] rounded-xl h-12 px-4 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
										placeholder="John Doe"
									/>
								</div>

								<div>
									<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
										Email Address
									</label>
									<input
										name="email"
										type="email"
										value={form.email}
										onChange={onChange}
										className="w-full bg-[#F1F1F1] rounded-xl h-12 px-4 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
										placeholder="name@domain.com"
									/>
								</div>

								<div>
									<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
										Password
									</label>
									<div className="relative">
										<input
											name="password"
											type={showPassword ? "text" : "password"}
											value={form.password}
											onChange={onChange}
											className="w-full bg-[#F1F1F1] rounded-xl h-12 pl-4 pr-12 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
											placeholder="••••••••"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((prev) => !prev)}
											className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-black transition"
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
								</div>

								{form.accountType === "business" && (
									<>
										<div>
											<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
												Business Name
											</label>
											<input
												name="businessName"
												value={form.businessName}
												onChange={onChange}
												className="w-full bg-[#F1F1F1] rounded-xl h-12 px-4 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
												placeholder="Acme Store"
											/>
										</div>

										<div>
											<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
												GST / MSME No.
											</label>
											<input
												name="gstOrMsme"
												value={form.gstOrMsme}
												onChange={onChange}
												className="w-full bg-[#F1F1F1] rounded-xl h-12 px-4 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
												placeholder="27ABCDE1234F1Z5"
											/>
										</div>

										<div>
											<label className="block text-[0.7rem] font-bold tracking-[0.1em] text-[#666666] uppercase mb-2">
												Location
											</label>
											<input
												name="location"
												value={form.location}
												onChange={onChange}
												className="w-full bg-[#F1F1F1] rounded-xl h-12 px-4 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50"
												placeholder="Chennai"
											/>
										</div>
									</>
								)}

								<button
									disabled={submitting}
									type="submit"
									className="w-full bg-[#FFD600] text-black font-bold text-[0.95rem] rounded-full h-12 mt-2 hover:bg-[#E6C100] transition active:scale-[0.98]"
								>
									{submitting ? "Creating Account..." : "START LISTING"}
								</button>
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
