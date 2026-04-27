import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
	fileFilter: (req, file, cb) => {
		const allowed = new Set([
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif",
			"image/gif",
		]);
		if (allowed.has(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new Error("Only JPEG, PNG, WebP, AVIF, and GIF uploads are allowed"));
	},
});
