export function extractClassAndMethod(arg: string) {
	const [className, methodName] = arg.split('.');
	return {
		className,
		methodName,
	};
}
