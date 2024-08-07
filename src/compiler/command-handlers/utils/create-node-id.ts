export function createNodeIdForClass(className: string, prefix?: string) {
	return `${prefix || ''}${className}`;
}

export function createNodeIdForMethod(className: string, methodName: string, prefix?: string) {
	return `${prefix || ''}${className}${methodName}`;
}

export function createNodeIdForFolder(folderPath: string, prefix?: string) {
	return `${prefix || ''}${folderPath.split('/').join('.')}`;
}
