import { useEffect, useState } from "react";
import {
	Building2,
	MapPin,
	Phone,
	Briefcase,
	FileText,
	IndianRupee,
	Image as ImageIcon,
	Store,
	CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { pickArray } from "../utils/api";
import { useAuth } from "../context/useAuth";
import { compressImageFile } from "../utils/imageCompressor";

const getStoredLocationLabel = () =>
	localStorage.getItem("selectedLocation") || "";

const getStoredLocationCoords = () => {
	try {
		const raw = sessionStorage.getItem("selectedLocationCoords");
		if (!raw) return { latitude: "", longitude: "" };
		const parsed = JSON.parse(raw);
		const lat = Number(parsed?.lat);
		const lng = Number(parsed?.lng);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return { latitude: "", longitude: "" };
		}
		return { latitude: String(lat), longitude: String(lng) };
	} catch {
		return { latitude: "", longitude: "" };
	}
};

export default function BusinessPostAd() {
	const navigate = useNavigate();
	const { setCurrentUser } = useAuth();
	const [categories, setCategories] = useState([]);
	const [files, setFiles] = useState([]);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		businessName: "",
		gstin: "",
		category: "",
		adTitle: "",
		description: "",
		price: "",
		contactName: "",
		phone: "",
		address: "",
		website: "",
		latitude: "",
		longitude: "",
	});

	useEffect(() => {
		let active = true;

		const fetchCategories = async () => {
			try {
				const { data } = await api.get("/categories");
				const rows = pickArray(data, ["categories", "data", "items"]);
				if (active) {
					setCategories(rows);
				}
			} catch {
				if (active) {
					setCategories([]);
				}
			}
		};

		fetchCategories();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const syncLocationFromApp = () => {
			const label = getStoredLocationLabel();
			const coords = getStoredLocationCoords();
			setFormData((prev) => ({
				...prev,
				address: prev.address || label,
				latitude: coords.latitude,
				longitude: coords.longitude,
			}));
		};

		syncLocationFromApp();
		window.addEventListener("dealpost:location-changed", syncLocationFromApp);

		return () => {
			window.removeEventListener(
				"dealpost:location-changed",
				syncLocationFromApp,
			);
		};
	}, []);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (event) => {
		const nextFiles = Array.from(event.target.files || []).slice(0, 6);
		setFiles(nextFiles);
	};

	const uploadCompressedImageToR2 = async (file) => {
		const compressed = await compressImageFile(file, {
			maxWidth: 1600,
			maxHeight: 1600,
			quality: 0.8,
			outputType: "image/webp",
		});

		try {
			const { data } = await api.post("/listings/uploads/presign", {
				fileName: compressed.name,
				contentType: compressed.type || file.type || "image/jpeg",
			});

			const uploadUrl = data?.uploadUrl;
			if (!uploadUrl) {
				throw new Error("Failed to get upload URL");
			}

			const response = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": compressed.type || "image/jpeg",
				},
				body: compressed,
			});

			if (!response.ok) {
				throw new Error("Failed to upload image");
			}

			return {
				url: data?.publicUrl,
				public_id: data?.key,
			};
		} catch {
			const uploadForm = new FormData();
			uploadForm.append("image", compressed, compressed.name);

			const { data } = await api.post("/listings/uploads/direct", uploadForm);

			return {
				url: data?.url,
				public_id: data?.public_id,
			};
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.businessName.trim()) {
			return toast.error("Business name is required");
		}
		if (!formData.category.trim()) {
			return toast.error("Business category is required");
		}
		if (!formData.adTitle.trim()) {
			return toast.error("Ad title is required");
		}
		if (!formData.description.trim()) {
			return toast.error("Description is required");
		}
		if (!formData.price || Number(formData.price) <= 0) {
			return toast.error("Please provide a valid price");
		}
		if (!formData.contactName.trim()) {
			return toast.error("Contact person is required");
		}
		if (!formData.phone.trim()) {
			return toast.error("Phone number is required");
		}
		if (!formData.address.trim()) {
			return toast.error("Business address is required");
		}

		try {
			setSubmitting(true);

			const profilePayload = {
				accountType: "business",
				gstOrMsme: formData.gstin.trim(),
				businessName: formData.businessName.trim(),
				location: formData.address.trim(),
			};

			const { data: userData } = await api.put("/users/me", profilePayload);
			if (userData?.user) {
				setCurrentUser(userData.user);
			}

			const uploadedImages = files.length
				? await Promise.all(
						files.map((file) => uploadCompressedImageToR2(file)),
					)
				: [];

			const payload = {
				title: formData.adTitle.trim(),
				description: formData.description.trim(),
				price: Number(formData.price),
				category: formData.category.trim(),
				address: formData.address.trim(),
				latitude: formData.latitude || undefined,
				longitude: formData.longitude || undefined,
				additionalNotes: formData.website
					? `Website: ${formData.website.trim()} | Contact: ${formData.contactName.trim()} | Phone: ${formData.phone.trim()}`
					: `Contact: ${formData.contactName.trim()} | Phone: ${formData.phone.trim()}`,
				specs: {
					BusinessName: formData.businessName.trim(),
					GSTIN: formData.gstin.trim() || "N/A",
					ContactPerson: formData.contactName.trim(),
					Phone: formData.phone.trim(),
					Website: formData.website.trim() || "N/A",
				},
				images: uploadedImages,
			};

			const { data } = await api.post("/listings", payload);
			const listingId = data?.listing?._id || data?.listing?.id;
			toast.success("Business ad posted successfully");

			if (listingId) {
				navigate(`/listing/${listingId}`);
			}
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to post business ad",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8F9FA] font-sans text-black flex flex-col">
			<Navbar />

			<main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 flex-1">
				<div className="mb-8">
					<div className="inline-flex items-center gap-2 rounded-full border border-[#FFD600]/50 bg-[#FFD600]/10 px-3 py-1.5 mb-4">
						<Store size={14} className="text-[#D4B200]" />
						<span className="text-xs font-bold tracking-wider text-[#D4B200] uppercase">
							Verified Business Portal
						</span>
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
						Post a Business Ad
					</h1>
					<p className="mt-2 text-lg text-[#666666]">
						Reach thousands of local customers. Fill in your commercial details
						to create a trusted listing.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Section 1: Business Details */}
					<section className="rounded-2xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm">
						<h2 className="flex items-center gap-2 text-xl font-bold text-black mb-6 border-b border-[#F0F0F0] pb-4">
							<Building2 size={24} className="text-[#FFD600]" />
							Business Information
						</h2>

						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Business / Company Name *
								</label>
								<input
									type="text"
									name="businessName"
									required
									value={formData.businessName}
									onChange={handleChange}
									placeholder="e.g. Sharma Electronics Ltd."
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
								/>
							</div>

							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									GSTIN / Registration Number (Optional)
								</label>
								<input
									type="text"
									name="gstin"
									value={formData.gstin}
									onChange={handleChange}
									placeholder="e.g. 22AAAAA0000A1Z5"
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
								/>
							</div>

							<div className="sm:col-span-2">
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Business Category *
								</label>
								<select
									name="category"
									required
									value={formData.category}
									onChange={handleChange}
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all appearance-none"
								>
									<option value="">Select a category</option>
									{categories.map((category) => {
										const name = String(category?.name || "").trim();
										if (!name) return null;
										return (
											<option key={category?.id || name} value={name}>
												{name}
											</option>
										);
									})}
								</select>
							</div>
						</div>
					</section>

					{/* Section 2: Listing Details */}
					<section className="rounded-2xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm">
						<h2 className="flex items-center gap-2 text-xl font-bold text-black mb-6 border-b border-[#F0F0F0] pb-4">
							<Briefcase size={24} className="text-[#FFD600]" />
							Listing Details
						</h2>

						<div className="space-y-6">
							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Ad Title *
								</label>
								<input
									type="text"
									name="adTitle"
									required
									value={formData.adTitle}
									onChange={handleChange}
									placeholder="e.g. Brand New Office Chairs - Bulk Order Discount"
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
								/>
							</div>

							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Description *
								</label>
								<textarea
									name="description"
									required
									rows={5}
									value={formData.description}
									onChange={handleChange}
									placeholder="Include key details like specifications, warranty, bulk pricing, and terms of service..."
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all resize-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Price (₹) *
								</label>
								<div className="relative">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
										<IndianRupee size={16} className="text-[#888888]" />
									</div>
									<input
										type="number"
										name="price"
										required
										value={formData.price}
										onChange={handleChange}
										placeholder="0.00"
										className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] pl-10 pr-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
									/>
								</div>
								<p className="mt-1.5 text-xs text-[#888888]">
									Leave as 0 if you want buyers to 'Contact for Price'
								</p>
							</div>
						</div>
					</section>

					{/* Section 3: Media Upload */}
					<section className="rounded-2xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm">
						<h2 className="flex items-center gap-2 text-xl font-bold text-black mb-6 border-b border-[#F0F0F0] pb-4">
							<ImageIcon size={24} className="text-[#FFD600]" />
							Product/Service Images
						</h2>

						<div className="flex justify-center rounded-xl border-2 border-dashed border-[#CCCCCC] bg-[#FAFAFA] px-6 py-12 hover:bg-[#F0F0F0]/50 transition cursor-pointer">
							<div className="text-center">
								<ImageIcon size={40} className="mx-auto text-[#A3A3A3] mb-3" />
								<div className="mt-4 flex text-sm leading-6 text-[#666666]">
									<label className="relative cursor-pointer rounded-md font-bold text-[#f5c518] focus-within:outline-none hover:text-[#dcae10]">
										<span>Upload files</span>
										<input
											type="file"
											multiple
											className="sr-only"
											accept="image/*"
											onChange={handleFileChange}
										/>
									</label>
									<p className="pl-1">or drag and drop</p>
								</div>
								<p className="text-xs leading-5 text-[#888888] mt-2">
									PNG, JPG, GIF up to 5MB. Include images of your storefront or
									products.
								</p>
							</div>
						</div>
					</section>

					{/* Section 4: Contact & Location */}
					<section className="rounded-2xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm">
						<h2 className="flex items-center gap-2 text-xl font-bold text-black mb-6 border-b border-[#F0F0F0] pb-4">
							<MapPin size={24} className="text-[#FFD600]" />
							Contact & Location
						</h2>

						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Contact Person *
								</label>
								<input
									type="text"
									name="contactName"
									required
									value={formData.contactName}
									onChange={handleChange}
									placeholder="e.g. Rahul Verma"
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
								/>
							</div>

							<div>
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Phone Number *
								</label>
								<div className="relative">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
										<Phone size={16} className="text-[#888888]" />
									</div>
									<input
										type="tel"
										name="phone"
										required
										value={formData.phone}
										onChange={handleChange}
										placeholder="+91 00000 00000"
										className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] pl-10 pr-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all"
									/>
								</div>
							</div>

							<div className="sm:col-span-2">
								<label className="block text-sm font-bold text-[#333333] mb-2">
									Business Address *
								</label>
								<textarea
									name="address"
									required
									rows={2}
									value={formData.address}
									onChange={handleChange}
									placeholder="e.g. Shop No. 12, Main Market..."
									className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3 text-sm focus:border-[#FFD600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/20 transition-all resize-none"
								/>
							</div>
						</div>
					</section>

					{/* Submit Area */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EAEAEA]">
						<p className="text-xs text-[#888888] flex items-center gap-1.5">
							<CheckCircle2 size={14} className="text-green-500" />
							By posting, you agree to our Business Terms & Conditions.
						</p>
						<button
							type="submit"
							disabled={submitting}
							className="w-full sm:w-auto rounded-full bg-[#f5c518] px-10 py-4 text-sm font-bold text-black hover:bg-[#dcae10] transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-[#f5c518]"
						>
							{submitting ? "Posting..." : "Post Business Ad"}
						</button>
					</div>
				</form>
			</main>

			<Footer />
		</div>
	);
}
