#!/usr/bin/env python3
import re

with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The location filter UI component
location_filter_ui = '''					{/* Location Filter Section */}
					{userLocation.label && (
						<section className="mb-4 flex flex-col gap-3 rounded-xl bg-[#F5F5F5] p-4">
							<div className="flex items-center gap-2">
								<MapPin size={18} className="text-[#1677ff]" />
								<span className="text-sm font-semibold text-[#333333]">
									{currentLocationLabel}
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{LOCATION_RADIUS_OPTIONS_KM.map((radiusOption) => (
									<button
										key={radiusOption}
										type="button"
										onClick={() => setLocationRadiusKm(radiusOption)}
										className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
											radiusOption === locationRadiusKm
												? "bg-[#1677ff] text-white shadow-md"
												: "bg-white text-[#666666] border border-[#E0E0E0] hover:bg-[#F9F9F9]"
										}`}
										aria-pressed={radiusOption === locationRadiusKm}
									>
										{radiusOption}km
									</button>
								))}
							</div>
						</section>
					)}

'''

# Find the position to insert - right after the main element starts and before the categories
# Look for "Categories" heading
pattern = r'(<main[\s\S]*?<div className="grid gap-6 xl:grid-cols-\[minmax\(0,1fr\)_220px\]">)'
replacement = r'\1' + '\n' + location_filter_ui

content = re.sub(pattern, replacement, content, count=1)

with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Added location filter UI to Home.jsx")
