import {
	ArrowRight,
	Briefcase,
	Car,
	ChevronRight,
	Dog,
	HeartPulse,
	Home as HomeIcon,
	Monitor,
	Shirt,
	Sofa,
	Trophy,
	Utensils,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const CATEGORY_DATA = [
	{
		id: "electronics",
		name: "Electronics",
		icon: Monitor,
		groups: [
			{
				name: "Mobile Phones",
				items: [
					"All Mobile Phones",
					"Tablets",
					"E-Readers",
					"Wearables & Smart Watches",
					"Mobile & Gadget Accessories",
					"Walkie-Talkies",
					"Other Gadgets",
				],
			},
			{
				name: "Computers & Tech",
				items: [
					"All Computers & Tech",
					"Laptops & Notebooks",
					"Desktops",
					"Parts & Accessories",
					"Printers",
					"Scanners & Copiers",
					"Office & Business Technology",
					"Rentals",
				],
			},
			{
				name: "Video Gaming",
				items: [
					"All Video Gaming",
					"Video Game Consoles",
					"Video Games",
					"Gaming Accessories",
				],
			},
			{
				name: "TV & Home Appliances",
				items: [
					"All TV & Home Appliances",
					"TV & Entertainment Systems",
					"Kitchen Appliances",
					"Household Appliances",
					"Rentals",
				],
			},
			{
				name: "Audio-Visual (AV) Equipment",
				items: [
					"All AV Equipment",
					"Cameras",
					"Lens & Kits",
					"Drones",
					"Video Cameras",
					"Photography Accessories",
					"Earphones",
					"Headphones & Headsets",
					"Microphones",
					"Soundbars",
					"Speakers & Amplifiers",
					"Portable Music Players",
					"Rentals",
				],
			},
		],
	},
	{
		id: "fashion-beauty",
		name: "Fashion & Beauty",
		icon: Shirt,
		groups: [
			{
				name: "Women's Fashion",
				items: [
					"All Women's Fashion",
					"Activewear",
					"Maternity Wear",
					"Tops",
					"Bottoms",
					"Dresses & Sets",
					"Footwear",
					"Swimwear",
					"Coats & Outerwear",
					"Bags & Wallets",
					"Jewelry & Organizers",
					"Watches & Accessories",
					"Undergarments & Loungewear",
				],
			},
			{
				name: "Men's Fashion",
				items: [
					"All Men's Fashion",
					"Activewear",
					"Tops & Sets",
					"Bottoms",
					"Footwear",
					"Coats & Outerwear",
					"Bags",
					"Watches & Accessories",
				],
			},
			{
				name: "Luxury",
				items: [
					"All Luxury",
					"Luxury Bags & Wallets",
					"Luxury Apparel",
					"Luxury Accessories",
					"Luxury Watches",
					"Luxury Sneakers & Footwear",
				],
			},
			{
				name: "Beauty & Personal Care",
				items: [
					"All Beauty & Personal Care",
					"Fragrance & Deodorants",
					"Bath & Body",
					"Face",
					"Hair Products",
					"Men's Grooming",
					"Hands & Nails",
					"Vision Care",
					"Oral Care",
				],
			},
		],
	},
	{
		id: "vehicles",
		name: "Vehicles",
		icon: Car,
		groups: [
			{
				name: "Cars",
				items: [
					"All Cars",
					"Used Cars",
					"New Cars",
					"Parallel Imports",
					"Car Rental",
					"Other Vehicles",
				],
			},
			{
				name: "Car Accessories",
				items: ["All Car Accessories", "Parts", "Accessories", "Car Care"],
			},
			{
				name: "Motorcycles",
				items: [
					"All Motorcycles",
					"Motorcycles for Sale",
					"Accessories",
					"Apparel",
					"Rental",
				],
			},
			{
				name: "Commercial Vehicles & Spares",
				items: [
					"All Commercial Vehicles",
					"Trucks",
					"Pick-up Vans",
					"Tractors",
					"Taxi Cabs",
					"Auto-rickshaws",
					"Buses",
					"Heavy Machinery",
					"Wheels & Tyres",
					"Audio & Other Accessories",
					"Battery",
				],
			},
		],
	},
	{
		id: "property",
		name: "Property",
		icon: HomeIcon,
		groups: [
			{
				name: "For Sale",
				items: [
					"All For Sale",
					"Houses & Apartments",
					"Shops, Offices & Warehouses",
					"Lands & Plots",
				],
			},
			{
				name: "For Rent",
				items: [
					"All For Rent",
					"Houses & Apartments",
					"Shops, Offices & Warehouses",
					"Lands & Plots",
				],
			},
			{
				name: "Commercial & Venues",
				items: [
					"All Commercial & Venues",
					"Marriage & Community Halls",
					"PG & Guest Houses",
					"Resorts & Clubs",
					"Hotels",
					"Bars",
				],
			},
		],
	},
	{
		id: "sports",
		name: "Sports",
		icon: Trophy,
		groups: [
			{
				name: "Sports Equipment",
				items: [
					"All Sports Equipment",
					"Bicycles",
					"Fitness Equipment",
					"Team Sports",
					"Racket Sports",
					"Camping & Hiking",
					"Turfs/Courts/Stadiums/Grounds/Tracks",
				],
			},
		],
	},
	{
		id: "food-drinks",
		name: "Food & Drinks",
		icon: Utensils,
		groups: [
			{
				name: "Dining & Groceries",
				items: [
					"All Dining & Groceries",
					"Restaurants",
					"Local Eats",
					"Packaged Food",
					"Beverages",
					"Fresh Produce",
					"Homemade Bakes",
				],
			},
		],
	},
	{
		id: "health-wellness",
		name: "Health & Wellness",
		icon: HeartPulse,
		groups: [
			{
				name: "Wellness",
				items: [
					"All Wellness",
					"Gym & Fitness",
					"Nutrition Products",
					"Natural Products",
					"Hospitals & Clinics",
				],
			},
		],
	},
	{
		id: "pets",
		name: "Pet Supplies",
		icon: Dog,
		groups: [
			{
				name: "Pets & Accessories",
				items: [
					"All Pet Supplies",
					"Pets",
					"Pet food & Accessories",
					"Fish & Aquarium",
				],
			},
		],
	},
	{
		id: "services",
		name: "Services",
		icon: Briefcase,
		groups: [
			{
				name: "General Services",
				items: [
					"All Services",
					"Education & Classes",
					"Electronics Repair",
					"Home Renovation, Repair & Cleaning",
					"Vehicle Service",
					"Salon, Spa & Sauna",
					"Taxi & Tourist Services",
					"Call Driver",
					"Guides",
					"Packers & Movers",
					"Maids & Nurses",
					"Funeral Services",
				],
			},
		],
	},
	{
		id: "lifestyle",
		name: "Home & Lifestyle",
		icon: Sofa,
		groups: [
			{
				name: "Lifestyle & Decor",
				items: [
					"All Lifestyle",
					"Bathroom & Kitchen Accessories",
					"Flowers & Bouquets",
					"Religious Items",
					"Travel",
				],
			},
		],
	},
];

export default function Categories() {
	const [activeCategory, setActiveCategory] = useState(CATEGORY_DATA[0].id);

	// Get the currently selected category object
	const currentCategory = CATEGORY_DATA.find((c) => c.id === activeCategory);

	return (
		<div className="min-h-screen bg-[#F6F6F6] font-sans text-black flex flex-col">
			<Navbar />

			<main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
				{/* Left Sidebar Navigation */}
				<aside className="w-full md:w-72 flex-shrink-0">
					<h1 className="text-3xl font-bold mb-6">Categories</h1>
					<nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
						{CATEGORY_DATA.map((cat) => (
							<button
								key={cat.id}
								onClick={() => setActiveCategory(cat.id)}
								className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all whitespace-nowrap md:whitespace-normal ${
									activeCategory === cat.id
										? "bg-[#FFD600] text-black font-bold shadow-sm"
										: "hover:bg-white text-[#666666] hover:text-black font-medium"
								}`}
							>
								<cat.icon
									size={20}
									className={
										activeCategory === cat.id ? "text-black" : "text-[#A3A3A3]"
									}
								/>
								{cat.name}
							</button>
						))}
					</nav>
				</aside>

				{/* Right Content Area */}
				<section className="flex-1">
					<div className="bg-white rounded-[32px] p-6 md:p-10 shadow-sm border border-gray-100 min-h-[700px]">
						{/* Header for Active Category */}
						<div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100">
							<div className="h-16 w-16 rounded-2xl bg-[#FFF9E6] flex items-center justify-center text-[#FFD600]">
								{currentCategory && (
									<currentCategory.icon size={32} className="text-[#B39500]" />
								)}
							</div>
							<div>
								<h2 className="text-[2rem] font-bold text-black leading-tight">
									{currentCategory?.name}
								</h2>
								<p className="text-[#888888] text-sm mt-1 font-medium">
									Browse all subcategories and items
								</p>
							</div>
						</div>

						{/* Grid of Subcategories */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
							{currentCategory?.groups.map((group) => (
								<div key={group.name} className="flex flex-col">
									<h3 className="text-[1.1rem] font-bold mb-4 text-black border-l-4 border-[#FFD600] pl-3">
										{group.name}
									</h3>

									<ul className="space-y-1">
										{group.items.map((item, index) => (
											<li key={item}>
												<Link
													to={`/explore?category=${encodeURIComponent(item)}`}
													className={`py-1.5 flex items-center gap-2 group transition-colors ${
														index === 0
															? "text-[0.95rem] font-bold text-black mb-1"
															: "text-[0.9rem] text-[#666666] hover:text-black font-medium"
													}`}
												>
													{index === 0 ? (
														<ArrowRight size={14} className="text-[#FFD600]" />
													) : (
														<ChevronRight
															size={14}
															className="opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[#FFD600]"
														/>
													)}
													{item}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
