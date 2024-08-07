/**
 * Copied from ChatGPT: https://chat.openai.com/share/664550e6-d1ec-4c2a-98d8-a578ce0810fa
 * @param input string
 * @returns string
 */
export function removeWhitespace(input: string): string {
	return input.replace(/[\n\s\t]+/g, '');
}
