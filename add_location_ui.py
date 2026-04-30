#!/usr/bin/env python3
import re

# Read the Home.jsx file
with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find where to insert the location filter UI
# We'll insert it right before the category chips section
# Look for the section that has "sidebarCategories.map"

location_filter_ui = '''
					{/* Location Filter */}
					{userLocation.label && (
						<section className="mb-4 flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<MapPin size={18} className="text-[#1677ff]" />
								<span className="text-sm font-bold text-[#333333]">
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
												: "bg-[#F0F0F0] text-[#666666] hover:bg-[#E8E8E8]"
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

# Find and replace the section where category chips start
# We'll insert it right before the "sidebarCategories"
pattern = r"(\s+)<section className=\"flex flex-wrap items-center gap-2\.5 overflow-x-auto pb-2 scrollbar-hide\">\s+<div className=\"flex items-center gap-2\.5\">"
replacement = location_filter_ui + r"\1<section className=\"flex flex-wrap items-center gap-2.5 overflow-x-auto pb-2 scrollbar-hide\">\n\t\t\t<div className=\"flex items-center gap-2.5\">"

content = re.sub(pattern, replacement, content, count=1, flags=re.MULTILINE)

# Save the modified file
with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Added location filter UI to Home.jsx")
