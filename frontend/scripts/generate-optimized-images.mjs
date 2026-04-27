import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve("public/images/optimized");

const HERO_WIDTHS = [300, 600, 1200];
const CARD_WIDTHS = [300, 600];

const IMAGE_SOURCES = {
	heroLiving:
		"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=2000",
	heroRide:
		"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=2000",
	listingFallback:
		"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
	adFallback:
		"https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80",
};

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function fetchImageBuffer(url) {
	const response = await fetch(url, {
		headers: {
			"User-Agent": "DealPost-Image-Optimizer/1.0",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch image ${url} (${response.status})`);
	}

	return Buffer.from(await response.arrayBuffer());
}

async function writeVariant(
	baseName,
	sourceBuffer,
	width,
	height,
	qualityWebp = 64,
) {
	const webpPath = path.join(outDir, `${baseName}-${width}.webp`);

	await sharp(sourceBuffer)
		.resize(width, height, { fit: "cover", position: "attention" })
		.webp({ quality: qualityWebp })
		.toFile(webpPath);
}

async function generateSet(baseName, sourceUrl, widths, ratio, qualityWebp) {
	const sourceBuffer = await fetchImageBuffer(sourceUrl);

	for (const width of widths) {
		const height = Math.round(width / ratio);
		await writeVariant(baseName, sourceBuffer, width, height, qualityWebp);
	}
}

async function generateAvatarFallback() {
	const svg = Buffer.from(
		`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5b6375"/>
      <stop offset="100%" stop-color="#232732"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="56%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff">U</text>
</svg>`.trim(),
	);

	await sharp(svg)
		.resize(80, 80)
		.webp({ quality: 62 })
		.toFile(path.join(outDir, "avatar-fallback-80.webp"));
	await sharp(svg)
		.resize(120, 120)
		.webp({ quality: 62 })
		.toFile(path.join(outDir, "avatar-fallback-120.webp"));
}

async function main() {
	await ensureDir(outDir);

	await generateSet(
		"hero-living",
		IMAGE_SOURCES.heroLiving,
		HERO_WIDTHS,
		16 / 9,
		64,
	);

	await generateSet(
		"hero-ride",
		IMAGE_SOURCES.heroRide,
		HERO_WIDTHS,
		16 / 9,
		64,
	);

	await generateSet(
		"listing-fallback",
		IMAGE_SOURCES.listingFallback,
		CARD_WIDTHS,
		4 / 3,
		60,
	);

	await generateSet(
		"ad-fallback",
		IMAGE_SOURCES.adFallback,
		CARD_WIDTHS,
		4 / 3,
		60,
	);

	await generateAvatarFallback();

	console.log("Optimized images generated in public/images/optimized");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
