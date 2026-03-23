import { Readable } from "stream";
import cloudinary, { cloudinaryEnabled } from "../config/cloudinary.js";

export async function uploadToCloudinary(buffer, folder = "dealpost/listings") {
	if (!cloudinaryEnabled) {
		return {
			url: "https://placehold.co/1200x800?text=DealPost",
			public_id: `local-${Date.now()}`,
		};
	}

	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder,
				resource_type: "image",
			},
			(error, result) => {
				if (error) {
					reject(error);
					return;
				}
				resolve({
					url: result.secure_url,
					public_id: result.public_id,
				});
			},
		);

		Readable.from(buffer).pipe(stream);
	});
}
