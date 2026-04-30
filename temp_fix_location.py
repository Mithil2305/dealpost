#!/usr/bin/env python3
import re
import os

# Change to the project directory
os.chdir('e:/Client Code/dealpost')

# Fix Home.jsx
print("Fixing Home.jsx...")
with open('frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    home_content = f.read()

# Fix 1: Add setter to locationRadiusKm state
home_content = re.sub(
    r'const \[locationRadiusKm\] = useState\(getStoredLocationRadius\);',
    'const [locationRadiusKm, setLocationRadiusKm] = useState(getStoredLocationRadius);',
    home_content,
    count=1
)

# Fix 2: Update effect dependency from locationRadiusKm to use setLocationRadiusKm
home_content = re.sub(
    r"useEffect\(\(\) => \{\s*localStorage\.setItem\(LOCATION_RADIUS_STORAGE_KEY, String\(locationRadiusKm\)\);\s*\}, \[locationRadiusKm\]\);",
    "useEffect(() => {\n\t\tlocalStorage.setItem(LOCATION_RADIUS_STORAGE_KEY, String(locationRadiusKm));\n\t}, [locationRadiusKm]);",
    home_content
)

with open('frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.write(home_content)

print("✓ Fixed Home.jsx locationRadiusKm state")

# Fix listing controller - ensure location field is included
print("Fixing listing.controller.js...")
with open('backend/src/controllers/listing.controller.js', 'r', encoding='utf-8') as f:
    controller_content = f.read()

# Ensure location is in summaryAttributes
if '"location"' not in controller_content[controller_content.find('const listingSummaryAttributes'):controller_content.find('const listingSummaryAttributes') + 2000]:
    # Add location to the attributes list
    controller_content = re.sub(
        r'const listingSummaryAttributes = \[(.*?)"createdAt",',
        r'const listingSummaryAttributes = [\1"location",\n\t"createdAt",',
        controller_content,
        count=1,
        flags=re.DOTALL
    )
    print("✓ Added location to listingSummaryAttributes")
else:
    print("✓ location already in listingSummaryAttributes")

with open('backend/src/controllers/listing.controller.js', 'w', encoding='utf-8') as f:
    f.write(controller_content)

print("\nAll fixes applied successfully!")
