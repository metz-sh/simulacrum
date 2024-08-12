import { Keywords } from '../compiler-types';
import { extractClassAndMethod } from './extract-class-and-method';

export function isFqnMarked(fqn: string, keywords: Keywords) {
	const { className: destinationClassName, methodName: destinationMethodName } =
		extractClassAndMethod(fqn);

	const destinationClass = keywords.find((kw) => kw.className === destinationClassName);
	if (!destinationClass) {
		return false;
	}

	const destinationMethod = destinationClass.methods.find(
		(m) => m.methodName === destinationMethodName
	);
	if (!destinationMethod) {
		return false;
	}

	return destinationMethod.flags.isMarked;
}
