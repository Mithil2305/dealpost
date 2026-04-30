#!/usr/bin/env python3

with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "Categories Row" comment
insert_index = None
for i, line in enumerate(lines):
    if '// Categories Row' in line or '{/* Categories Row */' in line:
        insert_index = i
        break

if insert_index is None:
    print("Error: Could not find insertion point in Home.jsx")
    exit(1)

# The location filter UI to insert
location_ui_lines = '''				{/* Location Filter Section */}
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

# Insert the UI before the Categories Row comment
lines.insert(insert_index, location_ui_lines)

with open('e:/Client Code/dealpost/frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✓ Successfully added location filter UI to Home.jsx")
