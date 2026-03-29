import { connectDB, models, sequelize } from "../src/config/db.js";
import { DEFAULT_CATEGORIES } from "../src/constants/defaultCategories.js";
import { slugify } from "../src/utils/slugify.js";
import { Op } from "sequelize";

const FIXED_CATEGORY_PATHS = [
	"Vehicles > Cars > Used Cars",
	"Vehicles > Motorcycles > Motorcycles for Sale",
	"Property > For Sale: Houses & Apartments",
	"Property > For Rent: Houses & Apartments",
	"Electronics > TV & Home Appliances > Kitchen Appliances",
	"Electronics > Computers & Tech > Laptops & Notebooks",
	"Electronics > Mobile Phones",
	"Vehicles > Commercial Vehicles & Spares > Trucks",
	"Services > Education & Classes",
	"Services > Electronics Repair",
	"Fashion & Beauty > Women's Fashion > Dresses & Sets",
	"Fashion & Beauty > Men's Fashion > Tops & Sets",
	"Pet Supplies > Pets",
	"Sports > Fitness Equipment",
	"Miscellaneous / Other (Extracted from middle/back) > Travel",
	"Food & Drinks > Restaurants",
	"Health & Wellness > Gym & Fitness",
	"Services > Home Renovation, Repair & Cleaning",
	"Electronics > Audio-Visual (AV) Equipment > Cameras",
	"Property > For Sale: Lands & Plots",
];

const AUCTION_CATEGORY_PATHS = [
	"Vehicles > Cars > Used Cars",
	"Electronics > Mobile Phones",
	"Electronics > Computers & Tech > Laptops & Notebooks",
	"Fashion & Beauty > Luxury > Luxury Watches",
	"Sports > Bicycles",
];

const SEED_USERS = [
	{
		name: "Seed Seller One",
		email: "seed.seller1@dealpost.local",
		password: "SeedSeller#123",
		location: "Chennai, India",
	},
	{
		name: "Seed Seller Two",
		email: "seed.seller2@dealpost.local",
		password: "SeedSeller#123",
		location: "Bengaluru, India",
	},
	{
		name: "Seed Seller Three",
		email: "seed.seller3@dealpost.local",
		password: "SeedSeller#123",
		location: "Hyderabad, India",
	},
	{
		name: "Seed Bidder",
		email: "seed.bidder@dealpost.local",
		password: "SeedBidder#123",
		location: "Pune, India",
	},
];

const CITY_POOL = [
	{ name: "Chennai, India", lat: 13.0827, lng: 80.2707 },
	{ name: "Bengaluru, India", lat: 12.9716, lng: 77.5946 },
	{ name: "Hyderabad, India", lat: 17.385, lng: 78.4867 },
	{ name: "Pune, India", lat: 18.5204, lng: 73.8567 },
	{ name: "Mumbai, India", lat: 19.076, lng: 72.8777 },
	{ name: "Delhi, India", lat: 28.6139, lng: 77.209 },
	{ name: "Kolkata, India", lat: 22.5726, lng: 88.3639 },
	{ name: "Coimbatore, India", lat: 11.0168, lng: 76.9558 },
];

const ADJECTIVES = [
	"Premium",
	"Latest",
	"Reliable",
	"Certified",
	"Top",
	"Budget",
	"Popular",
	"Classic",
	"Smart",
	"Verified",
];

const NOUNS = [
	"Deal",
	"Edition",
	"Collection",
	"Package",
	"Set",
	"Bundle",
	"Model",
	"Listing",
	"Offer",
	"Choice",
];

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(list) {
	return list[randomInt(0, list.length - 1)];
}

function splitCategoryPath(value) {
	const parts = String(value || "")
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean);
	if (!parts.length) {
		return { parentCategory: "General", subCategory: null };
	}
	return {
		parentCategory: parts[0],
		subCategory: parts.length > 1 ? parts.slice(1).join(" > ") : null,
	};
}

function buildProductId(index) {
	return `SEED-DP-${String(index).padStart(4, "0")}`;
}

function buildTitle(categoryPath, index) {
	const leaf = String(categoryPath)
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean)
		.pop();
	return `[SEED] ${randomFrom(ADJECTIVES)} ${leaf || "Product"} ${randomFrom(NOUNS)} ${index}`;
}

function buildImage(index) {
	const seed = encodeURIComponent(`dealpost-seed-${index}`);
	return [
		{
			url: `https://picsum.photos/seed/${seed}/1200/900`,
			public_id: `seed-image-${index}`,
		},
	];
}

function buildLocation(index) {
	const city = CITY_POOL[index % CITY_POOL.length];
	return {
		name: city.name,
		lat: city.lat + randomInt(-35, 35) * 0.001,
		lng: city.lng + randomInt(-35, 35) * 0.001,
		placeId: `seed-place-${index}`,
	};
}

async function ensureCategories() {
	for (const name of DEFAULT_CATEGORIES) {
		await models.Category.findOrCreate({
			where: { slug: slugify(name) },
			defaults: {
				name,
				slug: slugify(name),
			},
		});
	}
}

async function findCategoryByPath(path) {
	return models.Category.findOne({ where: { name: path } });
}

async function ensureSeedUsers() {
	const users = [];
	for (const seedUser of SEED_USERS) {
		let user = await models.User.findOne({
			where: { email: seedUser.email.toLowerCase() },
		});

		if (!user) {
			user = await models.User.create({
				name: seedUser.name,
				email: seedUser.email.toLowerCase(),
				password: seedUser.password,
				location: seedUser.location,
				role: "user",
				isActive: true,
			});
		}

		users.push(user);
	}
	return users;
}

async function cleanupPreviousSeedListings() {
	await models.Listing.destroy({
		where: {
			productId: {
				[Op.like]: "SEED-DP-%",
			},
		},
	});
}

async function createFixedListings(sellers) {
	const created = [];
	for (let index = 0; index < FIXED_CATEGORY_PATHS.length; index += 1) {
		const categoryPath = FIXED_CATEGORY_PATHS[index];
		const category = await findCategoryByPath(categoryPath);
		if (!category) continue;

		const seller = sellers[index % 3];
		const basePrice = randomInt(6000, 380000);
		const originalPrice = basePrice + randomInt(1000, 90000);
		const split = splitCategoryPath(categoryPath);

		const listing = await models.Listing.create({
			productId: buildProductId(index + 1),
			title: buildTitle(categoryPath, index + 1),
			description:
				"[SEED] Demo fixed-price listing generated for development and UI testing.",
			additionalNotes: "[SEED] Pickup available. Test data only.",
			parentCategory: split.parentCategory,
			subCategory: split.subCategory,
			categoryId: category.id,
			price: basePrice,
			originalPrice,
			listingType: "fixed",
			startingBid: null,
			currentBid: null,
			auctionEndsAt: null,
			auctionBids: [],
			images: buildImage(index + 1),
			location: buildLocation(index + 1),
			condition: randomFrom(["New", "Like New", "Good", "Fair"]),
			status: "active",
			isFeatured: index % 6 === 0,
			premiumBoost: index % 7 === 0,
			specs: {
				Brand: randomFrom(["DealPost", "Acme", "Nova", "Metro"]),
				Condition: randomFrom(["Excellent", "Good", "Fair"]),
				Warranty: randomFrom(["No", "6 months", "1 year"]),
			},
			sellerId: seller.id,
		});

		created.push(listing);
	}

	return created;
}

async function createAuctionListings(sellers) {
	const created = [];
	for (let index = 0; index < AUCTION_CATEGORY_PATHS.length; index += 1) {
		const categoryPath = AUCTION_CATEGORY_PATHS[index];
		const category = await findCategoryByPath(categoryPath);
		if (!category) continue;

		const seller = sellers[index % 3];
		const bidderOne = sellers[3];
		const bidderTwo = sellers[(index + 1) % 3];
		const startingBid = randomInt(15000, 95000);
		const bidOne = startingBid + randomInt(1000, 3000);
		const bidTwo = bidOne + randomInt(1000, 4000);
		const split = splitCategoryPath(categoryPath);
		const endsAt = new Date(Date.now() + randomInt(8, 72) * 60 * 60 * 1000);

		const listing = await models.Listing.create({
			productId: buildProductId(FIXED_CATEGORY_PATHS.length + index + 1),
			title: `[SEED] Live Auction ${index + 1} - ${split.subCategory || split.parentCategory}`,
			description:
				"[SEED] Demo auction listing generated for development and bid flow testing.",
			additionalNotes: "[SEED] Auction item. Test data only.",
			parentCategory: split.parentCategory,
			subCategory: split.subCategory,
			categoryId: category.id,
			price: startingBid,
			originalPrice: null,
			listingType: "auction",
			startingBid,
			currentBid: bidTwo,
			auctionEndsAt: endsAt,
			auctionBids: [
				{
					userId: bidderTwo.id,
					amount: bidTwo,
					createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
				},
				{
					userId: bidderOne.id,
					amount: bidOne,
					createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
				},
			],
			images: buildImage(FIXED_CATEGORY_PATHS.length + index + 1),
			location: buildLocation(FIXED_CATEGORY_PATHS.length + index + 1),
			condition: randomFrom(["Like New", "Good", "Fair"]),
			status: "active",
			isFeatured: true,
			premiumBoost: true,
			specs: {
				Auction: "Live",
				Reserve: "No",
				Condition: randomFrom(["Excellent", "Good"]),
			},
			sellerId: seller.id,
		});

		created.push(listing);
	}

	return created;
}

async function run() {
	try {
		await connectDB();
		await ensureCategories();
		const users = await ensureSeedUsers();

		await cleanupPreviousSeedListings();

		const fixedListings = await createFixedListings(users);
		const auctionListings = await createAuctionListings(users);

		console.log(`Seeded fixed listings: ${fixedListings.length}`);
		console.log(`Seeded auction listings: ${auctionListings.length}`);
		console.log(
			`Total seeded listings: ${fixedListings.length + auctionListings.length}`,
		);
	} catch (error) {
		console.error("Failed to seed dummy listings", error);
		process.exitCode = 1;
	} finally {
		await sequelize.close();
	}
}

run();
