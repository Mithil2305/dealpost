import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicSponsoredAds } from "../utils/sponsoredAds";

const SIDEBAR_LAYOUTS = {
	left: [
		{ title: "Ad Slot", heightClass: "h-[260px]" },
		{ title: "Sponsored", heightClass: "h-[200px]" },
	],
	right: [
		{ title: "Ad Slot", heightClass: "h-[300px]" },
		{ title: "Ad Slot", heightClass: "h-[160px]" },
	],
};

function AdCard({ ad, fallbackTitle, heightClass }) {
	const isInternal = String(ad?.targetUrl || "").startsWith("/");
	const imageUrl =
		ad?.imageUrl ||
		"https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80";
	const title = ad?.title || fallbackTitle;
	const description = ad?.description || "Sponsored placement";

	const body = (
		<div className="group relative overflow-hidden rounded-2xl border border-white bg-white">
			<div className={`relative w-full overflow-hidden ${heightClass}`}>
				<img
					src={imageUrl}
					alt={title}
					className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
				/>
				<div className="absolute inset-x-2 bottom-2 rounded-xl bg-black/65 px-2 py-1.5 text-left backdrop-blur-sm">
					<p className="line-clamp-1 text-[11px] font-bold text-white">
						{title}
					</p>
					<p className="line-clamp-1 text-[10px] text-white/80">
						{description}
					</p>
				</div>
			</div>
			<div className="flex items-center justify-between px-2 py-2">
				<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A8A8A]">
					Sponsored
				</span>
				<span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#5C4D00]">
					Visit <ExternalLink size={11} />
				</span>
			</div>
		</div>
	);

	if (!ad?.targetUrl) {
		return body;
	}

	if (isInternal) {
		return <Link to={ad.targetUrl}>{body}</Link>;
	}

	return (
		<a href={ad.targetUrl} target="_blank" rel="noreferrer">
			{body}
		</a>
	);
}

export default function AdSidebar({ side = "left" }) {
	const layouts = SIDEBAR_LAYOUTS[side] || SIDEBAR_LAYOUTS.left;
	const [ads, setAds] = useState([]);
	const [googleAdsSnippet, setGoogleAdsSnippet] = useState("");
	const googleSlotRef = useRef(null);

	useEffect(() => {
		let active = true;

		const fetchAds = async () => {
			try {
				const data = await getPublicSponsoredAds({ side, limit: 4 });
				if (!active) return;
				setAds(Array.isArray(data?.ads) ? data.ads : []);
				setGoogleAdsSnippet(String(data?.googleAdsSnippet || ""));
			} catch {
				if (!active) return;
				setAds([]);
				setGoogleAdsSnippet("");
			}
		};

		fetchAds();

		return () => {
			active = false;
		};
	}, [side]);

	useEffect(() => {
		const slot = googleSlotRef.current;
		if (!slot) return;

		slot.innerHTML = "";
		const markup = String(googleAdsSnippet || "").trim();
		if (!markup) return;

		const template = document.createElement("template");
		template.innerHTML = markup;

		Array.from(template.content.childNodes).forEach((node) => {
			if (node.nodeName.toLowerCase() === "script") {
				const sourceScript = node;
				const nextScript = document.createElement("script");
				Array.from(sourceScript.attributes).forEach((attribute) => {
					nextScript.setAttribute(attribute.name, attribute.value);
				});
				nextScript.text = sourceScript.text || "";
				slot.appendChild(nextScript);
				return;
			}

			slot.appendChild(node.cloneNode(true));
		});
	}, [googleAdsSnippet]);

	return (
		<aside className="hidden xl:block">
			<div className="sticky top-24 space-y-4">
				{googleAdsSnippet ? (
					<div className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4">
						<p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
							Google Ad Slot
						</p>
						<div
							ref={googleSlotRef}
							className="mt-2 min-h-[60px] rounded-xl border border-[#E2E2E2] bg-white px-3 py-2 text-[11px] text-[#666666]"
						/>
					</div>
				) : null}
				{layouts.map((slot, index) => (
					<div
						key={`${side}-${slot.title}-${index}`}
						className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4"
					>
						<p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
							{slot.title}
						</p>
						<div className="mt-2">
							<AdCard
								ad={ads[index]}
								fallbackTitle={slot.title}
								heightClass={slot.heightClass}
							/>
						</div>
					</div>
				))}
			</div>
		</aside>
	);
}
