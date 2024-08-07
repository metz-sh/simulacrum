//Copied from ChatGPT
//https://chat.openai.com/share/3efb2f1d-4f96-4a62-a913-498503700c35
export function indentTypeScriptCode(code: string, indentSize: number = 4): string {
	let indentedCode = '';
	let currentIndent = 0;
	let insideObjectLiteral = false;

	for (let i = 0; i < code.length; i++) {
		const char = code[i];

		if (char === '{') {
			indentedCode += char + '\n';
			currentIndent += indentSize;
			indentedCode += ' '.repeat(currentIndent);
			insideObjectLiteral = true;
		} else if (char === '}') {
			currentIndent -= indentSize;
			indentedCode = indentedCode.trimRight();
			indentedCode += '\n' + ' '.repeat(currentIndent) + char;
			insideObjectLiteral = false;
		} else if (char === ';' && insideObjectLiteral) {
			indentedCode += char + '\n' + ' '.repeat(currentIndent);
		} else {
			indentedCode += char;
		}
	}

	return indentedCode;
}
