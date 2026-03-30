const fs = require('fs');
const path = require('path');

// Fix 1: Add onError to Home.jsx deal card images
const homePath = path.join(__dirname, 'frontend/src/pages/Home.jsx');
let home = fs.readFileSync(homePath, 'utf8');

// Find the pattern: src={item.image} followed by alt and className, ending with />
// Add onError handler before the closing />
const imgPattern = /(src=\{item\.image\}\s*\n\s*alt=\{item\.title\}\s*\n\s*className="h-full w-full object-cover"\s*\n)(\s*\/\>)/;
if (imgPattern.test(home)) {
	home = home.replace(imgPattern, (match, before, closing) => {
		const indent = closing.match(/^(\s*)/)[1];
		return before + indent + 'onError={(event) => {\n' + indent + '\tevent.currentTarget.src =\n' + indent + '\t\t"https://placehold.co/600x450?text=Deal+Post";\n' + indent + '}}\n' + closing;
	});
	fs.writeFileSync(homePath, home);
	console.log('Home.jsx: Added onError to deal card image');
} else {
	console.log('Home.jsx: Pattern not found, trying alternative...');
	// Try with \r\n
	const imgPattern2 = /(src=\{item\.image\}\r?\n\s*alt=\{item\.title\}\r?\n\s*className="h-full w-full object-cover"\r?\n)(\s*\/\>)/;
	if (imgPattern2.test(home)) {
		home = home.replace(imgPattern2, (match, before, closing) => {
			const lineEnd = home.includes('\r\n') ? '\r\n' : '\n';
			const indent = closing.match(/^(\s*)/)[1];
			return before + indent + 'onError={(event) => {' + lineEnd + indent + '\tevent.currentTarget.src =' + lineEnd + indent + '\t\t"https://placehold.co/600x450?text=Deal+Post";' + lineEnd + indent + '}}' + lineEnd + closing;
		});
		fs.writeFileSync(homePath, home);
		console.log('Home.jsx: Added onError to deal card image (alt pattern)');
	} else {
		console.log('Home.jsx: Could not find image pattern');
	}
}

// Fix 2: Add onError to MyAds.jsx listing images
const myAdsPath = path.join(__dirname, 'frontend/src/pages/MyAds.jsx');
let myAds = fs.readFileSync(myAdsPath, 'utf8');
const lineEnd = myAds.includes('\r\n') ? '\r\n' : '\n';

// Add onError to the MyAds img tag
const myAdsImg = /className="h-full w-full object-cover"(\r?\n\s*\/\>)(\r?\n\s*<span className="absolute left-3 top-3)/;
if (myAdsImg.test(myAds)) {
	myAds = myAds.replace(myAdsImg, (match, closing, nextEl) => {
		const indent = closing.match(/^\r?\n(\s*)/)[1];
		return 'className="h-full w-full object-cover"' + lineEnd + indent + 'onError={(event) => {' + lineEnd + indent + '\tevent.currentTarget.src =' + lineEnd + indent + '\t\t"https://placehold.co/600x450?text=Deal+Post";' + lineEnd + indent + '}}' + closing + nextEl;
	});
	fs.writeFileSync(myAdsPath, myAds);
	console.log('MyAds.jsx: Added onError to listing image');
} else {
	console.log('MyAds.jsx: Could not find image pattern');
}

console.log('Done!');
