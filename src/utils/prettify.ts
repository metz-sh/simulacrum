export function prettifyName(folderName: string): string {
	// Replace underscores and hyphens with spaces
	let modifiedName = folderName.replace(/[_-]/g, ' ');

	// Add space before capital letters (but not at the start) and trim
	modifiedName = modifiedName.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

	// Split the string into words
	let words = modifiedName.split(' ');

	// Capitalize the first letter of each word and join them with a space
	return words
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}
