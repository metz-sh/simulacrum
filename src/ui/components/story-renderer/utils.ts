export function parseTextToSlug(text: string) {
	return text.replaceAll(' ', '_').toLowerCase();
}

export function parseSlugToText(slug: string) {
	//Copied from ChatGPT
	const words = slug.split('_');
	const titleWords = words.map(
		(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
	);
	return titleWords.join(' ');
}
